const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const newErrorHandler = `const handleApiError = (res: any, error: any, defaultMessage: string) => {
  let message = error.message || defaultMessage;
  let status = 500;
  
  // Attempt to parse API Error json if it exists
  if (error.message) {
    if (error.message.includes("429") || error.message.includes("Quota")) {
      status = 429;
      message = "Rate limit exceeded. Please wait a moment or add your own API key in Settings.";
    } else if (error.message.includes("400") || error.message.includes("403") || error.message.includes("API_KEY_INVALID")) {
      status = 400;
      message = "Invalid API Key or authorization error. Please check your custom Gemini API key in Settings.";
    }
  }

  res.status(status).json({ error: message, originalError: error.message });
};`;

code = code.replace(
  /const handleApiError = \[\s\S\]*?res\.status\(status\)\.json\(\{ error: message, originalError: error\.message \}\);\n\};/m,
  newErrorHandler
);

// Fallback replace if regex fails
if (!code.includes("Invalid API Key or authorization error")) {
  code = code.replace(
    /const handleApiError = \(([\s\S]*?)res\.status\(status\)\.json\(\{ error: message, originalError: error\.message \}\);\n\}/,
    newErrorHandler
  );
}

fs.writeFileSync('server.ts', code);
