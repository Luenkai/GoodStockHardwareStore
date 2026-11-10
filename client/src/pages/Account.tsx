import { ArrowRight, Box, MapPin, RotateCcw } from "lucide-react";
import { Link } from "wouter";
import StoreLayout from "@/components/store/StoreLayout";
import { trpc } from "@/lib/trpc";

export default function Account() {
  const query = trpc.storefront.accountUrl.useQuery(undefined, { retry: 1, staleTime: 60_000 });
  const accountUrl = query.data;

  return (
    <StoreLayout>
      <main id="main-content" className="page-width account-page">
        <section className="account-card">
          <div className="account-card__visual" aria-hidden="true"><div className="account-card__orbit account-card__orbit--one" /><div className="account-card__orbit account-card__orbit--two" /><div className="account-card__icon"><Box size={34} strokeWidth={1.5} /></div></div>
          <div className="account-card__content">
            <p className="eyebrow">Your Goodstock account</p>
            <h1>Orders, addresses, and account details. All in one place.</h1>
            <p>Sign in or create a customer account with Shopify. Your order history, delivery details, and account recovery are handled securely by the store.</p>
            {query.isLoading ? <div className="skeleton account-skeleton" aria-label="Loading customer accounts" aria-busy="true" /> : query.isError || !accountUrl ? (
              <div className="account-error" role="alert"><p>Customer accounts are temporarily unavailable.</p><button type="button" className="quiet-link" onClick={() => void query.refetch()}>Try again</button></div>
            ) : (
              <a className="button button--accent account-cta" href={accountUrl}>Sign in or create account <ArrowRight size={18} /></a>
            )}
            <p className="account-card__note">You’ll continue to Shopify for identity verification and order management.</p>
          </div>
        </section>
        <section className="account-benefits" aria-label="Account features">
          <div><Box size={20} /><h2>Track orders</h2><p>See current order status and receipts.</p></div>
          <div><MapPin size={20} /><h2>Manage addresses</h2><p>Keep delivery details ready for next time.</p></div>
          <div><RotateCcw size={20} /><h2>Recover access</h2><p>Use Shopify’s account recovery flow.</p></div>
        </section>
        <p className="account-back"><Link href="/products">Continue shopping</Link></p>
      </main>
    </StoreLayout>
  );
}
