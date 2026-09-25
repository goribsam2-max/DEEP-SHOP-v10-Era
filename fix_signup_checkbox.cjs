const fs = require('fs');
let code = fs.readFileSync('pages/SignUp.tsx', 'utf8');

const regex = /<input\s*type="checkbox"\s*id="terms"\s*className="[^"]+"\s*checked={agree}\s*onChange={\(e\) => setAgree\(e\.target\.checked\)}\s*\/>/m;

code = code.replace(regex, '<Checkbox id="terms" checked={agree} onCheckedChange={(c) => setAgree(!!c)} />');
fs.writeFileSync('pages/SignUp.tsx', code);
