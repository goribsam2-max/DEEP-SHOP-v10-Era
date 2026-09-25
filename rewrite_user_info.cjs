const fs = require('fs');
let code = fs.readFileSync('pages/Messages.tsx', 'utf8');

const regex = /{showUserInfoModal && activeChat && \([\s\S]*?<\/AnimatePresence>\s*<\/div>\s*\)\s*}/;
const match = code.match(regex);
if (!match) {
    console.log("No match found for showUserInfoModal");
    process.exit(1);
}

// Instead of matching until AnimatePresence which could be wrong (there are multiple AnimatePresence),
// let's use a simpler target replacement.
