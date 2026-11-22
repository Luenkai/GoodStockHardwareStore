import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MotionConfig } from "framer-motion";
import { Redirect, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import {
  CustomerAuthProvider,
  RequireAuth,
} from "./contexts/CustomerAuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Account from "./pages/Account";
import Cart from "./pages/Cart";
import CreateAccount from "./pages/CreateAccount";
import Entry from "./pages/Entry";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import ProductDetail from "./pages/ProductDetail";
import Products from "./pages/Products";
import SignIn from "./pages/SignIn";

const BusinessPortal = lazy(() => import("./pages/BusinessPortal"));

function BusinessPortalRoute() {
  return (
    <RequireAuth>
      <Suspense
        fallback={
          <div className="business-config">
            <p>Loading workspace…</p>
          </div>
        }
      >
        <BusinessPortal />
      </Suspense>
    </RequireAuth>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/sign-in" component={SignIn} />
      <Route path="/create-account" component={CreateAccount} />

      <Route path="/">
        <RequireAuth>
          <Redirect to="/store" replace />
        </RequireAuth>
      </Route>
      <Route path="/portal">
        <RequireAuth>
          <Entry />
        </RequireAuth>
      </Route>
      <Route path="/store">
        <RequireAuth>
          <Home />
        </RequireAuth>
      </Route>
      <Route path="/products/:handle">
        <RequireAuth>
          <ProductDetail />
        </RequireAuth>
      </Route>
      <Route path="/products">
        <RequireAuth>
          <Products />
        </RequireAuth>
      </Route>
      <Route path="/cart">
        <RequireAuth>
          <Cart />
        </RequireAuth>
      </Route>
      <Route path="/account">
        <RequireAuth>
          <Account />
        </RequireAuth>
      </Route>
      <Route path="/business" component={BusinessPortalRoute} />
      <Route path="/business/inventory" component={BusinessPortalRoute} />
      <Route path="/business/sales" component={BusinessPortalRoute} />
      <Route path="/business/analytics" component={BusinessPortalRoute} />
      <Route path="/business/users" component={BusinessPortalRoute} />
      <Route path="/404">
        <RequireAuth>
          <NotFound />
        </RequireAuth>
      </Route>
      <Route>
        <RequireAuth>
          <NotFound />
        </RequireAuth>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <CustomerAuthProvider>
          <MotionConfig reducedMotion="user">
            <TooltipProvider>
              <Toaster position="bottom-right" />
              <Router />
            </TooltipProvider>
          </MotionConfig>
        </CustomerAuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
