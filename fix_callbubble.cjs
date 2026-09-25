const fs = require('fs');
let code = fs.readFileSync('pages/Messages.tsx', 'utf8');

const regex = /{deleteMessageId && \([\s\S]*?<\/AnimatePresence>\s*{showAutoDeleteModal && \([\s\S]*?<\/AnimatePresence>\s*/g;
const match = code.match(regex);
if (match) {
    code = code.replace(match[0], '');
    console.log("Removed from CallBubble");
    
    const endReplace = `      </AnimatePresence>\n      {/* Delete Message Bottom Sheet */}\n      <AnimatePresence>\n  ` + match[0] + `\n    </div>\n  );\n}`;
    code = code.replace(/      <\/AnimatePresence>\n    <\/div>\n  \);\n}/, endReplace);
    fs.writeFileSync('pages/Messages.tsx', code);
    console.log("Added to end of file");
} else {
    console.log("Modals not found in CallBubble");
}
