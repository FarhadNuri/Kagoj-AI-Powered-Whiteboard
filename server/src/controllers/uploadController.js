import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import storage from "../config/storage.js";
import { UPLOAD_DIR } from "../config/uploads.js";

const EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest("No image file provided");
  const ext = EXT[req.file.mimetype] || "jpg";
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;

  let url;
  if (storage.isEnabled()) {
    // The bucket is private, so images are served through our own /files proxy.
    await storage.putObject(`whiteboards/${filename}`, req.file.buffer, req.file.mimetype);
    const base = process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
    url = `${base}/files/whiteboards/${filename}`;
  } else {
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), req.file.buffer);
    const base = process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
    url = `${base}/uploads/${filename}`;
  }

  res.status(201).json({ url, filename, size: req.file.size });
});

// Public on purpose: <img> tags can't send auth headers, and filenames are random and unguessable.
export const serveFile = asyncHandler(async (req, res) => {
  if (!storage.isEnabled()) throw ApiError.notFound("File not found");
  const name = path.basename(req.params.filename);
  try {
    const obj = await storage.getObject(`whiteboards/${name}`);
    res.set({
      "Content-Type": obj.ContentType || "application/octet-stream",
      "Cache-Control": "public, max-age=2592000, immutable",
      "Cross-Origin-Resource-Policy": "cross-origin",
    });
    obj.Body.pipe(res);
  } catch {
    throw ApiError.notFound("File not found");
  }
});
