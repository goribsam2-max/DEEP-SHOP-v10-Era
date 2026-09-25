import re

with open("pages/StoreProfile.tsx", "r") as f:
    content = f.read()

# Replace the fetching logic to include user_reviews
old_fetch = """        // Fetch real reviews
        const rQ = query(collection(db, 'reviews'), where('sellerId', '==', sellerId));
        const rSnap = await getDocs(rQ);
        let fetchedReviews = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        let allReviews = [...fetchedReviews];
        if (allReviews.length === 0) {
           for (const p of fetchedProducts) {
              if (p.reviews && Array.isArray(p.reviews)) {
                 allReviews = [...allReviews, ...p.reviews];
              }
           }
        }"""

new_fetch = """        // Fetch real reviews
        const rQ = query(collection(db, 'reviews'), where('sellerId', '==', sellerId));
        const rSnap = await getDocs(rQ);
        let fetchedReviews = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Fetch chat reviews
        const urQ = query(collection(db, 'user_reviews'), where('revieweeId', '==', sellerId));
        const urSnap = await getDocs(urQ);
        const userReviews = urSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        let allReviews = [...fetchedReviews, ...userReviews];
        
        // Always include product reviews
        for (const p of fetchedProducts) {
           if (p.reviews && Array.isArray(p.reviews)) {
              allReviews = [...allReviews, ...p.reviews];
           }
        }"""

content = content.replace(old_fetch, new_fetch)

with open("pages/StoreProfile.tsx", "w") as f:
    f.write(content)
