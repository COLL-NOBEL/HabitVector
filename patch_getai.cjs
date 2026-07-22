const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const newGetAI = `function getAI(req?: any): GoogleGenAI {
  const headerKey = req?.headers?.['x-gemini-api-key'];
  const customKey = typeof headerKey === 'string' ? headerKey.trim() : Array.isArray(headerKey) ? headerKey[0].trim() : null;
  
  if (customKey && customKey.length > 5) {
    return new GoogleGenAI({
      apiKey: customKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;`;

code = code.replace(
  /function getAI\(req\?: any\): GoogleGenAI \{\n\s*const customKey = req\?\.headers\?\.\['x-gemini-api-key'\];\n\s*if \(customKey\) \{\n\s*return new GoogleGenAI\(\{\n\s*apiKey: customKey,\n\s*httpOptions: \{\n\s*headers: \{\n\s*"User-Agent": "aistudio-build",\n\s*\},\n\s*\},\n\s*\}\);\n\s*\}\n\s*if \(\!aiClient\) \{\n\s*const apiKey = process\.env\.GEMINI_API_KEY;/,
  newGetAI
);

fs.writeFileSync('server.ts', code);
