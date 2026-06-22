const DEFAULT_API_ORIGIN = "http://localhost:4000";
const DEFAULT_API_REQUEST_ORIGIN = "http://localhost:3000";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function normalizeOrigin(value, fallback) {
  const rawValue = typeof value === "string" && value.trim().length > 0 ? value : fallback;

  return new URL(rawValue).origin;
}

function resolveApiOrigin() {
  if (!process.env.API_ORIGIN && process.env.VERCEL) {
    throw new Error("API_ORIGIN is not configured");
  }

  return normalizeOrigin(process.env.API_ORIGIN, DEFAULT_API_ORIGIN);
}

function resolveApiRequestOrigin() {
  if (!process.env.API_REQUEST_ORIGIN && process.env.VERCEL) {
    throw new Error("API_REQUEST_ORIGIN is not configured");
  }

  return normalizeOrigin(process.env.API_REQUEST_ORIGIN, DEFAULT_API_REQUEST_ORIGIN);
}

function createUpstreamHeaders(request) {
  const headers = new Headers(request.headers);

  for (const name of HOP_BY_HOP_HEADERS) {
    headers.delete(name);
  }

  headers.set("origin", resolveApiRequestOrigin());
  headers.set("x-forwarded-host", new URL(request.url).host);
  headers.set("x-forwarded-proto", "https");

  return headers;
}

function getApiPath(requestUrl) {
  const path = requestUrl.searchParams.get("path") ?? "";
  const normalizedPath = path
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .join("/");

  return normalizedPath.length > 0 ? `/api/v1/${normalizedPath}` : "/api/v1";
}

function createUpstreamUrl(request) {
  const requestUrl = new URL(request.url);
  const upstreamUrl = new URL(getApiPath(requestUrl), resolveApiOrigin());

  requestUrl.searchParams.delete("path");
  upstreamUrl.search = requestUrl.searchParams.toString();

  return upstreamUrl;
}

function createResponseHeaders(upstreamResponse) {
  const headers = new Headers(upstreamResponse.headers);

  for (const name of HOP_BY_HOP_HEADERS) {
    headers.delete(name);
  }

  return headers;
}

export default {
  async fetch(request) {
    let upstreamUrl;

    try {
      upstreamUrl = createUpstreamUrl(request);
    } catch (error) {
      return Response.json(
        {
          error: error instanceof Error ? error.message : "Failed to create upstream URL",
        },
        { status: 500 },
      );
    }

    const upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers: createUpstreamHeaders(request),
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : await request.arrayBuffer(),
      redirect: "manual",
    });

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: createResponseHeaders(upstreamResponse),
    });
  },
};
