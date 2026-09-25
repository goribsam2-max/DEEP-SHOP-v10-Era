import re

with open("components/BanOverlay.tsx", "r") as f:
    content = f.read()

# When we fetch IP, also save it to the current user doc if we have user
old_ip = """    const checkIP = async () => {
      try {
        const res = await fetch("https://api.ipify.org?format=json");
        const data = await res.json();
        const ip = data.ip;
        if (ip) {
          const formattedIp = ip.replace(/\./g, '_');
          const snap = await getDoc(doc(db, "config", "banned_ips"));
          if (snap.exists() && snap.data()[formattedIp] === true) {
            setIsBanned(true);
          }
        }
      } catch (e) {
        // ignore
      }
    };"""

new_ip = """    const checkIP = async (currentUserUid?: string) => {
      try {
        const res = await fetch("https://api.ipify.org?format=json");
        const data = await res.json();
        const ip = data.ip;
        if (ip) {
          const formattedIp = ip.replace(/\\./g, '_');
          const snap = await getDoc(doc(db, "config", "banned_ips"));
          if (snap.exists() && snap.data()[formattedIp] === true) {
            setIsBanned(true);
          }
          
          if (currentUserUid) {
             const { updateDoc } = await import("firebase/firestore");
             await updateDoc(doc(db, "users", currentUserUid), { ipAddress: ip }).catch(() => {});
          }
        }
      } catch (e) {
        // ignore
      }
    };"""

content = content.replace(old_ip, new_ip)
content = content.replace('checkIP();', 'checkIP(); // old call')

old_auth = """    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        checkBan(user.uid);
      } else {
        if (unsubProfile) unsubProfile();
        setIsBanned(false);
        checkIP(); // recheck IP when logged out
      }
    });"""

new_auth = """    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        checkBan(user.uid);
        checkIP(user.uid);
      } else {
        if (unsubProfile) unsubProfile();
        setIsBanned(false);
        checkIP(); // recheck IP when logged out
      }
    });"""

content = content.replace(old_auth, new_auth)

with open("components/BanOverlay.tsx", "w") as f:
    f.write(content)
