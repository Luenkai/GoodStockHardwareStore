import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link, useLocation } from "wouter";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Box,
  ChartNoAxesCombined,
  ClipboardList,
  Database,
  LogOut,
  Package,
  Plus,
  Shield,
  ShoppingCart,
  Users,
  Warehouse,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatMoney } from "@/lib/storefront";
import {
  datasetCsvSource,
  metricDescriptions,
  modelDescriptions,
  parseDataset,
  trainDemandModels,
  type Evaluation,
} from "@/lib/business-ml";
import { Input } from "@/components/ui/input";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Role = "inventory_clerk" | "sales_personnel" | "admin" | "instructor";
type Staff = { role: Role };
type Product = {
  id: string;
  sku: string | null;
  title: string;
  handle: string;
  product_type: string;
  price: number | string;
  currency_code: string;
  inventory: number;
  reorder_level: number;
  is_active: boolean;
};
type Sale = {
  id: string;
  receipt_number: string;
  total: number | string;
  currency_code: string;
  status: string;
  created_at: string;
};
const roleNames: Record<Role, string> = {
  inventory_clerk: "Inventory clerk",
  sales_personnel: "Sales personnel",
  admin: "Administrator",
  instructor: "Instructor",
};
const roleLinks = [
  {
    href: "/business",
    label: "Overview",
    icon: ChartNoAxesCombined,
    roles: ["inventory_clerk", "sales_personnel", "admin", "instructor"],
  },
  {
    href: "/business/inventory",
    label: "Inventory",
    icon: Warehouse,
    roles: ["inventory_clerk", "admin"],
  },
  {
    href: "/business/sales",
    label: "Sales",
    icon: ShoppingCart,
    roles: ["sales_personnel", "admin"],
  },
  {
    href: "/business/analytics",
    label: "Knowledge analysis",
    icon: Activity,
    roles: ["admin", "instructor"],
  },
  {
    href: "/business/users",
    label: "User management",
    icon: Users,
    roles: ["admin"],
  },
] as const;
const roleOptions: Role[] = [
  "inventory_clerk",
  "sales_personnel",
  "admin",
  "instructor",
];
const money = (n: number | string, currency = "PHP") =>
  formatMoney({ amount: String(n), currencyCode: currency });
const errorText = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong. Please try again.";

