// services/provisioning.js
// Creación/consulta de usuarios de Firebase Authentication desde el backend.
// Se usa cuando llega una compra externa (landing → Hotmart) de un email que
// aún no tiene cuenta: el cliente NUNCA se registra antes de comprar.
//
// - La credencial (contraseña) vive EXCLUSIVAMENTE en Firebase Auth: aquí no
//   se genera ni se guarda ninguna. El usuario la crea vía enlace seguro.
// - Enlace seguro: admin.generatePasswordResetLink con continueUrl hacia
//   /appingles/activar. Firebase muestra su página oficial de "restablecer
//   contraseña" y, al completar, redirige a /activar (landing de éxito).
//   La contraseña se crea EXCLUSIVAMENTE en Firebase Auth.
// - Modo dev sin credenciales de Firebase Admin (STORE_MODE=file): uid
//   determinista hm_<sha1(email)> para poder probar el flujo completo localmente.

const crypto = require('crypto');
const store = require('../lib/store');

// URL donde aterriza el usuario al hacer clic en el enlace de activación.
// En producción: https://www.ingresosdigitalesit.com/appingles/activar
// En local/E2E: http://localhost:5173/appingles/activar (localhost está siempre
// autorizado en Firebase Auth; el dominio real debe añadirse en la consola).
function activationUrl() {
  return process.env.ACTIVATION_URL || 'https://www.ingresosdigitalesit.com/appingles/activar';
}

let adminAuth = null;
let firebaseAvailable = false;

async function getAdminAuth() {
  if (adminAuth !== null) return firebaseAvailable ? adminAuth : null;
  adminAuth = null;
  try {
    store.initFirebase();
    const { getAuth } = require('firebase-admin/auth');
    adminAuth = getAuth();
    firebaseAvailable = true;
  } catch {
    // Sin credenciales Admin (dev file-store): fallback determinista.
    firebaseAvailable = false;
  }
  return firebaseAvailable ? adminAuth : null;
}

// Busca el usuario por email en Firebase Auth; lo crea si no existe.
// Devuelve { userId, created, hasPassword }.
async function findOrCreateAuthUser({ email, name }) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) throw new Error('email_requerido');

  const auth = await getAdminAuth();
  if (!auth) {
    // Dev: uid estable derivado del email (idempotente entre webhooks duplicados).
    const userId = `hm_${crypto.createHash('sha1').update(normalized).digest('hex').slice(0, 24)}`;
    const existing = await store.getDoc('users', userId);
    if (!existing) {
      await store.setDoc('users', userId, {
        name: name || normalized.split('@')[0],
        email: normalized,
        source: 'hotmart',
        createdAt: new Date().toISOString(),
      });
      console.log(`[provisioning] user_created (dev) userId=${userId}`);
    }
    return { userId, created: !existing, hasPassword: false };
  }

  try {
    const user = await auth.getUserByEmail(normalized);
    console.log(`[provisioning] user_found uid=${user.uid} hasPassword=${!!user.passwordHash}`);
    return { userId: user.uid, created: false, hasPassword: !!user.passwordHash };
  } catch (err) {
    if (err?.code !== 'auth/user-not-found') throw err;
  }

  const displayName = name || normalized.split('@')[0];
  try {
    const user = await auth.createUser({
      email: normalized,
      displayName,
      emailVerified: false,
    });
    console.log(`[provisioning] user_created uid=${user.uid}`);
    return { userId: user.uid, created: true, hasPassword: false };
  } catch (err) {
    // Carrera benigna (webhook duplicado concurrente): otro proceso lo creó.
    if (err?.code === 'auth/email-already-exists' || err?.code === 'auth/uid-already-exists') {
      const user = await auth.getUserByEmail(normalized);
      console.log(`[provisioning] user_found (race) uid=${user.uid}`);
      return { userId: user.uid, created: false, hasPassword: !!user.passwordHash };
    }
    throw err;
  }
}

// Genera el enlace de activación. Usa el enlace oficial de Firebase solo para
// obtener el oobCode y arma un enlace propio que apunta DIRECTAMENTE a nuestra
// página /activar (sin pasar por la página alojada de Firebase). El frontend
// valida el código con verifyPasswordResetCode y crea la contraseña con
// confirmPasswordReset (SDK cliente).
async function generateActivationLink(email) {
  const url = activationUrl();
  // Red de seguridad: en producción, un ACTIVATION_URL mal configurado (o un
  // script/prueba manual que herede una variable de entorno local por error)
  // nunca debe terminar mandándole a un cliente real un enlace a localhost —
  // mejor que falle aquí (se registra como activation_email_failed y el
  // cliente puede pedir el reenvío) a que reciba un enlace que no lleva a
  // ningún lado.
  if (process.env.NODE_ENV === 'production' && /localhost|127\.0\.0\.1/i.test(url)) {
    throw new Error(`activation_url_invalido_en_produccion: ${url}`);
  }
  const auth = await getAdminAuth();
  if (!auth) {
    // Dev sin Firebase: enlace simulado apuntando a la misma página.
    const code = crypto.randomBytes(16).toString('hex');
    return `${url}?oobCode=dev_${code}`;
  }
  const fbLink = await auth.generatePasswordResetLink(String(email).trim().toLowerCase(), { url });
  try {
    const oobCode = new URL(fbLink).searchParams.get('oobCode');
    if (oobCode) return `${url}?oobCode=${oobCode}`;
  } catch {
    /* si no se puede parsear, devolvemos el enlace oficial como fallback */
  }
  return fbLink;
}

module.exports = { findOrCreateAuthUser, generateActivationLink, activationUrl };
