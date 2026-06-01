import admin from 'firebase-admin';

// Acepta credenciales como JSON completo o como variables de entorno separadas.
// Esto permite que local/dev y despliegues en nube usen el mismo flujo.
function parseServiceAccount() {
  const inlineKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (inlineKey) {
    const trimmed = inlineKey.trim();
    const raw = trimmed.startsWith('base64:')
      ? Buffer.from(trimmed.slice('base64:'.length), 'base64').toString('utf8')
      : trimmed;

    const parsed = JSON.parse(raw);
    if (parsed.private_key) {
      parsed.private_key = String(parsed.private_key).replace(/\\n/g, '\n');
    }

    return parsed;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    return {
      projectId,
      clientEmail,
      privateKey,
    };
  }

  throw new Error(
    'Missing Firebase admin credentials. Set FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.'
  );
}

// Inicializa solo una vez para soportar hot reload/watch en desarrollo sin errores.
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(parseServiceAccount()),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

// Exportaciones compartidas usadas por los handlers de rutas en index.js.
export const adminAuth = admin.auth();
export const db = admin.firestore();
export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;
export const DocumentId = admin.firestore.FieldPath.documentId();
