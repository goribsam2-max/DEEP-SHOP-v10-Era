import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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

const mockUsers = [
  { id: 'rahim123', name: 'Rahim' },
  { id: 'farhana456', name: 'Farhana' },
  { id: 'kamrul789', name: 'Kamrul' },
  { id: 'sumaiya001', name: 'Sumaiya' },
  { id: 'tanvir002', name: 'Tanvir' },
  { id: 'nadia003', name: 'Nadia' },
  { id: 'arif004', name: 'Arif' },
  { id: 'mim005', name: 'Mim' },
  { id: 'sajid006', name: 'Sajid' },
  { id: 'tisha007', name: 'Tisha' },
  { id: 'fahim008', name: 'Fahim' },
  { id: 'riya009', name: 'Riya' },
  { id: 'hasan010', name: 'Hasan' }
];

async function run() {
  for (const u of mockUsers) {
    const userDoc = {
      uid: u.id,
      displayName: u.name,
      email: u.name.toLowerCase() + '@example.com',
      photoURL: '',
      role: 'user',
      followers: [],
      following: [],
      followersCount: Math.floor(Math.random() * 50) + 10,
      createdAt: Date.now()
    };
    await setDoc(doc(db, 'users', u.id), userDoc);
    console.log("Seeded user:", u.id);
  }
  process.exit(0);
}
run();
