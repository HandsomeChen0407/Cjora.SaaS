import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { authApi, type CurrentUser } from "@/api/auth";

interface AuthState {
  token: string | null;
  user: CurrentUser | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (token: string) => Promise<void>;
  logout: () => void;
  hasPermission: (code: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: localStorage.getItem("token"),
    user: null,
    loading: !!localStorage.getItem("token"),
  });

  const fetchMe = useCallback(async () => {
    try {
      const res = await authApi.getMe();
      if (res.success && res.data) {
        setState(s => ({ ...s, user: res.data!, loading: false }));
      } else {
        localStorage.removeItem("token");
        setState({ token: null, user: null, loading: false });
      }
    } catch {
      localStorage.removeItem("token");
      setState({ token: null, user: null, loading: false });
    }
  }, []);

  useEffect(() => {
    if (state.token && !state.user) {
      fetchMe();
    }
  }, [state.token, state.user, fetchMe]);

  const login = useCallback(async (token: string) => {
    localStorage.setItem("token", token);
    setState(s => ({ ...s, token, loading: true }));
    await fetchMe();
  }, [fetchMe]);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setState({ token: null, user: null, loading: false });
  }, []);

  const hasPermission = useCallback(
    (code: string) => state.user?.permissionCodes?.includes(code) ?? false,
    [state.user]
  );

  return (
    <AuthContext.Provider value={{ ...state, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function usePermission(code: string) {
  const { hasPermission } = useAuth();
  return hasPermission(code);
}
