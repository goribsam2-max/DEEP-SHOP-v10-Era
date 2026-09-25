const fs = require('fs');
let code = fs.readFileSync('pages/Messages.tsx', 'utf8');

if (!code.includes("import { uploadToImgbb }")) {
    const importIdx = code.indexOf("import");
    code = code.substring(0, importIdx) + "import { uploadToImgbb } from '../services/imgbb';\n" + code.substring(importIdx);
    fs.writeFileSync('pages/Messages.tsx', code);
}
