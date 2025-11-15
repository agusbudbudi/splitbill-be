import { createCorsHeaders, noContentResponse } from "../lib/http.js";

export async function handleRoot(event) {
  const headers = {
    ...createCorsHeaders(event),
    "Content-Type": "text/plain; charset=utf-8",
  };

  if (event.httpMethod === "OPTIONS") {
    return noContentResponse(headers);
  }

  return new Response("🎉 Split Bill Backend is Live on Netlify Functions", {
    status: 200,
    headers,
  });
}

export default handleRoot;
