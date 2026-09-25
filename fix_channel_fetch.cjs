const fs = require('fs');
let code = fs.readFileSync('pages/Messages.tsx', 'utf8');

const regex = /setChannelMessages\(msgs\);/g;

code = code.replace(regex, `setChannelMessages(msgs.filter(m => !m.deletedFor?.includes(user?.uid)));`);
fs.writeFileSync('pages/Messages.tsx', code);
console.log("Channel msgs filter replaced");
