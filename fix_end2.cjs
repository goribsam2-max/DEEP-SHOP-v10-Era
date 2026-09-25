const fs = require('fs');
let code = fs.readFileSync('pages/Messages.tsx', 'utf8');
const modals = fs.readFileSync('modals.txt', 'utf8');

const regex = /      <\/AnimatePresence>\s*<\/div>\s*\);\s*}\s*$/;
if (regex.test(code)) {
    code = code.replace(regex, `      </AnimatePresence>\n` + modals + `\n    </div>\n  );\n}`);
    fs.writeFileSync('pages/Messages.tsx', code);
    console.log("Appended");
} else {
    console.log("Regex not matched");
}
