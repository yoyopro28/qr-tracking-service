import { NextResponse, type NextRequest } from "next/server";

const BASIC_AUTH_REALM = "QR Tracking Admin";

const PROTECTED_PATH_PREFIXES = [
  "/campaigns",
  "/admin",
  "/analytics",
  "/api/qr",
  "/api/templates",
  "/api/flyers",
];

const PUBLIC_PATH_PREFIXES = ["/r/", "/_next/"];

function shouldProtect(pathname: string) {
  if (pathname === "/") {
    return true;
  }

  if (PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return false;
  }

  return PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function unauthorized() {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "www-authenticate": `Basic realm="${BASIC_AUTH_REALM}", charset="UTF-8"`,
    },
  });
}

function credentialsNotConfigured() {
  return new NextResponse("Admin credentials are not configured.", {
    status: 500,
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

function parseBasicAuthHeader(headerValue: string | null) {
  if (!headerValue?.startsWith("Basic ")) {
    return null;
  }

  try {
    const decodedCredentials = atob(headerValue.slice("Basic ".length));
    const separatorIndex = decodedCredentials.indexOf(":");

    if (separatorIndex === -1) {
      return null;
    }

    return {
      username: decodedCredentials.slice(0, separatorIndex),
      password: decodedCredentials.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!shouldProtect(pathname)) {
    return NextResponse.next();
  }

  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    return credentialsNotConfigured();
  }

  const credentials = parseBasicAuthHeader(request.headers.get("authorization"));

  if (
    !credentials ||
    !safeEqual(credentials.username, expectedUsername) ||
    !safeEqual(credentials.password, expectedPassword)
  ) {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
