// lib/store.js
// Capa de datos (Data Layer).
// STORE_MODE=file  -> store local en api/.data (modo dev, sin dependencias)
// STORE_MODE=firebase -> Firestore real (requiere credenciales)
//
// La API solo habla con este módulo. Cambiar de store no toca rutas ni servicios.

const fs = require('fs');
const path = require('path');

const MODE = process.env.STORE_MODE || 'file';
const DATA_DIR = path.join(__dirname, '..', '.data');

let firestore = null;
let firebaseAdmin = null;
let firestoreModule = null;

function initFirebase() {
  if (firestore) return firestore;
  let fb;
  try {
    fb = require('firebase-admin');
    firestoreModule = require('firebase-admin/firestore');
  } catch (e) {
    throw new Error('STORE_MODE=firebase requiere el paquete firebase-admin. Ejecuta: npm i firebase-admin');
  }
  firebaseAdmin = fb;
  if (fb.getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credPath) {
      // Credenciales síncronas desde el archivo JSON (evita "client not ready").
      const saJson = JSON.parse(fs.readFileSync(credPath, 'utf8'));
      fb.initializeApp({ credential: fb.cert(saJson) });
    } else if (sa) {
      fb.initializeApp({
        credential: fb.cert(JSON.parse(Buffer.from(sa, 'base64').toString())),
        projectId,
      });
    } else {
      throw new Error('STORE_MODE=firebase requiere FIREBASE_SERVICE_ACCOUNT o GOOGLE_APPLICATION_CREDENTIALS');
    }
  }
  firestore = firestoreModule.getFirestore();
  return firestore;
}

// ---------- store local (archivos JSON) ----------

function filePath(collection, id) {
  return path.join(DATA_DIR, collection, `${id}.json`);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ---------- API pública ----------

async function getDoc(collection, id) {
  if (MODE === 'firebase') {
    const snap = await initFirebase().collection(collection).doc(id).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  }
  return readJson(filePath(collection, id));
}

async function setDoc(collection, id, data) {
  if (MODE === 'firebase') {
    await initFirebase().collection(collection).doc(id).set(data, { merge: true });
    return { id, ...data };
  }
  writeJson(filePath(collection, id), data);
  return { id, ...data };
}

async function updateDoc(collection, id, patch) {
  if (MODE === 'firebase') {
    await initFirebase().collection(collection).doc(id).update(patch);
    return { id, ...patch };
  }
  const current = readJson(filePath(collection, id)) || {};
  const next = { ...current, ...patch };
  writeJson(filePath(collection, id), next);
  return { id, ...next };
}

async function deleteDoc(collection, id) {
  if (MODE === 'firebase') {
    await initFirebase().collection(collection).doc(id).delete();
    return true;
  }
  try { fs.unlinkSync(filePath(collection, id)); } catch { /* noop */ }
  return true;
}

async function listDocs(collection) {
  if (MODE === 'firebase') {
    const snap = await initFirebase().collection(collection).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  const dir = path.join(DATA_DIR, collection);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const data = readJson(path.join(dir, f));
      return { id: f.slice(0, -5), ...data };
    })
    .filter(Boolean);
}

