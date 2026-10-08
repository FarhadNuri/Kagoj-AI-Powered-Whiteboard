import { createRemoteJWKSet, jwtVerify } from "jose";

const base = process.env.NEON_AUTH_URL ? process.env.NEON_AUTH_URL.replace(/\/$/, "") : null;
const jwksUrl = base ? `${base}/.well-known/jwks.json` : null;

if (!base) {
  console.warn("NEON_AUTH_URL is not set - protected routes will reject every request.");
}

const jwks = base ? createRemoteJWKSet(new URL(jwksUrl)) : null;
if (base) console.log(`Neon Auth enabled - JWKS: ${jwksUrl}`);

const verify = async (token) => {
  // If it's a signed JWT (3-part format)
  if (String(token).split(".").length === 3) {
    const { payload } = await jwtVerify(token, jwks);
    return { email: payload.email, name: payload.name, sub: payload.sub || payload.id };
  }

  // If it's an opaque session token
  const origin = process.env.CLIENT_URL || "http://localhost:5173";
  const res = await fetch(`${base}/get-session`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Cookie: `better-auth.session_token=${token}; __Secure-better-auth.session_token=${token}`,
      Origin: origin,
    },
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    console.error(`Neon Auth get-session failed [${res.status}]:`, errorText);
    throw new Error(`neon get-session ${res.status}`);
  }

  const data = await res.json();
  console.log("DEBUG Neon Auth get-session response:", JSON.stringify(data, null, 2));
  const user = data?.user;
  if (!user?.email) throw new Error("neon session has no user");

  return { email: user.email, name: user.name, sub: user.id };
};

export { verify };