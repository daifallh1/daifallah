// Tiny static file server for the exported PWA (no dependencies). Usage: node scripts/serve.mjs out 4173
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
const [root = "out", port = "4173"] = process.argv.slice(2);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain", ".woff2": "font/woff2" };
createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://x");
  let p = normalize(join(root, decodeURIComponent(url.pathname)));
  if (!p.startsWith(normalize(root))) { res.writeHead(403).end(); return; }
  try { if ((await stat(p)).isDirectory()) p = join(p, "index.html"); } catch { p = join(root, "404.html"); }
  try {
    const body = await readFile(p);
    res.writeHead(p.endsWith("404.html") && !url.pathname.endsWith("404.html") ? 404 : 200, { "content-type": types[extname(p)] ?? "application/octet-stream", "cache-control": p.endsWith("sw.js") ? "no-cache" : "public, max-age=0" });
    res.end(body);
  } catch { res.writeHead(404).end("not found"); }
}).listen(Number(port), () => console.log(`serving ${root} on http://localhost:${port}`));
