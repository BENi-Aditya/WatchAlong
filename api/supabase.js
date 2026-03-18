export const config = {
  api: {
    bodyParser: { sizeLimit: '1mb' },
    externalResolver: true,
  },
};

export default async function handler(req, res) {
  // CORS - MUST use exact origin when credentials are involved, never wildcard
  const allowedOrigins = [
    "https://watch-along.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
  ];
  const origin = req.headers.origin || "";
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  
  res.setHeader("Access-Control-Allow-Origin", corsOrigin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info, x-supabase-api-version, x-request-id, accept, accept-language, cookie, referer, user-agent, x-xsrf-token");
  res.setHeader("Access-Control-Expose-Headers", "*");
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  const SUPABASE_URL = "https://pbbxvmijtlgwdjivmgao.supabase.co";
  const supabaseHost = "pbbxvmijtlgwdjivmgao.supabase.co";
  
  // Vercel rewrite: /api/supabase/rest/v1/profiles -> /api/supabase?path=rest/v1/profiles
  // req.query.path = "rest/v1/profiles" (or ["rest", "v1", "profiles"] as array)
  let path = "";
  if (req.query?.path) {
    const p = req.query.path;
    path = "/" + (Array.isArray(p) ? p.join("/") : p);
  }
  
  // Original query params (not the path) - need to extract from req.url but exclude path= parameter
  let query = "";
  if (req.url && req.url.includes("?")) {
    const urlParams = new URLSearchParams(req.url.slice(req.url.indexOf("?") + 1));
    urlParams.delete("path"); // Remove the path parameter we added
    const queryString = urlParams.toString();
    if (queryString) query = "?" + queryString;
  }
  
  const targetUrl = SUPABASE_URL + path + query;
  
  console.log("Proxy:", req.method, "path:", path, "query:", query || "(none)", "->", targetUrl);
  
  try {
    const headers = {
      host: supabaseHost,
    };
    
    for (const h of ["authorization", "apikey", "content-type", "x-client-info", "x-supabase-api-version", "cookie", "user-agent", "prefer"]) {
      if (req.headers[h]) headers[h] = req.headers[h];
    }
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : (typeof req.body === "string" ? req.body : JSON.stringify(req.body)),
      redirect: "manual",
    });
    
    console.log("Response:", response.status);
    
    response.headers.forEach((v, k) => {
      if (!["content-encoding", "transfer-encoding", "connection"].includes(k)) {
        res.setHeader(k, v);
      }
    });
    
    const sc = response.headers.get("set-cookie");
    if (sc) res.setHeader("set-cookie", sc.replace(/Domain=[^;]+;?/gi, ""));
    
    if (response.status >= 300 && response.status < 400) {
      const loc = response.headers.get("location");
      if (loc) res.setHeader("location", loc.replace(SUPABASE_URL, "https://watch-along.vercel.app/api/supabase"));
    }
    
    res.status(response.status).send(await response.text());
  } catch (e) {
    console.error("Proxy error:", e);
    res.status(502).json({ error: e.message });
  }
}
