import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, type TenantDto, type UserDto } from "@/api/client";

type AuthState = {
  user: UserDto | null;
  tenant: TenantDto | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setSession: (user: UserDto, tenant: TenantDto | null) => void;
  clear: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [tenant, setTenant] = useState<TenantDto | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const data = await api.me();
    setUser(data.user);
    setTenant(data.tenant);
  }

  useEffect(() => {
    refresh()
      .catch(() => {
        setUser(null);
        setTenant(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        loading,
        refresh,
        setSession: (u, t) => {
          setUser(u);
          setTenant(t);
        },
        clear: () => {
          setUser(null);
          setTenant(null);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
