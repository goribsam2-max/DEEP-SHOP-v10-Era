const fs = require('fs');
let code = fs.readFileSync('pages/Messages.tsx', 'utf8');

const regex = /        \{\/\* Delete Message Bottom Sheet \*\/\}[\s\S]*?Turn Off\s*<\/button>\s*\)\}\s*<\/div>\s*<\/motion\.div>\s*<\/div>\s*\)\}\s*<\/AnimatePresence>/;

const match = code.match(regex);
if (match) {
    const toRemove = match[0];
    code = code.replace(toRemove, '</div>');
    
    const eofTarget = `    </div>
  );
}`;
    if(code.includes(eofTarget)) {
        code = code.replace(eofTarget, toRemove + '\n' + eofTarget);
        fs.writeFileSync('pages/Messages.tsx', code);
        console.log("Moved modals successfully");
    } else {
        console.log("EOF target not found");
    }
} else {
    console.log("Modals not found in CallBubble");
}
