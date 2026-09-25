import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBYDcBuYZEH38mwWoCqTmyImGIYqlXteZ4",
  authDomain: "deep-shop-bd.firebaseapp.com",
  projectId: "deep-shop-bd",
  storageBucket: "deep-shop-bd.firebasestorage.app",
  messagingSenderId: "771344063997",
  appId: "1:771344063997:web:f06c63b007a7369bf94d94"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const allSnap = await getDocs(collection(db, 'reviews'));
  console.log("Total reviews:", allSnap.size);
  const seen = new Set();
  let deleted = 0;
  for (const docSnap of allSnap.docs) {
    const data = docSnap.data();
    const key = data.reviewerName + data.comment;
    if (seen.has(key)) {
       await deleteDoc(doc(db, 'reviews', docSnap.id));
       deleted++;
    } else {
       seen.add(key);
    }
  }
  console.log("Deleted duplicates:", deleted);
  process.exit(0);
}
run();
