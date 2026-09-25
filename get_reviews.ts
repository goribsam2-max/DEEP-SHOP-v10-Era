import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function run() {
  const snap = await db.collection('reviews').where('reviewerName', '==', 'Rahim').get();
  console.log("Rahim reviews count:", snap.size);
  const allSnap = await db.collection('reviews').get();
  console.log("Total reviews:", allSnap.size);
  // delete duplicates
  const seen = new Set();
  let deleted = 0;
  for (const doc of allSnap.docs) {
    const data = doc.data();
    const key = data.reviewerName + data.comment;
    if (seen.has(key)) {
       await doc.ref.delete();
       deleted++;
    } else {
       seen.add(key);
    }
  }
  console.log("Deleted duplicates:", deleted);
}
run();
