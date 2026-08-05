import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.PORT ?? 3030);
const clientRoot = fileURLToPath(new URL("../dist/client/", import.meta.url));

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

async function loadLocalEnv() {
  try {
    const envFile = await readFile(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of envFile.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    }
  } catch {
    // Local preview can still serve public pages without a database.
  }
}

await loadLocalEnv();
const { default: worker } = await import("../dist/server/index.js");

async function assetResponse(request) {
  const pathname = new URL(request.url).pathname;
  if (pathname === "/" || pathname.includes("..")) return new Response("Not found", { status: 404 });

  try {
    const filePath = join(clientRoot, decodeURIComponent(pathname.slice(1)));
    const body = await readFile(filePath);
    const extension = extname(filePath).toLowerCase();
    return new Response(body, {
      headers: { "content-type": contentTypes[extension] ?? "application/octet-stream" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

async function requestBody(incoming) {
  if (incoming.method === "GET" || incoming.method === "HEAD") return undefined;

  const chunks = [];
  for await (const chunk of incoming) chunks.push(chunk);
  return Buffer.concat(chunks);
}

const server = createServer(async (incoming, outgoing) => {
  try {
    const url = new URL(incoming.url ?? "/", `http://localhost:${port}`);
    if (url.pathname !== "/") {
      const asset = await assetResponse(new Request(url));
      if (asset.status !== 404) {
        outgoing.writeHead(asset.status, Object.fromEntries(asset.headers));
        outgoing.end(Buffer.from(await asset.arrayBuffer()));
        return;
      }
    }
    const headers = new Headers();
    for (const [name, value] of Object.entries(incoming.headers)) {
      if (typeof value === "string") headers.set(name, value);
      else if (Array.isArray(value)) headers.set(name, value.join(", "));
    }

    const request = new Request(url, {
      method: incoming.method ?? "GET",
      headers,
      body: await requestBody(incoming),
      duplex: "half",
    });
    const response = await worker.fetch(
      request,
      { ASSETS: { fetch: assetResponse } },
      { waitUntil() {}, passThroughOnException() {} },
    );

    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    outgoing.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    outgoing.end(error instanceof Error ? error.stack : String(error));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Jaqueline Beauty Studio preview: http://localhost:${port}`);
});
