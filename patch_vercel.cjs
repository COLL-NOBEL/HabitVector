const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/import\s+\{\s*createServer\s*as\s*createViteServer\s*\}\s*from\s*"vite";\n/, '');

const oldStartServerRegex = /async function startServer\(\) \{[\s\S]*?startServer\(\);/;

const newStartServer = `async function startServer() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    // Integrate Vite as a middleware for local development
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    // Serve static files from compiled dist in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(\`Server running on port \${PORT}\`);
    });
  }
}
startServer();

export default app;`;

code = code.replace(oldStartServerRegex, newStartServer);

fs.writeFileSync('server.ts', code);
