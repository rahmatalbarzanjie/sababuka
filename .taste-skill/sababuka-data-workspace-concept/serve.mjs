import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const types = { ".html": "text/html; charset=utf-8", ".md": "text/markdown; charset=utf-8" };

createServer((request, response) => {
  const path = request.url === "/" ? "index.html" : request.url.slice(1);
  const file = join(root, path);
  response.setHeader("Content-Type", types[extname(file)] || "application/octet-stream");
  createReadStream(file).on("error", () => {
    response.statusCode = 404;
    response.end("Tidak ditemukan");
  }).pipe(response);
}).listen(4174, "127.0.0.1", () => {
  console.log("Konsep SABABUKA: http://127.0.0.1:4174");
});
