import fs from "node:fs";
import path from "node:path";
import type { FastifyReply } from "fastify";

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png"
};

export function sendPublicFile(reply: FastifyReply, relativePath: string): FastifyReply {
  const publicDir = path.resolve(process.cwd(), "public");
  const resolvedPath = path.resolve(publicDir, relativePath);

  if (!resolvedPath.startsWith(publicDir)) {
    return reply.code(400).send({
      ok: false,
      error: "Invalid public asset path"
    });
  }

  if (!fs.existsSync(resolvedPath)) {
    return reply.code(404).send({
      ok: false,
      error: "Public asset not found"
    });
  }

  const extension = path.extname(resolvedPath);
  return reply.type(contentTypes[extension] ?? "application/octet-stream").send(fs.createReadStream(resolvedPath));
}