async function queryDocs(collection, options = {}) {
  const { filters = [], orderBy = null, limit = null } = options;
  if (MODE === 'firebase') {
    const firestore = initFirebase();
    const { FieldPath } = firestoreModule;
    let q = firestore.collection(collection);
    for (const f of filters) {
      if (f.field === '__name__') {
        q = q.where(FieldPath.documentId(), f.op, f.value);
      } else {
        q = q.where(f.field, f.op, f.value);
      }
    }
    if (orderBy) {
      if (orderBy.field === '__name__') {
        q = q.orderBy(FieldPath.documentId(), orderBy.direction || 'asc');
      } else {
        q = q.orderBy(orderBy.field, orderBy.direction || 'asc');
      }
    }
    if (limit) {
      q = q.limit(limit);
    }
    let snap;
    try {
      snap = await q.get();
    } catch (e) {
      // Filtrar + ordenar en una sola query exige un índice compuesto que puede
      // no existir (FAILED_PRECONDITION). Se reintenta sin orderBy y se ordena
      // en memoria para no romper el endpoint.
      if (orderBy && /FAILED_PRECONDITION/.test(e.message)) {
        q = firestore.collection(collection);
        for (const f of filters) {
          if (f.field === '__name__') {
            q = q.where(FieldPath.documentId(), f.op, f.value);
          } else {
            q = q.where(f.field, f.op, f.value);
          }
        }
        snap = await q.get();
        const dir = orderBy.direction || 'asc';
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        docs.sort((a, b) => {
          const av = orderBy.field === '__name__' ? a.id : a[orderBy.field];
          const bv = orderBy.field === '__name__' ? b.id : b[orderBy.field];
          if (av < bv) return dir === 'asc' ? -1 : 1;
          if (av > bv) return dir === 'asc' ? 1 : -1;
          return 0;
        });
        return limit ? docs.slice(0, limit) : docs;
      }
      throw e;
    }
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  // file mode fallback: load all docs and filter in memory
  let docs = await listDocs(collection);
  // apply filters
  if (filters.length > 0) {
    docs = docs.filter(doc => {
      return filters.every(f => {
        // For file mode, doc.id is the document name
        const value = f.field === '__name__' ? doc.id : doc[f.field];
        if (f.op === '==') return value == f.value;
        if (f.op === '!=') return value != f.value;
        if (f.op === '<') return value < f.value;
        if (f.op === '<=') return value <= f.value;
        if (f.op === '>') return value > f.value;
        if (f.op === '>=') return value >= f.value;
        // default to equality
        return value == f.value;
      });
    });
  }
  // apply orderBy
  if (orderBy) {
    const direction = orderBy.direction || 'asc';
    docs.sort((a, b) => {
      const av = orderBy.field === '__name__' ? a.id : a[orderBy.field];
      const bv = orderBy.field === '__name__' ? b.id : b[orderBy.field];
      if (av < bv) return direction === 'asc' ? -1 : 1;
      if (av > bv) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }
  // apply limit
  if (limit !== null && limit !== undefined) {
    docs = docs.slice(0, limit);
  }
  return docs;
}

// Escrituras en lote: en Firestore se agrupan en un único commit (menos round
// trips); en modo file se ejecutan en secuencia. ops: [{ collection, id, data, type }]
// type: 'set' (merge, igual que setDoc) | 'update' (igual que updateDoc).
async function batchWrite(ops = []) {
  if (ops.length === 0) return [];
  if (MODE === 'firebase') {
    const db = initFirebase();
    const batch = db.batch();
    for (const op of ops) {
      const ref = db.collection(op.collection).doc(op.id);
      if (op.type === 'update') {
        batch.update(ref, op.data);
      } else {
        batch.set(ref, op.data, { merge: true });
      }
    }
    await batch.commit();
    return ops.map((o) => ({ id: o.id, ...o.data }));
  }
  for (const op of ops) {
    if (op.type === 'update') {
      await updateDoc(op.collection, op.id, op.data);
    } else {
      await setDoc(op.collection, op.id, op.data);
    }
  }
  return ops.map((o) => ({ id: o.id, ...o.data }));
}

// Lectura por lotes de documentos por id (evita N+1).
// Firestore: where(FieldPath.documentId(), 'in', chunk) con chunks de 10.
// Modo file: lecturas en paralelo.
async function getDocs(collection, ids) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  if (MODE === 'firebase') {
    const db = initFirebase();
    const { FieldPath } = firestoreModule;
    const chunks = [];
    for (let i = 0; i < ids.length; i += 10) {
      chunks.push(ids.slice(i, i + 10));
    }
    // Chunks en paralelo: 100 ids = 1 round trip con 10 queries concurrentes.
    const snaps = await Promise.all(
      chunks.map((chunk) => db.collection(collection).where(FieldPath.documentId(), 'in', chunk).get()),
    );
    return snaps.flatMap((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }
  const results = await Promise.all(
    ids.map(async (id) => {
      const d = await getDoc(collection, id);
      return d ? { id: d.id ?? id, ...d } : null;
    }),
  );
  return results.filter(Boolean);
}

// Lectura-escritura atómica. fn recibe un store transaccional con
// { get, set, update } y devuelve el resultado. En Firestore usa
// db.runTransaction (reintenta ante contención); en modo file serializa
// con un mutex en proceso para que dos peticiones concurrentes no
// intercalen sus lecturas/escrituras (read->modify->write).
let fileMutex = Promise.resolve();
function withFileMutex(fn) {
  const run = fileMutex.then(fn, fn);
  fileMutex = run.catch(() => {});
  return run;
}

async function runTransaction(fn) {
  if (MODE === 'firebase') {
    const db = initFirebase();
    return db.runTransaction(async (t) => {
      const txStore = {
        async get(collection, id) {
          const snap = await t.get(db.collection(collection).doc(id));
          return snap.exists ? { id: snap.id, ...snap.data() } : null;
        },
        set(collection, id, data) {
          t.set(db.collection(collection).doc(id), data, { merge: true });
        },
        update(collection, id, patch) {
          t.update(db.collection(collection).doc(id), patch);
        },
      };
      return fn(txStore);
    });
  }
  return withFileMutex(() => fn({
    get: getDoc,
    set: setDoc,
    update: updateDoc,
  }));
}

// Incrementos atómicos sin lectura previa (contadores, tokens, coste).
// fields: { ruta: valor } — los valores numéricos se INCREMENTAN (soporta
// rutas anidadas tipo 'tutor.tokens'); cualquier otro valor se escribe tal
// cual. En Firestore todo va en un único set merge con FieldValue.increment
// (1 escritura, 0 lecturas); en modo file se aplica bajo el mismo mutex.
// El documento se crea si no existe.
function applyField(root, path, transform) {
  const parts = path.split('.');
  let cur = root;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  const last = parts[parts.length - 1];
  cur[last] = transform(cur[last]);
}

async function incrementDoc(collection, id, fields) {
  if (MODE === 'firebase') {
    const db = initFirebase();
    const { FieldValue } = firestoreModule;
    const patch = {};
    for (const [path, value] of Object.entries(fields)) {
      patch[path] = typeof value === 'number' ? FieldValue.increment(value) : value;
    }
    await db.collection(collection).doc(id).set(patch, { merge: true });
    return true;
  }
  return withFileMutex(async () => {
    const current = (await getDoc(collection, id)) || {};
    const next = { ...current };
    for (const [path, value] of Object.entries(fields)) {
      if (typeof value === 'number') {
        applyField(next, path, (prev) => (typeof prev === 'number' ? prev : 0) + value);
      } else {
        applyField(next, path, () => value);
      }
    }
    await setDoc(collection, id, next);
    return true;
  });
}

module.exports = { MODE, initFirebase, getDoc, setDoc, updateDoc, deleteDoc, listDocs, queryDocs, batchWrite, getDocs, runTransaction, incrementDoc };
