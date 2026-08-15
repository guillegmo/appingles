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

function initFirebase() {
  if (firestore) return firestore;
  let fb;
  let firestoreModule;
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

module.exports = { MODE, initFirebase, getDoc, setDoc, updateDoc, deleteDoc, listDocs };
