import re

with open("pages/admin/ManageIllustrations.tsx", "r") as f:
    content = f.read()

content = content.replace("await setDoc(doc(db, \"settings\", \"illustrations\"), images, { merge: true });", "await setDoc(doc(db, \"settings\", \"illustrations\"), images);")

with open("pages/admin/ManageIllustrations.tsx", "w") as f:
    f.write(content)