export default function BusinessPortal() {
  const [location, setLocation] = useLocation();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [authError, setAuthError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [dashboard, setDashboard] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [modelArtifacts, setModelArtifacts] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [datasetPage, setDatasetPage] = useState(0);
  const [staffRows, setStaffRows] = useState<any[]>([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [forecast, setForecast] = useState<any[]>([]);
  const [analyticsInput, setAnalyticsInput] = useState({
    productId: "HW-001",
    unitPrice: 45,
    promotion: false,
    seasonality: 1,
    previousDemand: 55,
  });
  const [staffEmail, setStaffEmail] = useState("");
  const [staffRole, setStaffRole] = useState<Role>("inventory_clerk");
  const [inventoryForm, setInventoryForm] = useState({
    sku: "",
    title: "",
    product_type: "Fasteners",
    price: "",
    inventory: "0",
    reorder_level: "5",
  });

  const loadRole = useCallback(async (uid: string) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("business_staff")
      .select("role")
      .eq("user_id", uid)
      .maybeSingle();
    if (error) {
      setAuthError(error.message);
      setStaff(null);
      return;
    }
    const role = (data as Staff | null)?.role;
    setStaff(role && roleOptions.includes(role) ? { role } : null);
  }, []);
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    void supabase.auth.getSession().then(async ({ data, error }) => {
      if (error) setAuthError(error.message);
      const next = data.session?.user ?? null;
      setUser(next ? { id: next.id, email: next.email } : null);
      if (next) await loadRole(next.id);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user ?? null;
      setUser(next ? { id: next.id, email: next.email } : null);
      setStaff(null);
      if (next) void loadRole(next.id);
    });
    return () => data.subscription.unsubscribe();
  }, [loadRole]);

  const refreshDashboard = useCallback(async () => {
    if (!supabase || !staff) return;
    const { data, error } = await supabase.rpc("get_business_dashboard");
    if (error) throw error;
    setDashboard(data);
  }, [staff]);
  const refreshProducts = useCallback(async (archived = false) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("products")
      .select(
        "id,sku,title,handle,product_type,price,currency_code,inventory,reorder_level,is_active"
      )
      .eq("is_active", !archived)
      .order("title");
    if (error) throw error;
    setProducts((data ?? []) as Product[]);
  }, []);
  const refreshSales = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("business_sales")
      .select("id,receipt_number,total,currency_code,status,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    setSales((data ?? []) as Sale[]);
  }, []);
  const refreshAnalytics = useCallback(async () => {
    if (!supabase || !staff) return;
    if (staff.role !== "instructor") {
      setModelArtifacts([]);
      setMetrics(null);
      return;
    }
    const { data, error } = await supabase
      .from("business_models")
      .select("model_type,version,metrics,trained_at")
      .order("trained_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    setModelArtifacts(data ?? []);
    setMetrics(data ?? []);
  }, [staff]);
  const refreshUsers = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.rpc("list_business_users");
    if (error) throw error;
    setStaffRows(data ?? []);
  }, []);
  useEffect(() => {
    if (!staff || !supabase) return;
    setAuthError("");
    const run = async () => {
      try {
        if (location === "/business") await refreshDashboard();
        if (location === "/business/inventory")
          await refreshProducts(showArchived);
        if (location === "/business/sales") {
          await refreshProducts();
          await refreshSales();
        }
        if (location === "/business/analytics") {
          await Promise.all([refreshAnalytics(), refreshProducts()]);
        }
        if (location === "/business/users") await refreshUsers();
      } catch (e) {
        setAuthError(errorText(e));
      }
    };
    void run();
  }, [
    location,
    staff,
    showArchived,
    refreshDashboard,
    refreshProducts,
    refreshSales,
    refreshAnalytics,
    refreshUsers,
  ]);
  useEffect(() => {
    if (
      products.length &&
      !products.some(p => p.id === analyticsInput.productId)
    ) {
      setAnalyticsInput(current => ({
        ...current,
        productId: products[0]!.id,
        unitPrice: Number(products[0]!.price),
      }));
    }
  }, [products, analyticsInput.productId]);

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setStaff(null);
    setLocation("/business");
  };
  const train = async () => {
    setBusy(true);
    setNotice("");
    try {
      const trained = trainDemandModels();
      for (const item of trained.models) {
        const { data: latest, error } = await supabase!
          .from("business_models")
          .select("version")
          .eq("model_type", item.artifact.kind)
          .order("version", { ascending: false })
          .limit(1);
        if (error) throw error;
        const version = (latest?.[0]?.version ?? 0) + 1;
        const { error: insertError } = await supabase!
          .from("business_models")
          .insert({
            model_type: item.artifact.kind,
            version,
            artifact: item.artifact,
            metrics: item.metrics,
          });
        if (insertError) throw insertError;
      }
      await refreshAnalytics();
      setNotice(
        `Both models trained and saved using ${trained.datasetRows.length.toLocaleString()} records.`
      );
    } catch (e) {
      setNotice(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const predict = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setForecast([]);
    setNotice("");
    try {
      const { data, error } = await supabase!.rpc("predict_business_demand", {
        p_unit_price: Number(analyticsInput.unitPrice),
        p_promotion: analyticsInput.promotion,
        p_seasonality: Number(analyticsInput.seasonality),
        p_previous_month_demand: Number(analyticsInput.previousDemand),
      });
      if (error) throw error;
      if (!data?.length)
        throw new Error(
          "No saved models yet. An instructor must train and save them first."
        );
      const history = parseDataset();
      const productAverages = Array.from(
        history
          .reduce(
            (map, row) =>
              map.set(
                row.product_id,
                (map.get(row.product_id) ?? 0) + row.demand_units
              ),
            new Map<string, number>()
          )
          .values()
      )
        .map(total => total / (history.length / 10))
        .sort((a, b) => a - b);
      const low = productAverages[2] ?? 0,
        high = productAverages[7] ?? 0;
      setForecast(
        data.map((m: any) => {
          const predictedUnits = Number(m.predicted_units);
          return {
            model: m.model_type,
            predictedUnits,
            expectedRevenue: predictedUnits * Number(analyticsInput.unitPrice),
            velocityLabel:
              predictedUnits <= low
                ? "Slow-moving product"
                : predictedUnits >= high
                  ? "Best-selling product"
                  : "Steady-moving product",
          };
        })
      );
    } catch (e) {
      setNotice(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const checkout = async () => {
    if (!supabase) return;
    const items = Object.entries(cart)
      .filter(([, quantity]) => quantity > 0)
      .map(([product_id, quantity]) => ({ product_id, quantity }));
    if (!items.length) return;
    setBusy(true);
    setNotice("");
    try {
      const { data, error } = await supabase.rpc("create_business_sale", {
        items,
      });
      if (error) throw error;
      setCart({});
      await Promise.all([
        refreshProducts(),
        refreshSales(),
        refreshDashboard(),
      ]);
      setNotice(
        `Sale completed. Receipt ${data.receipt_number} · ${money(data.total, data.currency_code)}.`
      );
    } catch (e) {
      setNotice(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const addProduct = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    try {
      const handle = inventoryForm.title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const { error } = await supabase.from("products").insert({
        sku: inventoryForm.sku.trim(),
        title: inventoryForm.title.trim(),
        handle,
        description: "",
        product_type: inventoryForm.product_type,
        vendor: "Goodstock Hardware",
        price: Number(inventoryForm.price),
        currency_code: "PHP",
        inventory: Number(inventoryForm.inventory),
        reorder_level: Number(inventoryForm.reorder_level),
        is_active: true,
      });
      if (error) throw error;
      setShowProductForm(false);
      setInventoryForm({
        sku: "",
        title: "",
        product_type: "Fasteners",
        price: "",
        inventory: "0",
        reorder_level: "5",
      });
      await Promise.all([refreshProducts(), refreshDashboard()]);
      setNotice("Product added to inventory.");
    } catch (e) {
      setNotice(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const adjustInventory = async (product: Product, delta: number) => {
    if (!supabase) return;
    const next = Math.max(0, product.inventory + delta);
    const { error } = await supabase
      .from("products")
      .update({ inventory: next })
      .eq("id", product.id);
    if (error) setNotice(error.message);
    else {
      await Promise.all([refreshProducts(), refreshDashboard()]);
      setNotice(`${product.title} stock updated to ${next}.`);
    }
  };
  const setProductActive = async (product: Product, isActive: boolean) => {
    if (!supabase || staff?.role !== "admin") return;
    setBusy(true);
    setNotice("");
    try {
      const { data, error } = await supabase.rpc(
        "set_business_product_active",
        {
          p_product_id: product.id,
          p_is_active: isActive,
        }
      );
      if (error) throw error;
      if (!data) throw new Error("The product could not be found.");
      await Promise.all([refreshProducts(showArchived), refreshDashboard()]);
      setNotice(
        isActive
          ? `${product.title} restored to the storefront.`
          : `${product.title} archived. Existing order records are preserved.`
      );
    } catch (e) {
      setNotice(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const assignRole = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("assign_business_role", {
        p_email: staffEmail.trim(),
        p_role: staffRole,
      });
      if (error) throw error;
      setStaffEmail("");
      await refreshUsers();
      setNotice("Staff role updated.");
    } catch (e) {
      setNotice(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const revokeRole = async (email: string) => {
    if (!supabase) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("revoke_business_access", {
        p_email: email,
      });
      if (error) throw error;
      await refreshUsers();
      setNotice("Staff access revoked.");
    } catch (e) {
      setNotice(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const page =
    location === "/business/inventory"
      ? "inventory"
      : location === "/business/sales"
        ? "sales"
        : location === "/business/analytics"
          ? "analytics"
          : location === "/business/users"
            ? "users"
            : "overview";
  const authorized =
    !!staff &&
    roleLinks.some(
      item => item.href === location && item.roles.includes(staff.role as never)
    );
  const pageTitles: Record<string, string> = {
    overview: "Overview",
    inventory: "Inventory management",
    sales: "Sales transactions",
    analytics: "Knowledge analysis",
    users: "User management",
  };
  if (!supabase)
    return (
      <div className="business-config">
        <p className="eyebrow">Goodstock staff</p>
        <h1>Connect Supabase to open the business app.</h1>
        <p>
          Configure the existing Supabase URL and publishable key, then apply{" "}
          <code>supabase/business-app.sql</code>.
        </p>
        <Link className="button button--dark" href="/">
          Return to storefront
        </Link>
      </div>
    );
  if (loading)
    return (
      <div className="business-config">
        <div className="skeleton-line" />
        <p>Checking your staff account…</p>
      </div>
    );
  if (!user)
    return (
      <div className="business-config">
        <p className="eyebrow">Staff workspace</p>
        <h1>Sign in to Goodstock Business.</h1>
        <p>
          Use your existing Goodstock account. An administrator must assign your
          staff role before you can access this workspace.
        </p>
        <Link className="button button--accent" href="/account">
          Sign in or create account
        </Link>
        <Link className="quiet-link" href="/">
          Back to the hardware store <ArrowLeft size={16} />
        </Link>
      </div>
    );
  if (!staff)
    return (
      <div className="business-config">
        <p className="eyebrow">Access not assigned</p>
        <h1>Your account is not a staff account.</h1>
        <p>
          Signed in as <strong>{user.email}</strong>. Ask a Goodstock
          administrator to assign your role from User management.
        </p>
        {authError && <p className="business-notice">{authError}</p>}
        <button className="button button--dark" onClick={() => void signOut()}>
          <LogOut size={16} /> Sign out
        </button>
        <Link className="quiet-link" href="/">
          Back to storefront <ArrowLeft size={16} />
        </Link>
      </div>
    );
  if (!authorized)
    return (
      <div className="business-config">
        <p className="eyebrow">Role-restricted screen</p>
        <h1>This screen isn’t available for your role.</h1>
        <p>
          Your access level is <strong>{roleNames[staff.role]}</strong>. Use the
          workspace menu for your available tools.
        </p>
        <Link className="button button--dark" href="/business">
          Open overview
        </Link>
      </div>
    );
  const csvRows = parseDataset();
  const shownRows = csvRows.slice(datasetPage * 15, datasetPage * 15 + 15);
  return (
    <div className="business-shell">
      <aside className="business-sidebar">
        <Link className="business-brand" href="/business">
          <img src="/brand-mark.svg" alt="" />
          <span>
            goodstock<small>business workspace</small>
          </span>
        </Link>
        <div className="business-sidebar__label">Workspace</div>
        <nav>
          {roleLinks
            .filter(item => item.roles.includes(staff.role as never))
            .map(item => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={location === item.href ? "is-active" : ""}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
        </nav>
        <div className="business-sidebar__bottom">
          <Link href="/" className="business-side-back">
            <ArrowLeft size={16} /> Back to storefront
          </Link>
          <div className="business-user">
            <span className="business-avatar">
              {(user.email ?? "G").slice(0, 1).toUpperCase()}
            </span>
            <span>
              <strong>{user.email}</strong>
              <small>{roleNames[staff.role]}</small>
            </span>
          </div>
          <button className="business-signout" onClick={() => void signOut()}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>
      <main className="business-main">
        <header className="business-topbar">
          <div>
            <span className="business-topbar__kicker">
              GOODSTOCK HARDWARE · STAFF PORTAL
            </span>
            <h1>{pageTitles[page]}</h1>
          </div>
          <span className="business-role-pill">
            <Shield size={14} />
            {roleNames[staff.role]}
          </span>
        </header>
        {authError && (
          <div className="business-banner" role="alert">
            {authError}
            <button
              onClick={() => {
                setAuthError("");
                if (page === "overview") void refreshDashboard();
              }}
            >
              Dismiss
            </button>
          </div>
        )}
        {notice && (
          <div
            className="business-banner business-banner--notice"
            role="status"
          >
            {notice}
            <button onClick={() => setNotice("")}>Dismiss</button>
          </div>
        )}
        <div className="business-content" data-role={staff.role}>
          {page === "overview" && (
            <Overview
              dashboard={dashboard}
              staff={staff}
              onRetry={() => void refreshDashboard()}
            />
          )}
          {page === "inventory" && (
            <Inventory
              products={products}
              canEdit={
                staff.role === "inventory_clerk" || staff.role === "admin"
              }
              canArchive={staff.role === "admin"}
              showArchived={showArchived}
              setShowArchived={value => {
                setShowProductForm(false);
                setShowArchived(value);
              }}
              showForm={showProductForm}
              setShowForm={setShowProductForm}
              form={inventoryForm}
              setForm={setInventoryForm}
              onSubmit={addProduct}
              onAdjust={adjustInventory}
              onSetActive={setProductActive}
              busy={busy}
            />
          )}
          {page === "sales" && (
            <Sales
              products={products}
              sales={sales}
              cart={cart}
              setCart={setCart}
              onCheckout={checkout}
              busy={busy}
            />
          )}
          {page === "analytics" && (
            <Analytics
              staff={staff}
              products={products}
              input={analyticsInput}
              setInput={setAnalyticsInput}
              forecast={forecast}
              onPredict={predict}
              onTrain={train}
              busy={busy}
              models={modelArtifacts}
              metrics={metrics}
              datasetPage={datasetPage}
              setDatasetPage={setDatasetPage}
              rows={shownRows}
              totalRows={csvRows.length}
              csv={datasetCsvSource()}
            />
          )}
          {page === "users" && (
            <UsersPanel
              rows={staffRows}
              email={staffEmail}
              setEmail={setStaffEmail}
              role={staffRole}
              setRole={setStaffRole}
              onAssign={assignRole}
              onRevoke={revokeRole}
              busy={busy}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
  action,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="business-section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {body && <p>{body}</p>}
      </div>
      {action}
    </div>
  );
}
function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: any;
}) {
  return (
    <article className="business-stat">
      <span className="business-stat__icon">
        <Icon size={18} />
      </span>
      <span className="business-stat__label">{label}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </article>
  );
}
function Overview({
  dashboard,
  staff,
  onRetry,
}: {
  dashboard: any;
  staff: Staff;
  onRetry: () => void;
}) {
  if (!dashboard)
    return (
      <div className="business-card business-empty">
        <div className="skeleton-line" />
        <p>Loading business overview…</p>
        <button className="button button--dark" onClick={onRetry}>
          Refresh
        </button>
      </div>
    );
  const canViewSales = staff.role !== "inventory_clerk";
  const demoValueSummary = (
    (dashboard.storefront_demo_value_by_currency ?? []) as {
      currency_code: string;
      total: number | string;
    }[]
  )
    .map(value => `${money(value.total, value.currency_code)} unpaid`)
    .join(" · ");
  const recentDemoOrders = (dashboard.recent_storefront_demo_orders ?? []) as {
    id: string;
    status: string;
    total: number | string;
    currency_code: string;
    created_at: string;
  }[];
  const cards = [
    {
      label: "Active products",
      value: String(dashboard.product_count ?? 0),
      sub: "Shared with the storefront",
      icon: Package,
    },
    {
      label: "Units in stock",
      value: Number(dashboard.stock_units ?? 0).toLocaleString(),
      sub: "Current sellable inventory",
      icon: Box,
    },
    {
      label: "Low-stock alerts",
      value: String(dashboard.low_stock_count ?? 0),
      sub: "At or below reorder level",
      icon: Warehouse,
    },
    ...(canViewSales
      ? [
          {
            label: "Sales revenue",
            value: money(dashboard.revenue ?? 0),
            sub: `${dashboard.sales_count ?? 0} completed employee sales`,
            icon: BarChart3,
          },
          {
            label: "Storefront demo orders",
            value: String(dashboard.storefront_demo_order_count ?? 0),
            sub: demoValueSummary || "Unpaid demo checkouts",
            icon: ShoppingCart,
          },
        ]
      : []),
  ];
  const chartRows = ((dashboard.recent_sales ?? []) as any[])
    .slice()
    .reverse()
    .map(s => ({
      label: new Date(s.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      revenue: Number(s.total),
    }));
  return (
    <>
      <div className="business-stats">
        {cards.map(c => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>
      <div className="business-columns">
        <section className="business-card">
          <SectionHeading
            eyebrow="Needs attention"
            title="Reorder watch"
            body="Products at or below their configured reorder level."
          />
          <div className="business-list">
            {(dashboard.low_stock ?? []).length ? (
              (dashboard.low_stock as any[]).map(p => (
                <div className="business-list-row" key={p.id}>
                  <span className="business-mini-icon">
                    <Package size={16} />
                  </span>
                  <div>
                    <strong>{p.title}</strong>
                    <small>
                      Reorder at {p.reorder_level} · SKU {p.sku ?? "—"}
                    </small>
                  </div>
                  <span className="business-stock-alert">
                    {p.inventory} left
                  </span>
                </div>
              ))
            ) : (
              <p className="business-muted">
                All active products are above reorder level.
              </p>
            )}
          </div>
        </section>
        <section className="business-card">
          <SectionHeading
            eyebrow="Latest activity"
            title="Recent transactions"
            body="Completed employee sales."
          />
          <div className="business-list">
            {(dashboard.recent_sales ?? []).length ? (
              (dashboard.recent_sales as any[]).map(s => (
                <div className="business-list-row" key={s.id}>
                  <span className="business-mini-icon">
                    <ClipboardList size={16} />
                  </span>
                  <div>
                    <strong>{s.receipt_number}</strong>
                    <small>{new Date(s.created_at).toLocaleString()}</small>
                  </div>
                  <b>{money(s.total, s.currency_code)}</b>
                </div>
              ))
            ) : (
              <p className="business-muted">
                No business sales have been recorded.
              </p>
            )}
          </div>
        </section>
      </div>
      {canViewSales && (
        <section className="business-card">
          <SectionHeading
            eyebrow="Storefront activity"
            title="Recent demo orders"
            body="Unpaid storefront checkouts; their value is tracked separately from employee sales revenue."
          />
          <div className="business-list">
            {recentDemoOrders.length ? (
              recentDemoOrders.map(order => (
                <div className="business-list-row" key={order.id}>
                  <span className="business-mini-icon">
                    <ShoppingCart size={16} />
                  </span>
                  <div>
                    <strong>Demo order #{order.id.slice(0, 8).toUpperCase()}</strong>
                    <small>
                      {new Date(order.created_at).toLocaleString()} · {order.status}
                    </small>
                  </div>
                  <b>{money(order.total, order.currency_code)}</b>
                </div>
              ))
            ) : (
              <p className="business-muted">No storefront demo orders yet.</p>
            )}
          </div>
        </section>
      )}
      <section className="business-card business-chart">
        <SectionHeading
          eyebrow="Sales performance"
          title="Recent transaction totals"
          body="Latest six completed employee sales, shown oldest to newest."
        />
        <div className="business-chart__canvas">
          {chartRows.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartRows}
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e1e4dc"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#6d786f" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "#6d786f" }}
                  axisLine={false}
                  tickLine={false}
                  width={54}
                />
                <Tooltip
                  formatter={value => money(Number(value))}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #d9ddd4",
                    fontSize: 11,
                  }}
                />
                <Bar
                  dataKey="revenue"
                  name="Sale total"
                  fill="#b84d27"
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="business-muted">
              Complete a sale to see the revenue chart.
            </p>
          )}
        </div>
      </section>
      <div className="business-note">
        <Shield size={16} />
        <span>
          Signed in as <strong>{roleNames[staff.role]}</strong>. Inventory and
          sales are shared with the Goodstock storefront.
        </span>
      </div>
    </>
  );
}
function Inventory({
  products,
  canEdit,
  canArchive,
  showArchived,
  setShowArchived,
  showForm,
  setShowForm,
  form,
  setForm,
  onSubmit,
  onAdjust,
  onSetActive,
  busy,
}: {
  products: Product[];
  canEdit: boolean;
  canArchive: boolean;
  showArchived: boolean;
  setShowArchived: (value: boolean) => void;
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  form: any;
  setForm: (v: any) => void;
  onSubmit: (e: FormEvent) => void;
  onAdjust: (p: Product, d: number) => void;
  onSetActive: (p: Product, isActive: boolean) => void;
  busy: boolean;
}) {
  return (
    <>
      <SectionHeading
        eyebrow="Product catalog"
        title={showArchived ? "Archived products" : "Manage shared stock"}
        body={
          showArchived
            ? "Archived products are hidden from the storefront. Restore one to make it available again."
            : "Changes here update availability in the customer storefront."
        }
        action={
          canEdit &&
          !showArchived && (
            <button
              className="button button--accent"
              onClick={() => setShowForm(!showForm)}
            >
              <Plus size={16} />
              {showForm ? "Close form" : "Add product"}
            </button>
          )
        }
      />
      {canArchive && (
        <div className="business-archive-toolbar">
          <span>
            {showArchived
              ? "Viewing archived products"
              : "Need to remove a product from the shop? Archive it safely."}
          </span>
          <button
            type="button"
            className="business-archive-toggle"
            aria-pressed={showArchived}
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? "View active products" : "View archived products"}
          </button>
        </div>
      )}
      {showForm && !showArchived && (
        <form className="business-form business-card" onSubmit={onSubmit}>
          <label>
            SKU
            <Input
              required
              minLength={2}
              value={form.sku}
              onChange={e => setForm({ ...form, sku: e.target.value })}
            />
          </label>
          <label>
            Product name
            <Input
              required
              minLength={2}
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label>
            Category
            <select
              value={form.product_type}
              onChange={e => setForm({ ...form, product_type: e.target.value })}
            >
              <option>Fasteners</option>
              <option>Tools</option>
              <option>Power &amp; Electrical</option>
              <option>Plumbing</option>
              <option>Paint &amp; Supplies</option>
              <option>Other</option>
            </select>
          </label>
          <label>
            Unit price (PHP)
            <Input
              required
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={e => setForm({ ...form, price: e.target.value })}
            />
          </label>
          <label>
            Opening stock
            <Input
              required
              type="number"
              min="0"
              step="1"
              value={form.inventory}
              onChange={e => setForm({ ...form, inventory: e.target.value })}
            />
          </label>
          <label>
            Reorder level
            <Input
              required
              type="number"
              min="0"
              step="1"
              value={form.reorder_level}
              onChange={e =>
                setForm({ ...form, reorder_level: e.target.value })
              }
            />
          </label>
          <button className="button button--accent" disabled={busy}>
            Save product
          </button>
        </form>
      )}
      <div className="business-table-wrap business-card">
        <table className="business-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Price</th>
              <th>In stock</th>
              <th>Reorder at</th>
              {canEdit && !showArchived && <th>Stock adjustment</th>}
              {canArchive && <th>{showArchived ? "Restore" : "Catalog"}</th>}
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td>
                  <strong>{p.title}</strong>
                  <small>{p.product_type}</small>
                </td>
                <td>{p.sku ?? "—"}</td>
                <td>{money(p.price, p.currency_code)}</td>
                <td>
                  <span
                    className={
                      p.inventory <= p.reorder_level
                        ? "business-stock-alert"
                        : "business-stock-ok"
                    }
                  >
                    {p.inventory}
                  </span>
                </td>
                <td>{p.reorder_level}</td>
                {canEdit && !showArchived && (
                  <td>
                    <div className="business-adjust">
                      <button
                        aria-label={`Remove one ${p.title}`}
                        onClick={() => onAdjust(p, -1)}
                        disabled={p.inventory <= 0}
                      >
                        −
                      </button>
                      <button
                        aria-label={`Add one ${p.title}`}
                        onClick={() => onAdjust(p, 1)}
                      >
                        +
                      </button>
                    </div>
                  </td>
                )}
                {canArchive && (
                  <td>
                    <button
                      type="button"
                      className={`business-product-state-action${showArchived ? " is-restore" : ""}`}
                      onClick={() => onSetActive(p, showArchived)}
                      disabled={busy}
                    >
                      {showArchived ? "Restore" : "Archive"}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!products.length && (
          <p className="business-muted">
            {showArchived
              ? "No archived products were found."
              : "No active products were found."}
          </p>
        )}
      </div>
    </>
  );
}
function Sales({
  products,
  sales,
  cart,
  setCart,
  onCheckout,
  busy,
}: {
  products: Product[];
  sales: Sale[];
  cart: Record<string, number>;
  setCart: (v: Record<string, number>) => void;
  onCheckout: () => void;
  busy: boolean;
}) {
  const selected = products.filter(p => (cart[p.id] ?? 0) > 0);
  const total = selected.reduce(
    (s, p) => s + Number(p.price) * (cart[p.id] ?? 0),
    0
  );
  const change = (id: string, qty: number) =>
    setCart({ ...cart, [id]: Math.max(0, qty) });
  return (
    <>
      <SectionHeading
        eyebrow="Point of sale"
        title="Record a sale"
        body="Prices and availability are verified against current stock in the database."
      />
      <div className="business-columns business-sales-columns">
        <section className="business-card">
          <h3 className="business-subhead">Available products</h3>
          <div className="business-list">
            {products
              .filter(p => p.inventory > 0)
              .map(p => (
                <div className="business-list-row" key={p.id}>
                  <div>
                    <strong>{p.title}</strong>
                    <small>
                      {money(p.price, p.currency_code)} · {p.inventory}{" "}
                      available
                    </small>
                  </div>
                  <div className="business-adjust">
                    <button
                      onClick={() => change(p.id, (cart[p.id] ?? 0) - 1)}
                      disabled={!cart[p.id]}
                    >
                      −
                    </button>
                    <span>{cart[p.id] ?? 0}</span>
                    <button
                      onClick={() => change(p.id, (cart[p.id] ?? 0) + 1)}
                      disabled={(cart[p.id] ?? 0) >= p.inventory}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </section>
        <aside className="business-card business-cart">
          <h3 className="business-subhead">Current sale</h3>
          {selected.length ? (
            selected.map(p => (
              <div className="business-sale-line" key={p.id}>
                <span>
                  {p.title} × {cart[p.id]}
                </span>
                <strong>
                  {money(Number(p.price) * (cart[p.id] ?? 0), p.currency_code)}
                </strong>
              </div>
            ))
          ) : (
            <p className="business-muted">
              Add available products to start a sale.
            </p>
          )}
          <div className="business-sale-total">
            <span>Total</span>
            <strong>{money(total)}</strong>
          </div>
          <button
            className="button button--accent"
            disabled={!selected.length || busy}
            onClick={onCheckout}
          >
            {busy ? "Saving sale…" : "Complete sale"}
          </button>
          <small>
            Checkout updates stock atomically. No payment details are collected.
          </small>
        </aside>
      </div>
      <section className="business-card business-history">
        <SectionHeading
          eyebrow="Audit trail"
          title="Recent sales"
          body="Latest 100 completed and voided transactions."
        />
        <div className="business-table-wrap">
          <table className="business-table">
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Date &amp; time</th>
                <th>Status</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {sales.map(s => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.receipt_number}</strong>
                  </td>
                  <td>{new Date(s.created_at).toLocaleString()}</td>
                  <td>
                    <span className="business-status">{s.status}</span>
                  </td>
                  <td>{money(s.total, s.currency_code)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
function Analytics({
  staff,
  products,
  input,
  setInput,
  forecast,
  onPredict,
  onTrain,
  busy,
  models,
  metrics,
  datasetPage,
  setDatasetPage,
  rows,
  totalRows,
  csv,
}: {
  staff: Staff;
  products: Product[];
  input: any;
  setInput: (v: any) => void;
  forecast: any[];
  onPredict: (e: FormEvent) => void;
  onTrain: () => void;
  busy: boolean;
  models: any[];
  metrics: any;
  datasetPage: number;
  setDatasetPage: (p: number) => void;
  rows: ReturnType<typeof parseDataset>;
  totalRows: number;
  csv: string;
}) {
  const previewCount = 15;
  const hasModel = (kind: string) => models.some(m => m.model_type === kind);
  return (
    <>
      <SectionHeading
        eyebrow="Demand forecasting"
        title="Knowledge analysis & prediction"
        body="Estimate the next month’s product demand with two saved regression models."
      />
      {staff.role === "instructor" && (
        <div className="business-model-grid">
          {(["linear_regression", "random_forest"] as const).map(kind => (
            <article className="business-model-card" key={kind}>
              <span className="business-model-icon">
                <Activity size={19} />
              </span>
              <small>
                {kind === "linear_regression" ? "MODEL 01" : "MODEL 02"}
              </small>
              <h3>
                {kind === "linear_regression"
                  ? "Simple Linear Regression"
                  : "Random Forest Regression"}
              </h3>
              <p>{modelDescriptions[kind]}</p>
              <span
                className={
                  hasModel(kind)
                    ? "business-model-status"
                    : "business-model-status is-empty"
                }
              >
                {hasModel(kind)
                  ? `Saved · v${models.find(m => m.model_type === kind)?.version}`
                  : "Not trained yet"}
              </span>
            </article>
          ))}
        </div>
      )}
      {staff.role === "instructor" && (
        <div className="business-card business-train-card">
          <div>
            <span className="eyebrow">Instructor controls</span>
            <h3>Train and save model versions</h3>
            <p>
              Uses 960 training records and a chronological 240-record holdout
              set. The artifacts and evaluation metrics are saved to Supabase.
            </p>
          </div>
          <button
            className="button button--dark"
            onClick={onTrain}
            disabled={busy}
          >
            <Activity size={16} />
            {busy ? "Training models…" : "Train & save both models"}
          </button>
        </div>
      )}
      <div className="business-columns business-analytics-columns">
        <form
          className="business-card business-predict-form"
          onSubmit={onPredict}
        >
          <span className="eyebrow">Forecast inputs</span>
          <h3>Predict monthly demand</h3>
          <label>
            Product
            <select
              value={input.productId}
              onChange={e => {
                const p = products.find(x => x.id === e.target.value);
                setInput({
                  ...input,
                  productId: e.target.value,
                  ...(p ? { unitPrice: Number(p.price) } : {}),
                });
              }}
            >
              {products.length ? (
                products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))
              ) : (
                <option value="HW-001">Example product</option>
              )}
            </select>
          </label>
          <label>
            Unit price (PHP)
            <input
              type="number"
              min="0"
              step="0.01"
              value={input.unitPrice}
              onChange={e =>
                setInput({ ...input, unitPrice: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Seasonality index (0–3)
            <input
              type="number"
              min="0"
              max="3"
              step="0.01"
              value={input.seasonality}
              onChange={e =>
                setInput({ ...input, seasonality: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Previous-month demand (units)
            <input
              type="number"
              min="0"
              step="1"
              value={input.previousDemand}
              onChange={e =>
                setInput({ ...input, previousDemand: Number(e.target.value) })
              }
            />
          </label>
          <label className="business-check">
            <input
              type="checkbox"
              checked={input.promotion}
              onChange={e =>
                setInput({ ...input, promotion: e.target.checked })
              }
            />{" "}
            Planned promotion
          </label>
          <button className="button button--accent" disabled={busy}>
            {busy ? "Calculating…" : "Generate prediction"}
          </button>
        </form>
        <section className="business-card business-results">
          <span className="eyebrow">Prediction output</span>
          <h3>Demand, sales &amp; product velocity</h3>
          {forecast.length ? (
            forecast.map(f => (
              <div className="business-forecast" key={f.model}>
                <div>
                  <small>
                    {f.model === "linear_regression"
                      ? "Simple Linear Regression"
                      : "Random Forest Regression"}
                  </small>
                  <strong>
                    {f.predictedUnits.toLocaleString()}{" "}
                    <span>units / month</span>
                  </strong>
                  <span className="business-forecast__revenue">
                    Expected sales: {money(f.expectedRevenue)}
                  </span>
                  <span className="business-model-status">
                    {f.velocityLabel}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="business-forecast-empty">
              <BarChart3 size={24} />
              <p>
                Enter product conditions to compare the saved model predictions.
              </p>
            </div>
          )}
        </section>
      </div>
      {staff.role === "instructor" && (
        <>
          <section className="business-card business-metrics">
            <SectionHeading
              eyebrow="Held-out evaluation"
              title="Model quality metrics"
              body={`${totalRows.toLocaleString()} synthetic-but-deterministic monthly product records · 80/20 chronological split`}
            />
            <div className="business-table-wrap">
              <table className="business-table">
                <thead>
                  <tr>
                    <th>Model version</th>
                    <th>MAE ↓</th>
                    <th>RMSE ↓</th>
                    <th>R² ↑</th>
                    <th>Train / test</th>
                  </tr>
                </thead>
                <tbody>
                  {(metrics ?? []).map((m: any) => (
                    <tr key={`${m.model_type}-${m.version}`}>
                      <td>
                        <strong>
                          {m.model_type === "linear_regression"
                            ? "Simple Linear Regression"
                            : "Random Forest Regression"}
                        </strong>
                        <small>Version {m.version}</small>
                      </td>
                      <td>
                        {Number((m.metrics as Evaluation).mae).toFixed(2)} units
                      </td>
                      <td>
                        {Number((m.metrics as Evaluation).rmse).toFixed(2)}{" "}
                        units
                      </td>
                      <td>{Number((m.metrics as Evaluation).r2).toFixed(3)}</td>
                      <td>
                        {(m.metrics as Evaluation).trainRows} /{" "}
                        {(m.metrics as Evaluation).testRows}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!metrics?.length && (
                <p className="business-muted">
                  Train the models to calculate evaluation metrics.
                </p>
              )}
            </div>
            <div className="business-metric-defs">
              {Object.entries(metricDescriptions).map(([key, text]) => (
                <p key={key}>
                  <strong>{key.toUpperCase()}.</strong> {text}
                </p>
              ))}
            </div>
          </section>
          <section className="business-card business-dataset">
            <SectionHeading
              eyebrow="Instructor data access"
              title="Demand dataset preview"
              body={`${totalRows.toLocaleString()} rows in the CSV dataset · showing ${datasetPage * previewCount + 1}–${Math.min((datasetPage + 1) * previewCount, totalRows)}`}
            />
            <div className="business-table-wrap">
              <table className="business-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Promotion</th>
                    <th>Season</th>
                    <th>Previous</th>
                    <th>Demand</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={`${r.product_id}-${r.date}-${i}`}>
                      <td>{r.date}</td>
                      <td>{r.product_name}</td>
                      <td>{money(r.unit_price)}</td>
                      <td>{r.promotion ? "Yes" : "No"}</td>
                      <td>{r.seasonality.toFixed(2)}</td>
                      <td>{r.previous_month_demand}</td>
                      <td>{r.demand_units}</td>
                      <td>{money(r.sales_revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="business-pager">
              <button
                className="button button--dark"
                onClick={() => setDatasetPage(Math.max(0, datasetPage - 1))}
                disabled={datasetPage === 0}
              >
                Previous
              </button>
              <span>
                Page {datasetPage + 1} of {Math.ceil(totalRows / previewCount)}
              </span>
              <button
                className="button button--dark"
                onClick={() =>
                  setDatasetPage(
                    Math.min(
                      Math.ceil(totalRows / previewCount) - 1,
                      datasetPage + 1
                    )
                  )
                }
                disabled={(datasetPage + 1) * previewCount >= totalRows}
              >
                Next
              </button>
              <a
                className="business-download"
                href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
                download="demand-sales-1200.csv"
              >
                <Database size={14} /> Download CSV
              </a>
            </div>
          </section>
        </>
      )}
    </>
  );
}
function UsersPanel({
  rows,
  email,
  setEmail,
  role,
  setRole,
  onAssign,
  onRevoke,
  busy,
}: {
  rows: any[];
  email: string;
  setEmail: (v: string) => void;
  role: Role;
  setRole: (v: Role) => void;
  onAssign: (e: FormEvent) => void;
  onRevoke: (e: string) => void;
  busy: boolean;
}) {
  return (
    <>
      <SectionHeading
        eyebrow="Access control"
        title="Manage staff roles"
        body="Assign a role to an existing Goodstock account by its sign-in email."
      />
      <form
        className="business-card business-form business-role-form"
        onSubmit={onAssign}
      >
        <label>
          Existing account email
          <Input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="person@example.com"
          />
        </label>
        <label>
          Staff role
          <select value={role} onChange={e => setRole(e.target.value as Role)}>
            {roleOptions.map(r => (
              <option value={r} key={r}>
                {roleNames[r]}
              </option>
            ))}
          </select>
        </label>
        <button className="button button--accent" disabled={busy}>
          <Users size={16} />
          Assign role
        </button>
        <p>
          The user must first register through the existing account screen. Role
          changes are enforced by Supabase row-level security.
        </p>
      </form>
      <div className="business-card business-table-wrap">
        <table className="business-table">
          <thead>
            <tr>
              <th>Staff account</th>
              <th>Current role</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.user_id}>
                <td>
                  <strong>{r.email}</strong>
                  <small>{r.display_name || r.user_id}</small>
                </td>
                <td>{roleNames[r.role as Role] ?? r.role}</td>
                <td>
                  <button
                    className="business-remove"
                    onClick={() => void onRevoke(r.email)}
                    disabled={busy}
                  >
                    Revoke access
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p className="business-muted">No staff accounts are assigned yet.</p>
        )}
      </div>
    </>
  );
}
