import "dotenv/config";
import express from "express";
import cors from "cors";
import { errorHandler, notFoundHandler } from "./src/middleware/errorHandler.js";
import apiRoutes from './src/routes/index.js'
import { initSocket } from "./src/socket/index.js";
import http from "node:http";
import { UPLOAD_DIR } from "./src/config/uploads.js";
const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "5mb" }));
app.use('/uploads',express.static(UPLOAD_DIR,{maxAge:'30d', immutable: true}))
app.get("/", (_req, res) =>
  res.json({ name: "AI Whiteboard Notes API", status: "running" })
);

app.use("/api",apiRoutes)

app.use(notFoundHandler);
app.use(errorHandler);

const server = http.createServer(app)
initSocket(server)

const PORT = process.env.PORT || 5050;
server.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

export default app;