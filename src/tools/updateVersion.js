import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Config de tu proyecto Firebase
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// genera una versión tipo 2025.10.21-12:34 o usa git commit corto
const version =
  process.env.NEXT_PUBLIC_APP_VERSION ||
  new Date().toISOString().slice(0, 16).replace('T', '-');

async function main() {
  try {
    await setDoc(doc(db, 'meta', 'app'), { version });
    console.log('🔥 Versión actualizada a:', version);
  } catch (err) {
    console.error('❌ Error al actualizar versión:', err);
    process.exit(1);
  }
}

main();
