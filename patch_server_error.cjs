const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// replace console.error
code = code.replace(/console\.error\("([^"]+)", error\);/g, `
    if (!error.message?.includes('429') && !error.message?.includes('Quota')) {
      console.error("$1", error);
    }
`);

fs.writeFileSync('server.ts', code);
