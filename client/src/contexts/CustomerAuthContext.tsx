import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Redirect, useLocation, useSearch } from "wouter";
import {
  AUTH_STATE_EVENT,
  getLocalSessionUser,
  mapSupabaseUser,
  registerCustomer,
  resolveCurrentUser,
  signInCustomer,
  signOutCustomer,
  type CustomerUser,
} from "@/lib/storeOperations";
import { supabase } from "@/lib/supabase";

type CustomerAuthContextValue = {
  user: CustomerUser | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ user?: CustomerUser; error?: string }>;
  signUp: (input: {
    name: string;
    email: string;
    phone?: string;
    password: string;
  }) => Promise<{
    user?: CustomerUser;
    requiresEmailConfirmation?: boolean;
    error?: string;
  }>;
  signOut: () => Promise<{ error?: string }>;
  refreshUser: () => Promise<void>;
};

const CustomerAuthContext = createContext<CustomerAuthContextValue | undefined>(
  undefined,
);

export function CustomerAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<CustomerUser | null>(() =>
    supabase ? null : getLocalSessionUser(),
  );
  const [loading, setLoading] = useState<boolean>(() => Boolean(supabase));

  const refreshUser = useCallback(async () => {
    const resolved = await resolveCurrentUser();
    setUser(resolved);
  }, []);

  useEffect(() => {
    if (supabase) {
      let active = true;
      void supabase.auth
        .getSession()
        .then(({ data }) => {
          if (!active) return;
          setUser(mapSupabaseUser(data.session?.user ?? null));
          setLoading(false);
        })
        .catch(() => {
          if (!active) return;
          setLoading(false);
        });

      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(mapSupabaseUser(session?.user ?? null));
        setLoading(false);
      });
      return () => {
        active = false;
        data.subscription.unsubscribe();
      };
    }

    const syncLocal = () => {
      setUser(getLocalSessionUser());
    };
    window.addEventListener(AUTH_STATE_EVENT, syncLocal);
    window.addEventListener("storage", syncLocal);
    return () => {
      window.removeEventListener(AUTH_STATE_EVENT, syncLocal);
      window.removeEventListener("storage", syncLocal);
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await signInCustomer(email, password);
    if (res.user) setUser(res.user);
    return res;
  }, []);

  const signUp = useCallback(
    async (input: {
      name: string;
      email: string;
      phone?: string;
      password: string;
    }) => {
      const res = await registerCustomer(input);
      if (res.user) setUser(res.user);
      return res;
    },
    [],
  );

  const signOut = useCallback(async () => {
    const res = await signOutCustomer();
    if (!res.error) setUser(null);
    return res;
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signUp,
      signOut,
      refreshUser,
    }),
    [user, loading, signIn, signUp, signOut, refreshUser],
  );

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth(): CustomerAuthContextValue {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) {
    throw new Error("useCustomerAuth must be used inside CustomerAuthProvider");
  }
  return ctx;
}

export function sanitizeNextPath(rawNext: string | null | undefined): string {
  if (!rawNext) return "/store";
  const trimmed = rawNext.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/sign-in") ||
    trimmed.startsWith("/create-account")
  ) {
    return "/store";
  }
  return trimmed === "/" ? "/store" : trimmed;
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useCustomerAuth();
  const [location] = useLocation();
  const search = useSearch();

  if (loading) {
    return (
      <div className="gs-auth-gate-loader" role="status" aria-live="polite">
        <div className="gs-auth-gate-loader__card">
          <span className="gs-wordmark__name">goodstock</span>
          <p>Verifying your session…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const fullPath = search ? `${location}?${search}` : location;
    const target =
      fullPath && fullPath !== "/" && fullPath !== "/store"
        ? `/sign-in?next=${encodeURIComponent(fullPath)}`
        : "/sign-in";
    return <Redirect to={target} replace />;
  }

  return <>{children}</>;
}
