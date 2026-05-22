export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  const path = req.url.replace(/^\/api\/elevenlabs/, "");

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);

  const headers = { "xi-api-key": process.env.ELEVENLABS_API_KEY };
  if (req.headers["content-type"]) {
    headers["content-type"] = req.headers["content-type"];
  }

  const upstream = await fetch(`https://api.elevenlabs.io${path}`, {
    method: req.method,
    headers,
    body: body.length > 0 ? body : undefined,
  });

  const data = await upstream.arrayBuffer();
  res.status(upstream.status);
  const ct = upstream.headers.get("content-type");
  if (ct) res.setHeader("content-type", ct);
  res.end(Buffer.from(data));
}
