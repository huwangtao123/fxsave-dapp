import { NextResponse } from "next/server";

type RateLimitConfig = {
  limit: number;
  routeKey: string;
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateLimitEntry>;

const RATE_LIMIT_STORE_KEY = "__fxsaveRateLimitStore";

function getRateLimitStore(): RateLimitStore {
  const globalScope = globalThis as typeof globalThis & {
    [RATE_LIMIT_STORE_KEY]?: RateLimitStore;
  };

  if (!globalScope[RATE_LIMIT_STORE_KEY]) {
    globalScope[RATE_LIMIT_STORE_KEY] = new Map<string, RateLimitEntry>();
  }

  return globalScope[RATE_LIMIT_STORE_KEY];
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function getRequestOrigin(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");

  if (!host) {
    return null;
  }

  const protocol = request.headers.get("x-forwarded-proto") || "https";

  return `${protocol}://${host}`;
}

function getAllowedOrigins(request: Request) {
  const origins = new Set<string>();
  const requestOrigin = getRequestOrigin(request);

  if (requestOrigin) {
    origins.add(requestOrigin);
  }

  const configuredOrigins = process.env.FXSAVE_TRUSTED_ORIGINS?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  for (const origin of configuredOrigins ?? []) {
    origins.add(origin);
  }

  return origins;
}

export function enforceTrustedOrigin(request: Request) {
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  const candidate = request.headers.get("origin") || request.headers.get("referer");

  if (!candidate) {
    return null;
  }

  let resolvedOrigin: string;

  try {
    resolvedOrigin = new URL(candidate).origin;
  } catch {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  if (getAllowedOrigins(request).has(resolvedOrigin)) {
    return null;
  }

  return NextResponse.json({ error: "Origin not allowed." }, { status: 403 });
}

export function enforceRateLimit(request: Request, config: RateLimitConfig) {
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  const clientIp = getClientIp(request);
  const key = `${config.routeKey}:${clientIp}`;
  const now = Date.now();
  const store = getRateLimitStore();
  const existingEntry = store.get(key);

  if (!existingEntry || existingEntry.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });

    return null;
  }

  if (existingEntry.count >= config.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existingEntry.resetAt - now) / 1000));

    return NextResponse.json(
      { error: "Rate limit exceeded. Please retry shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
        },
      },
    );
  }

  existingEntry.count += 1;
  store.set(key, existingEntry);

  return null;
}
