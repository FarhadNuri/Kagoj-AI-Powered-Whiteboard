import { createClient } from "@neondatabase/neon-js";
import { BetterAuthReactAdapter } from "@neondatabase/neon-js/auth/react/adapters";

const url = import.meta.env.VITE_NEON_AUTH_URL;
// createClient requires a dataApi url even though our Express API is the data layer.
const dataUrl = import.meta.env.VITE_NEON_DATA_API_URL || url;

export const neonEnabled = Boolean(url);

const client = neonEnabled
  ? createClient({
      auth: { adapter: BetterAuthReactAdapter(), url },
      dataApi: { url: dataUrl },
    })
  : null;

export const authClient = client?.auth;

let cachedToken = "";

export const getNeonToken = () => cachedToken;
export const clearNeonToken = () => {
  cachedToken = "";
};

// Dig a JWT string out of the various shapes the SDK may return.
export function asTokenString(v) {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v.token === "string") return v.token;
  if (typeof v.data === "string") return v.data;
  if (typeof v.data?.token === "string") return v.data.token;
  if (typeof v.data?.session?.token === "string") return v.data.session.token;
  return "";
}

export async function refreshNeonToken() {
  if (!authClient) return "";
  let token = "";
  try {
    token = asTokenString(await authClient.token());
  } catch {
    // fall through to getSession
  }
  if (!token) {
    try {
      const session = await authClient.getSession();
      token = asTokenString(session?.data?.session) || asTokenString(session);
    } catch {
      token = "";
    }
  }
  cachedToken = token;
  return token;
}

async function unwrap(promise) {
  const res = await promise;
  if (res?.error) throw new Error(res.error.message || "Authentication failed");
  return res;
}

export const neonSignIn = (email, password) =>
  unwrap(authClient.signIn.email({ email, password }));

export const neonSignUp = (name, email, password) =>
  unwrap(authClient.signUp.email({ name, email, password }));

export const neonSignOut = () => authClient.signOut();

export const neonSession = () => authClient.getSession();
