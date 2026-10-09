import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi, clearToken, getToken, setToken } from "../lib/api";
import {
  authClient,
  clearNeonToken,
  neonEnabled,
  neonSignIn,
  neonSignOut,
  neonSignUp,
  refreshNeonToken,
} from "../lib/neonAuth";
import { connectSocket, disconnectSocket } from "../lib/socket";

const AuthContext = createContext(null);

const TOKEN_REFRESH_MS = 10 * 60 * 1000;

function NeonAuthProvider({ children }) {
  const session = authClient.useSession();
  const sessionUser = session.data?.user;

  const user = useMemo(
    () =>
      sessionUser
        ? {
            id: sessionUser.id,
            name: sessionUser.name || sessionUser.email,
            email: sessionUser.email,
            avatar_url: sessionUser.image || null,
          }
        : null,
    [sessionUser],
  );
  const userId = user?.id;

  useEffect(() => {
    if (!userId) {
      disconnectSocket();
      return;
    }
    refreshNeonToken().then(connectSocket);
    const timer = setInterval(refreshNeonToken, TOKEN_REFRESH_MS);
    return () => clearInterval(timer);
  }, [userId]);

  const login = useCallback(async (email, password) => {
    await neonSignIn(email, password);
    await refreshNeonToken();
  }, []);

  const register = useCallback(async (name, email, password) => {
    await neonSignUp(name, email, password);
    await refreshNeonToken();
  }, []);

  const logout = useCallback(async () => {
    await neonSignOut();
    clearNeonToken();
    disconnectSocket();
  }, []);

  const value = useMemo(
    () => ({ user, loading: session.isPending, login, register, logout }),
    [user, session.isPending, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function LocalAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    authApi
      .me()
      .then((u) => {
        setUser(u);
        connectSocket();
      })
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const finish = useCallback(async ({ token, user: u }) => {
    setToken(token);
    setUser(u);
    await connectSocket();
  }, []);

  const login = useCallback(
    async (email, password) => finish(await authApi.login({ email, password })),
    [finish],
  );

  const register = useCallback(
    async (name, email, password) => finish(await authApi.register({ name, email, password })),
    [finish],
  );

  const logout = useCallback(async () => {
    clearToken();
    disconnectSocket();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const AuthProvider = neonEnabled ? NeonAuthProvider : LocalAuthProvider;

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
