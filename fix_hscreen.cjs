const fs = require('fs');
let code = fs.readFileSync('pages/Messages.tsx', 'utf8');

code = code.replace(/className="flex h-screen /g, 'className="flex h-[100dvh] ');

fs.writeFileSync('pages/Messages.tsx', code);
