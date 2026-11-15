// Serves the mobile app's web build (mobile/dist-web) for the screenshot capture, with the
// single-page fallback Expo Router needs: any path without a file gets index.html.
// No dependencies.  node mobile-shots/serve.js <dir> <port>
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(process.argv[2] || path.join(__dirname, "..", "..", "mobile", "dist-web"));
const port = Number(process.argv[3] || 5186);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

if (!fs.existsSync(path.join(root, "index.html"))) {
  console.error(`No web build in ${root}. Run the export first (see e2e/README.md, "Mobile app screenshots").`);
  process.exit(1);
}

http
  .createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = path.join(root, url);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, "index.html");
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log(`mobile web build on http://localhost:${port}`));
