import { createCorsHeaders, noContentResponse } from "../lib/http.js";

export async function handleRoot(event) {
  const headers = {
    ...createCorsHeaders(event),
    "Content-Type": "text/plain; charset=utf-8",
  };

  if (event.httpMethod === "OPTIONS") {
    return noContentResponse(headers);
  }

  return {
    statusCode: 200,
    headers,
    body: "🎉 Split Bill Backend is Live on Netlify Functions",
  };
}

export default handleRoot;
