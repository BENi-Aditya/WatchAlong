export default async function handler(req, res) {
  // Set CORS headers
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info, x-supabase-api-version, x-request-id, accept, accept-language, cookie, referer, user-agent, x-xsrf-token");
  res.setHeader("Access-Control-Expose-Headers", "*");
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  const SUPABASE_URL = process.env.SUPABASE_URL || "https://pbbxvmijtlgwdjivmgao.supabase.co";
  const supabaseHost = new URL(SUPABASE_URL).host;
  
  // Extract path from req.url
  // req.url is like "/rest/v1/profiles?on_conflict=id"
  let fullPath = req.url || "";
  
  // Remove leading slash if present
  if (fullPath.startsWith("/")) {
    fullPath = fullPath.slice(1);
  }
  
  // Split path and query
  const queryIndex = fullPath.indexOf("?");
  const path = queryIndex >= 0 ? "/" + fullPath.slice(0, queryIndex) : "/" + fullPath;
  const query = queryIndex >= 0 ? fullPath.slice(queryIndex) : "";
  
  const targetUrl = SUPABASE_URL + path + query;
  
  console.log("Proxy:", req.method, path, query, "->", targetUrl);
  
  try {
    const headers = {};
    const forwardHeaders = ["authorization", "apikey", "content-type", "x-client-info", "x-supabase-api-version", "x-request-id", "accept", "accept-language", "cookie", "referer", "user-agent", "x-xsrf-token"];
    
    for (const h of forwardHeaders) {
      if (req.headers[h]) {
        headers[h] = req.headers[h];
      }
    }
    headers.host = supabaseHost;
    
    let body = undefined;
    if (!["GET", "HEAD"].includes(req.method) && req.body) {
      body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    }
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      redirect: "manual",
    });
    
    console.log("Response:", response.status);
    
    response.headers.forEach((value, key) => {
      if (!["content-encoding", "transfer-encoding", "connection"].includes(key)) {
        res.setHeader(key, value);
      }
    });
    
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      res.setHeader("set-cookie", setCookie.replace(/Domain=[^;]+;?/gi, ""));
    }
    
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (location) {
        res.setHeader("location", location.replace(SUPABASE_URL, "https://watch-along.vercel.app/api/supabase"));
      }
    }
    
    const data = await response.text();
    res.status(response.status).send(data);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(502).json({ error: "Proxy failed", details: error.message });
  }
}
