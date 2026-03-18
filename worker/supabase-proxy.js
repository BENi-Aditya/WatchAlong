export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Your Supabase project URL
    const supabaseUrl = env.SUPABASE_URL || "https://your-project.supabase.co";
    
    // Build the target URL - preserve path and query
    const targetUrl = new URL(url.pathname + url.search, supabaseUrl);
    
    // Clone the request with the new URL
    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
    
    // Fetch from Supabase
    const response = await fetch(modifiedRequest);
    
    // Clone response so we can modify headers
    const modifiedResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
    
    // Add CORS headers to allow your frontend
    modifiedResponse.headers.set("Access-Control-Allow-Origin", "*");
    modifiedResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    modifiedResponse.headers.set("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info, x-supabase-api-version");
    modifiedResponse.headers.set("Access-Control-Max-Age", "86400");
    
    // Handle preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: modifiedResponse.headers,
      });
    }
    
    return modifiedResponse;
  },
};
