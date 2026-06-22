const DEFAULT_API_ORIGIN = "http://localhost:4000";
const DEFAULT_API_REQUEST_ORIGIN = "http://localhost:3000";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
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

function getHeaderValue(value) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return value;
}

function createUpstreamHeaders(request) {
  const headers = new Headers();

  for (const [name, value] of Object.entries(request.headers)) {
    const lowerName = name.toLowerCase();
    const headerValue = getHeaderValue(value);

    if (!headerValue || HOP_BY_HOP_HEADERS.has(lowerName)) {
      continue;
    }

    headers.set(name, headerValue);
  }

  headers.set(
    "origin",
    normalizeOrigin(process.env.API_REQUEST_ORIGIN, DEFAULT_API_REQUEST_ORIGIN),
  );

  if (request.headers.host) {
    headers.set("x-forwarded-host", request.headers.host);
    headers.set("x-forwarded-proto", "https");
  }

  return headers;
}

async function readBody(request) {
  if (request.method === "GET" || request.method === "HEAD") {
    return undefined;
  }

  const chunks = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

function createUpstreamUrl(request) {
  const apiOrigin = normalizeOrigin(process.env.API_ORIGIN, DEFAULT_API_ORIGIN);
  const incomingUrl = new URL(request.url ?? "/", `https://${request.headers.host ?? "localhost"}`);
  const apiPath = incomingUrl.pathname.replace(/^\/api\/v1/, "");
  const upstreamUrl = new URL(`/api/v1${apiPath}`, apiOrigin);
  upstreamUrl.search = incomingUrl.search;

  return upstreamUrl;
}

function writeResponseHeaders(upstreamResponse, response) {
  for (const [name, value] of upstreamResponse.headers) {
    const lowerName = name.toLowerCase();

    if (lowerName === "set-cookie" || HOP_BY_HOP_HEADERS.has(lowerName)) {
      continue;
    }

    response.setHeader(name, value);
  }

  const getSetCookie = upstreamResponse.headers.getSetCookie?.bind(upstreamResponse.headers);
  const setCookies = getSetCookie?.() ?? [];
  const fallbackSetCookie = upstreamResponse.headers.get("set-cookie");

  if (setCookies.length > 0) {
    response.setHeader("set-cookie", setCookies);
  } else if (fallbackSetCookie) {
    response.setHeader("set-cookie", fallbackSetCookie);
  }
}

export default async function handler(request, response) {
  const upstreamResponse = await fetch(createUpstreamUrl(request), {
    method: request.method,
    headers: createUpstreamHeaders(request),
    body: await readBody(request),
    redirect: "manual",
  });

  response.statusCode = upstreamResponse.status;
  response.statusMessage = upstreamResponse.statusText;
  writeResponseHeaders(upstreamResponse, response);
  response.end(Buffer.from(await upstreamResponse.arrayBuffer()));
}
