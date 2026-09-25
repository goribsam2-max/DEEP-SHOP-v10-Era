const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

if(!code.includes("import { InstallBanner } from './components/InstallBanner';")) {
    code = code.replace("import { PullToRefresh } from './components/PullToRefresh';", "import { PullToRefresh } from './components/PullToRefresh';\nimport { InstallBanner } from './components/InstallBanner';");
    code = code.replace("<Router>", "<InstallBanner />\n            <Router>");
    fs.writeFileSync('App.tsx', code);
    console.log("Success");
}
