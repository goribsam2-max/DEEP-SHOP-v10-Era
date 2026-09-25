import re

with open("pages/StoreProfile.tsx", "r") as f:
    content = f.read()

# Make the reviewer name clickable (Link to /store/:userId), replace Avatar image with initials, and add the seed function.

add_doc_import = "import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove, addDoc } from 'firebase/firestore';"
content = content.replace("import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';", add_doc_import)

link_import = "import { useParams, useNavigate, Link } from 'react-router-dom';"
content = content.replace("import { useParams, useNavigate } from 'react-router-dom';", link_import)

seed_function = """
        // Auto-seed for deepshop@gmail.com
        if (sData?.email === 'deepshop@gmail.com' && fetchedReviews.length === 0 && user) {
           const mockReviews = [
              {
                userId: user.uid,
                sellerId: sellerId,
                reviewerName: 'Rahim',
                reviewerId: 'rahim123',
                rating: 5,
                comment: 'age cash on aa order korcilam bodda sei akta mal dila mia. Ekdom agun jinish!',
                createdAt: new Date('2026-07-08T10:00:00Z').getTime()
              },
              {
                userId: user.uid,
                sellerId: sellerId,
                reviewerName: 'Farhana',
                reviewerId: 'farhana456',
                rating: 1,
                comment: 'salar tmi mia mal akta akhama mal dila',
                createdAt: new Date('2026-07-09T11:30:00Z').getTime()
              },
              {
                userId: user.uid,
                sellerId: sellerId,
                reviewerName: 'Kamrul',
                reviewerId: 'kamrul789',
                rating: 1,
                comment: 'ore codon kire bhai dila to sovai re middle finger dekhaia mobile to hath aa mia. fokinni marka kaj karbar.',
                createdAt: new Date('2026-07-10T14:15:00Z').getTime()
              },
              {
                userId: user.uid,
                sellerId: sellerId,
                reviewerName: 'Sumaiya',
                reviewerId: 'sumaiya001',
                rating: 5,
                comment: 'vabcilam scam hobo kintu shalar amr kutta vaggo paia gechi. thank you deep shop for genuine product.',
                createdAt: new Date('2026-07-11T09:20:00Z').getTime()
              },
              {
                userId: user.uid,
                sellerId: sellerId,
                reviewerName: 'Tanvir',
                reviewerId: 'tanvir002',
                rating: 4,
                comment: 'Mal ta valoi but delivery ektu late hoise. tobe original jinis paia ami khushi. next time abar order korbo bodda.',
                createdAt: new Date('2026-07-11T16:45:00Z').getTime()
              },
              {
                userId: user.uid,
                sellerId: sellerId,
                reviewerName: 'Nadia',
                reviewerId: 'nadia003',
                rating: 5,
                comment: 'Osthir product! Jemon ta dekhsi thik temon tai paici. Best shop in BD for authentic gadgets.',
                createdAt: new Date('2026-07-12T08:10:00Z').getTime()
              },
              {
                userId: user.uid,
                sellerId: sellerId,
                reviewerName: 'Arif',
                reviewerId: 'arif004',
                rating: 3,
                comment: 'Packaging ta ektu nosto chilo, but mobile er kono damage hoy nai. ektu careful thaka dorkar.',
                createdAt: new Date('2026-07-12T13:25:00Z').getTime()
              },
              {
                userId: user.uid,
                sellerId: sellerId,
                reviewerName: 'Mim',
                reviewerId: 'mim005',
                rating: 5,
                comment: 'Khub e sundor service. Seller er behavior o onek valo chilo. ami amar frnd der o suggest korbo.',
                createdAt: new Date('2026-07-13T10:05:00Z').getTime()
              },
              {
                userId: user.uid,
                sellerId: sellerId,
                reviewerName: 'Sajid',
                reviewerId: 'sajid006',
                rating: 4,
                comment: 'Overall valo experience. Kintu price ta ektu besi lagse. Tobe original mal paia shanti.',
                createdAt: new Date('2026-07-13T18:50:00Z').getTime()
              },
              {
                userId: user.uid,
                sellerId: sellerId,
                reviewerName: 'Tisha',
                reviewerId: 'tisha007',
                rating: 5,
                comment: 'Onek voy e chilam order korar somoy. Kintu haate pawar por sob voy kete gese. Thank you!',
                createdAt: new Date('2026-07-14T09:30:00Z').getTime()
              },
              {
                userId: user.uid,
                sellerId: sellerId,
                reviewerName: 'Fahim',
                reviewerId: 'fahim008',
                rating: 1,
                comment: 'Bhai eita ki dilen? Order korlam ek model r ashlo arek model. Return request disi, taratari solve koren mia.',
                createdAt: new Date('2026-07-14T14:40:00Z').getTime()
              },
              {
                userId: user.uid,
                sellerId: sellerId,
                reviewerName: 'Riya',
                reviewerId: 'riya009',
                rating: 5,
                comment: 'Excellent service! Cash on delivery te product peye amar trust level bere gese. Good job.',
                createdAt: new Date('2026-07-15T08:15:00Z').getTime()
              },
              {
                userId: user.uid,
                sellerId: sellerId,
                reviewerName: 'Hasan',
                reviewerId: 'hasan010',
                rating: 5,
                comment: 'Super fast delivery r authentic product. Ami regular customer hoye gelam aj theke bodda.',
                createdAt: new Date('2026-07-15T10:00:00Z').getTime()
              }
           ];
           for (const r of mockReviews) {
              await addDoc(collection(db, 'reviews'), r);
           }
           // Fetch again
           const newRQ = query(collection(db, 'reviews'), where('sellerId', '==', sellerId));
           const newRSnap = await getDocs(newRQ);
           fetchedReviews = newRSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
"""

content = content.replace("const fetchedReviews = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));", "let fetchedReviews = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));\n" + seed_function)

# Use Initials and make name clickable in review tab
review_ui_old = """                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden shrink-0">
                           <img src={review.reviewerPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${review.reviewerName || 'User'}`} alt="Reviewer" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col">
                           <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{review.reviewerName || 'Anonymous'}</span>
                           <span className="text-zinc-400 text-[11px]">{review.reviewerCountry || 'Verified Buyer'}</span>
                        </div>
                      </div>"""

review_ui_new = """                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden shrink-0 text-white font-bold text-lg">
                           {(review.reviewerName || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                           <Link to={`/store/${review.reviewerId || review.userId}`} className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 hover:underline">
                              {review.reviewerName || 'Anonymous'}
                           </Link>
                           <span className="text-zinc-400 text-[11px]">{review.reviewerCountry || 'Verified Buyer'}</span>
                        </div>
                      </div>"""

content = content.replace(review_ui_old, review_ui_new)

# Remove back button from normal user profile view
back_button_old = """         <button onClick={() => navigate(-1)} className="absolute top-4 left-4 z-20 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 hover:bg-black/60 transition">
            <ArrowLeft className="w-5 h-5" />
         </button>"""

content = content.replace(back_button_old, "")

with open("pages/StoreProfile.tsx", "w") as f:
    f.write(content)

