const fs = require('fs');
let code = fs.readFileSync('pages/Messages.tsx', 'utf8');

if (!code.includes("import { VerifiedIcon }")) {
    const importIdx = code.indexOf("import");
    code = code.substring(0, importIdx) + "import { VerifiedIcon } from '../components/SellerBadge';\n" + code.substring(importIdx);
    fs.writeFileSync('pages/Messages.tsx', code);
}
