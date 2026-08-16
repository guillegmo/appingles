const FIREBASE_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Contraseña incorrecta. Revisa tus datos e inténtalo de nuevo.',
  'auth/wrong-password': 'Contraseña incorrecta. Revisa tus datos e inténtalo de nuevo.',
  'auth/user-not-found': 'No encontramos una cuenta con ese correo.',
  'auth/invalid-email': 'Ese correo no parece válido.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo. Inicia sesión.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/too-many-requests': 'Demasiados intentos. Espera un momento y vuelve a intentarlo.',
  'auth/network-request-failed': 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
  'auth/popup-closed-by-user': 'Cerraste la ventana de Google. Inténtalo de nuevo.',
  'auth/cancelled-popup-request': 'Cerraste la ventana de Google. Inténtalo de nuevo.',
  'auth/operation-not-allowed': 'Ese método de inicio de sesión no está disponible por ahora.',
};

/** Convierte cualquier error de auth/red en un mensaje claro para el usuario final. */
export function friendlyErrorMessage(err: unknown): string {
  const e = err as { code?: string; message?: string; status?: number };
  if (e?.code && FIREBASE_MESSAGES[e.code]) return FIREBASE_MESSAGES[e.code];

  const msg = e?.message ?? '';
  const isServerError =
    e?.status === 502 ||
    e?.status === 503 ||
    e?.status === 504 ||
    /Request failed|Network Error|ERR_NETWORK|ECONNABORTED|502|503/.test(msg);

  if (isServerError) {
    return 'Tuvimos un problema para conectarnos. Espera un momento e inténtalo de nuevo.';
  }
  return 'Algo salió mal. Inténtalo de nuevo.';
}