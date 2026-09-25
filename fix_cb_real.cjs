const fs = require('fs');
let code = fs.readFileSync('pages/Messages.tsx', 'utf8');

const targetStart = `      {/* Delete Message Bottom Sheet */}`;
const indexOfStart = code.indexOf(targetStart);

if (indexOfStart !== -1) {
    const afterStart = code.substring(indexOfStart);
    let count = 0;
    let endIdx = -1;
    for(let i=0; i<afterStart.length; i++) {
        if (afterStart.substring(i).startsWith("</AnimatePresence>")) {
            count++;
            if (count === 2) { // there are two modals
                 endIdx = i + "</AnimatePresence>".length;
                 break;
            }
        }
    }
    const blockToRemove = afterStart.substring(0, endIdx);
    
    // Remove it from the file completely first
    code = code.replace(blockToRemove, '  ');
    
    // find the end of Messages function
    const endMatch = code.lastIndexOf("</AnimatePresence>");
    const endOfFileIdx = code.indexOf("</div>", endMatch);
    
    code = code.substring(0, endOfFileIdx) + "\n" + blockToRemove + "\n" + code.substring(endOfFileIdx);
    fs.writeFileSync('pages/Messages.tsx', code);
    console.log("Success");
}
