
import { initializeApp } from "firebase/app";
import { getFirestore, collection, writeBatch, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBYDcBuYZEH38mwWoCqTmyImGIYqlXteZ4",
  authDomain: "deep-shop-bd.firebaseapp.com",
  projectId: "deep-shop-bd",
  storageBucket: "deep-shop-bd.firebasestorage.app",
  messagingSenderId: "771344063997",
  appId: "1:771344063997:web:f06c63b007a7369bf94d94",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const firstNames = ["Abdur", "Sabbir", "Nusrat", "Tanvir", "Rina", "Mahmudul", "Anika", "Sajid", "Farhana", "Kamrul", "Sumaiya", "Ariful", "Nigar", "Mofizul", "Jesmin", "Hasan", "Fatema", "Robiul", "Tania", "Asif"];
const lastNames = ["Rahman", "Hossain", "Jahan", "Ahmed", "Akter", "Hasan", "Tabassum", "Islam", "Sultana", "Khan", "Begum", "Ali", "Parvin", "Uddin", "Chowdhury"];
const locations = ["Dhaka", "Chittagong", "Sylhet", "Rajshahi", "Khulna", "Barisal", "Rangpur", "Mymensingh", "Gazipur", "Narayanganj"];
const sources = ["Facebook Ad", "TikTok", "YouTube", "Friend Referral", "Google Search", "Instagram"];

async function seed() {
  console.log("Starting seed of 2000 users...");
  const appsRef = collection(db, "cash_on_applications");
  
  let count = 0;
  const total = 2000;
  const batchSize = 400; // Firestore limit is 500
  
  for (let i = 0; i < total; i += batchSize) {
    const batch = writeBatch(db);
    const end = Math.min(i + batchSize, total);
    
    for (let j = i; j < end; j++) {
      const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const name = `${fName} ${lName}`;
      const email = `${fName.toLowerCase()}${lName.toLowerCase()}${Math.floor(Math.random() * 100000)}@gmail.com`;
      const phone = `01${Math.floor(Math.random() * 3 + 5)}${Math.floor(Math.random() * 10)}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
      const tiktok = `@${fName.toLowerCase()}_${Math.floor(Math.random() * 1000)}`;
      const loc = locations[Math.floor(Math.random() * locations.length)];
      
      const appDoc = {
        applicantName: name,
        phone: phone,
        email: email,
        address: `${loc}, Bangladesh`,
        tiktokUsername: tiktok,
        foundSource: sources[Math.floor(Math.random() * sources.length)],
        reason: "I want to join this campaign because I love Vibe Gadget products.",
        status: "pending",
        isDemo: true,
        createdAt: Date.now() - Math.floor(Math.random() * 1000000000), // Random time in last ~11 days
        screenshots: {
          followScreenshot: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=400&q=80",
        }
      };
      
      const newDocRef = doc(appsRef);
      batch.set(newDocRef, appDoc);
      count++;
    }
    
    await batch.commit();
    console.log(`Committed batch. Total: ${count}`);
  }
  
  console.log("Seed completed!");
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
