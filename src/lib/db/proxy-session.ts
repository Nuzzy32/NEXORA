import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "./env";

const PUBLIC_PATHS = ["/login"];

/** Refreshes the Supabase session cookie and sends signed-out visitors to /login. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = supabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [k, v] of Object.entries(headers)) response.headers.set(k, v);
      },
    },
  });

  // getClaims() verifies the JWT signature; never trust getSession() on the server.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  if (signedIn && request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!signedIn && !PUBLIC_PATHS.includes(request.nextUrl.pathname)) {
    const redirect = NextResponse.redirect(new URL("/login", request.url));
    for (const c of response.cookies.getAll()) redirect.cookies.set(c);
    for (const h of ["cache-control", "expires", "pragma"]) {
      const v = response.headers.get(h);
      if (v) redirect.headers.set(h, v);
    }
    return redirect;
  }
  return response;
}
