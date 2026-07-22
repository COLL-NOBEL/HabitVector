const fs = require('fs');
let code = fs.readFileSync('tsconfig.json', 'utf8');

const json = JSON.parse(code);
json.exclude = ["dist", "node_modules", "server.js", "patch_*.cjs"];
json.include = ["src", "server.ts"];

fs.writeFileSync('tsconfig.json', JSON.stringify(json, null, 2));
