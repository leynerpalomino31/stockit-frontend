// server.js
const next = require('next');
const http = require('http');

const dev = false; // en Hostinger siempre producción
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const port = process.env.PORT || 3000;

  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  server.listen(port, () => {
    console.log(`> Next.js app ready on http://localhost:${port}`);
  });
});
