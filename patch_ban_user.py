import re

with open("pages/admin/ManageUsers.tsx", "r") as f:
    content = f.read()

old_toggle = """  const toggleBan = async (uid: string, currentStatus: boolean) => {
    await updateDoc(doc(db, "users", uid), { isBanned: !currentStatus });
  };"""

new_toggle = """  const toggleBan = async (uid: string, currentStatus: boolean) => {
    await updateDoc(doc(db, "users", uid), { isBanned: !currentStatus });
    
    // Also save IP to banned_ips if banning
    if (!currentStatus) {
      const userDoc = users.find(u => u.uid === uid);
      if (userDoc && userDoc.ipAddress) {
        try {
          await updateDoc(doc(db, "config", "banned_ips"), {
            [userDoc.ipAddress.replace(/\./g, '_')]: true
          });
        } catch (e) {
          // document might not exist, create it
          const setDoc = (await import('firebase/firestore')).setDoc;
          await setDoc(doc(db, "config", "banned_ips"), {
            [userDoc.ipAddress.replace(/\./g, '_')]: true
          }, { merge: true });
        }
      }
    } else {
      // Unban IP
      const userDoc = users.find(u => u.uid === uid);
      if (userDoc && userDoc.ipAddress) {
        try {
          const updateObj: any = {};
          updateObj[userDoc.ipAddress.replace(/\./g, '_')] = (await import('firebase/firestore')).deleteField();
          await updateDoc(doc(db, "config", "banned_ips"), updateObj);
        } catch (e) {
          // ignore
        }
      }
    }
  };"""

content = content.replace(old_toggle, new_toggle)

with open("pages/admin/ManageUsers.tsx", "w") as f:
    f.write(content)
