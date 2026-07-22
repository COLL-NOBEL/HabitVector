const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /const \{ createServer: createViteServer \} = await import\("vite"\);/,
  `const viteMod = "vi" + "te";\n    const { createServer: createViteServer } = await import(/* @vite-ignore */ viteMod);`
);

fs.writeFileSync('server.ts', code);
