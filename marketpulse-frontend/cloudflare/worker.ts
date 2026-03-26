const APEX_HOST = "unveni.com";
const WWW_HOST = "www.unveni.com";

interface AssetFetcher {
  fetch(input: Request | string | URL, init?: RequestInit): Promise<Response>;
}

interface PrivateApiFetcher {
  fetch(input: Request | string | URL, init?: RequestInit): Promise<Response>;
}

interface Env {
  ASSETS: AssetFetcher;
  PRIVATE_API?: PrivateApiFetcher;
  API_ORIGIN?: string;
}

function withSecurityHeaders(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "SAMEORIGIN");
  headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function proxyApi(request: Request, env: Env, url: URL): Promise<Response> {
  const headers = new Headers(request.headers);
  headers.set("X-Forwarded-Host", url.host);
  headers.set("X-Forwarded-Proto", "https");

  try {
    if (env.API_ORIGIN?.trim()) {
      const response = await fetch(new URL(url.pathname + url.search, env.API_ORIGIN).toString(), {
        method: request.method,
        headers,
        body: request.body,
        redirect: "manual",
      });

      return withSecurityHeaders(response);
    }

    if (!env.PRIVATE_API) {
      return Response.json(
        {
          detail: "Neither API_ORIGIN nor PRIVATE_API is configured for this deployment.",
        },
        { status: 503 }
      );
    }

    const originUrl = new URL(url.pathname + url.search, "http://api.unveni.com");
    const response = await env.PRIVATE_API.fetch(originUrl.toString(), {
      method: request.method,
      headers,
      body: request.body,
      redirect: "manual",
    });

    return withSecurityHeaders(response);
  } catch (error) {
    return Response.json(
      {
        detail:
          error instanceof Error
            ? `API proxy failed: ${error.message}`
            : "API proxy failed.",
      },
      { status: 502 }
    );
  }
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    let needsRedirect = false;

    if (url.hostname === WWW_HOST) {
      url.hostname = APEX_HOST;
      needsRedirect = true;
    }

    if (url.protocol === "http:") {
      url.protocol = "https:";
      needsRedirect = true;
    }

    if (needsRedirect) {
      return Response.redirect(url.toString(), 308);
    }

    if (url.pathname.startsWith("/api/")) {
      return proxyApi(request, env, url);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    return withSecurityHeaders(assetResponse);
  },
};

export default worker;
