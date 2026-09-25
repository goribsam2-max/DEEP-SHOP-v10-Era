import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const match = envFile.match(/FIREBASE_SERVICE_ACCOUNT=(.*)/);
let serviceAccountStr = match ? match[1] : '{}';
if (serviceAccountStr.startsWith("'") || serviceAccountStr.startsWith('"')) {
    serviceAccountStr = serviceAccountStr.slice(1, -1);
}
const serviceAccount = JSON.parse(serviceAccountStr);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function run() {
  const auth = getAuth();
  try {
    const user = await auth.getUserByEmail('deepshop@gmail.com');
    console.log("DeepShop UID:", user.uid);
  } catch(e: any) {
    console.log("Not found in Auth, searching in users collection...");
    const snap = await db.collection('users').where('email', '==', 'deepshop@gmail.com').get();
    if (!snap.empty) {
      console.log("DeepShop UID:", snap.docs[0].id);
    } else {
      console.log("DeepShop not found");
    }
  }
}
run();
