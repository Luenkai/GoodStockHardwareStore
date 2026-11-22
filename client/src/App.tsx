import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MotionConfig } from "framer-motion";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Account from "./pages/Account";
import Cart from "./pages/Cart";
import Home from "./pages/Home";
import Entry from "./pages/Entry";
import NotFound from "./pages/NotFound";
import ProductDetail from "./pages/ProductDetail";
import Products from "./pages/Products";
const BusinessPortal = lazy(() => import("./pages/BusinessPortal"));

function BusinessPortalRoute() {
  return (
    <Suspense fallback={<div className="business-config"><p>Loading staff workspace…</p></div>}>
      <BusinessPortal />
    </Suspense>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Entry} />
      <Route path="/store" component={Home} />
      <Route path="/products/:handle" component={ProductDetail} />
      <Route path="/products" component={Products} />
      <Route path="/cart" component={Cart} />
      <Route path="/account" component={Account} />
      <Route path="/business" component={BusinessPortalRoute} />
      <Route path="/business/inventory" component={BusinessPortalRoute} />
      <Route path="/business/sales" component={BusinessPortalRoute} />
      <Route path="/business/analytics" component={BusinessPortalRoute} />
      <Route path="/business/users" component={BusinessPortalRoute} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <MotionConfig reducedMotion="user">
          <TooltipProvider>
            <Toaster position="bottom-right" />
            <Router />
          </TooltipProvider>
        </MotionConfig>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
