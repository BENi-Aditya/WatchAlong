export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info, x-supabase-api-version");
  
  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  const SUPABASE_URL = process.env.SUPABASE_URL || "https://pbbxvmijtlgwdjivmgao.supabase.co";
  
  // Build target URL - preserve path and query
  const path = req.url.replace("/api/supabase", "");
  const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  const targetUrl = SUPABASE_URL + path + query;
  
  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "authorization": req.headers.authorization || "",
        "apikey": req.headers.apikey || "",
        "content-type": req.headers["content-type"] || "application/json",
        "x-client-info": req.headers["x-client-info"] || "",
        "x-supabase-api-version": req.headers["x-supabase-api-version"] || "",
      },
      body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body),
    });
    
    // Forward status and body
    const data = await response.text();
    res.status(response.status).send(data);
  } catch (error) {
    console.error("Supabase proxy error:", error);
    res.status(502).json({ error: "Failed to reach Supabase" });
  }
}
