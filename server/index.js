import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { fileURLToPath } from "url";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Proxy Groq — inject API key server-side, never exposed to browser
app.use(
  "/api/groq",
  createProxyMiddleware({
    target: "https://api.groq.com",
    changeOrigin: true,
    pathRewrite: { "^/api/groq": "" },
    on: {
      proxyReq: (proxyReq) => {
        proxyReq.removeHeader("authorization");
        proxyReq.setHeader(
          "Authorization",
          `Bearer ${process.env.GROQ_API_KEY}`
        );
      },
    },
  })
);

// Proxy ElevenLabs — covers both TTS and Scribe STT
app.use(
  "/api/elevenlabs",
  createProxyMiddleware({
    target: "https://api.elevenlabs.io",
    changeOrigin: true,
    pathRewrite: { "^/api/elevenlabs": "" },
    on: {
      proxyReq: (proxyReq) => {
        proxyReq.removeHeader("xi-api-key");
        proxyReq.setHeader("xi-api-key", process.env.ELEVENLABS_API_KEY);
      },
    },
  })
);

// Serve the Vite production build
app.use(express.static(path.join(__dirname, "../dist")));
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
