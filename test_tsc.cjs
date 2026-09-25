const { execSync } = require('child_process');
try {
    execSync('npx tsc --noEmit', {stdio: 'inherit'});
    console.log("TS Compiled Successfully");
} catch(e) {
    console.error("TS Compilation Failed");
}
