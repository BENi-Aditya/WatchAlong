export default async function handler(req, res) {
  // Set CORS headers - allow the main app origin with credentials
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info, x-supabase-api-version, x-request-id, accept, accept-language, cookie, referer, user-agent, x-xsrf-token");
  res.setHeader("Access-Control-Expose-Headers", "*");
  
  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  const SUPABASE_URL = process.env.SUPABASE_URL || "https://pbbxvmijtlgwdjivmgao.supabase.co";
  const supabaseHost = new URL(SUPABASE_URL).host;
  
  // Build target URL - Vercel rewrites strip the path, so we need to get it from the original request
  // The path comes in as query parameter when using :path* in vercel.json
  let path = "";
  let query = "";
  
  // Check if path is in query params (from vercel rewrite)
  if (req.query && req.query.path) {
    // path is an array when using :path*
    const pathParts = Array.isArray(req.query.path) ? req.query.path.join("/") : req.query.path;
    path = "/" + pathParts;
  } else {
    // Fallback: extract from req.url
    const urlObj = new URL(req.url, "https://example.com");
    path = urlObj.pathname.replace("/api/supabase", "");
    query = urlObj.search;
  }
  
  // Get query string from original URL
  if (!query && req.url.includes("?")) {
    query = req.url.slice(req.url.indexOf("?"));
  }
  
  const targetUrl = SUPABASE_URL + path + query;
  
  console.log("Proxy request:", req.method, "path:", path, "query:", query, "->", targetUrl);
  
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
      "user-agent",
      "x-xsrf-token"
    ];
    
    for (const h of forwardHeaders) {
      if (req.headers[h]) {
        headers[h] = req.headers[h];
      }
    }
    
    // Ensure host header is set to Supabase
    headers.host = supabaseHost;
    
    // Handle body correctly - Vercel parses JSON automatically
    let body = undefined;
    if (!["GET", "HEAD"].includes(req.method)) {
      if (req.body) {
        body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      }
    }
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      redirect: "manual", // Don't auto-follow redirects
    });
    
    console.log("Proxy response:", response.status, response.statusText);
    
    // Forward response headers (except problematic ones)
    response.headers.forEach((value, key) => {
      if (key !== "content-encoding" && key !== "transfer-encoding" && key !== "connection") {
        res.setHeader(key, value);
      }
    });
    
    // Forward Set-Cookie headers explicitly
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      // Rewrite cookie domain from supabase.co to our domain
      const rewrittenCookies = setCookie
        .split(/,(?=\s*[a-zA-Z]+=)/) // Split on cookie boundaries
        .map(cookie => cookie.replace(/Domain=[^;]+;?/gi, ""))
        .join(", ");
      res.setHeader("set-cookie", rewrittenCookies);
      console.log("Set-Cookie:", rewrittenCookies);
    }
    
    // Handle redirects - rewrite location to use proxy URL
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (location) {
        // Rewrite Supabase URLs to proxy URLs
        let newLocation = location;
        if (location.includes("supabase.co") || location.includes(supabaseHost)) {
          newLocation = location.replace(SUPABASE_URL, "https://watch-along.vercel.app/api/supabase");
        }
        console.log("Redirect:", location, "->", newLocation);
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
