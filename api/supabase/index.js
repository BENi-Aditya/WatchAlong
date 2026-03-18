export default async function handler(req, res) {
  // Set CORS headers - allow the main app origin with credentials
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info, x-supabase-api-version, x-request-id, accept, accept-language, cookie, referer");
  res.setHeader("Access-Control-Expose-Headers", "*");
  
  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  const SUPABASE_URL = process.env.SUPABASE_URL || "https://pbbxvmijtlgwdjivmgao.supabase.co";
  const supabaseHost = new URL(SUPABASE_URL).host;
  
  // Build target URL - preserve path and query
  const path = req.url.replace("/api/supabase", "");
  const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  const targetUrl = SUPABASE_URL + path + query;
  
  try {
    // Forward all headers from the original request
    const headers = {};
    const forwardHeaders = [
      "authorization",
      "apikey", 
      "content-type",
      "x-client-info",
      "x-supabase-api-version",
      "x-request-id",
      "accept",
      "accept-language",
      "cookie",
      "referer",
      "user-agent"
    ];
    
    for (const h of forwardHeaders) {
      if (req.headers[h]) {
        headers[h] = req.headers[h];
      }
    }
    
    // Ensure host header is set to Supabase
    headers.host = supabaseHost;
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body),
      redirect: "manual", // Don't auto-follow redirects
    });
    
    // Forward response headers (except problematic ones)
    response.headers.forEach((value, key) => {
      if (key !== "content-encoding" && key !== "transfer-encoding" && key !== "connection") {
        res.setHeader(key, value);
      }
    });
    
    // Handle redirects - rewrite location to use proxy URL
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (location) {
        // Rewrite Supabase URLs to proxy URLs
        let newLocation = location;
        if (location.includes("supabase.co") || location.includes(supabaseHost)) {
          newLocation = location.replace(SUPABASE_URL, "https://watch-along.vercel.app/api/supabase");
        }
        res.setHeader("location", newLocation);
      }
    }
    
    // Forward status and body
    const data = await response.text();
    res.status(response.status).send(data);
  } catch (error) {
    console.error("Supabase proxy error:", error);
    res.status(502).json({ error: "Failed to reach Supabase", details: error.message });
  }
}
