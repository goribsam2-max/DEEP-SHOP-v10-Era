const fs = require('fs');
let code = fs.readFileSync('pages/Messages.tsx', 'utf8');

const target1 = `    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);

      // Mark the active chat as seen by current user in real-time`;

const replace1 = `    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const filteredMsgs = msgs.filter(m => {
          if (m.deletedFor?.includes(user?.uid)) return false;
          if (activeChat?.autoDeleteTimer) {
             const ts = m.timestamp?.toMillis ? m.timestamp.toMillis() : (m.timestamp?.seconds ? m.timestamp.seconds * 1000 : (m.timestamp || Date.now()));
             if (Date.now() - ts > activeChat.autoDeleteTimer.duration) return false;
          }
          return true;
      });
      setMessages(filteredMsgs);

      // Mark the active chat as seen by current user in real-time`;

if(code.includes(target1)) {
    code = code.replace(target1, replace1);
    fs.writeFileSync('pages/Messages.tsx', code);
    console.log("Messages filter replaced");
} else {
    console.log("Target1 not found");
}
