const fs = require('fs');
let code = fs.readFileSync('pages/Messages.tsx', 'utf8');
const modals = fs.readFileSync('modals.txt', 'utf8');

const target = `      </AnimatePresence>
    </div>
  );
}`;

if (code.includes(target)) {
    code = code.replace(target, `      </AnimatePresence>\n` + modals + `\n    </div>\n  );\n}`);
    fs.writeFileSync('pages/Messages.tsx', code);
    console.log("Appended");
} else {
    console.log("Target not found");
}
