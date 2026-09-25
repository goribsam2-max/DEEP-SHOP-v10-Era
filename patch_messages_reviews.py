import re

with open("pages/Messages.tsx", "r") as f:
    content = f.read()

old_fetch = """      try {
        const q = query(
          collection(db, "user_reviews"),
          where("revieweeId", "==", activeChat.otherUser.id)
        );
        const snap = await getDocs(q);
        const list = snap.docs.map(doc => doc.data());"""

new_fetch = """      try {
        const q1 = query(
          collection(db, "user_reviews"),
          where("revieweeId", "==", activeChat.otherUser.id)
        );
        const snap1 = await getDocs(q1);
        const list1 = snap1.docs.map(doc => doc.data());

        const q2 = query(
          collection(db, "reviews"),
          where("sellerId", "==", activeChat.otherUser.id)
        );
        const snap2 = await getDocs(q2);
        const list2 = snap2.docs.map(doc => doc.data());

        const list = [...list1, ...list2];"""

content = content.replace(old_fetch, new_fetch)

with open("pages/Messages.tsx", "w") as f:
    f.write(content)
