// src/tools/updateVersion.mjs
import 'dotenv/config';                 // carga .env antes de todo
import admin from 'firebase-admin';

if (!admin.apps.length) {
  // Usá ADC (Application Default Credentials) o service account
  // Opción 1: ADC vía GOOGLE_APPLICATION_CREDENTIALS a un JSON
  // Opción 2: setear las credenciales desde variables de entorno

  // Si usás ADC:
//   admin.initializeApp({
//     credential: admin.credential.applicationDefault(),
//     projectId: process.env.FIREBASE_PROJECT_ID,
//   });

  // // Alternativa: credenciales inline desde env (si no usás archivo):
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const firestore = admin.firestore();

const version =
  process.env.NEXT_PUBLIC_APP_VERSION ||
  new Date().toISOString().slice(0, 16).replace('T', '-');

async function main() {
  try {
    await firestore.doc('meta/app').set({ version }, { merge: true });
    console.log('🔥 Versión actualizada a:', version);
  } catch (err) {
    console.error('❌ Error al actualizar versión:', err);
    process.exit(1);
  }
}

main();
