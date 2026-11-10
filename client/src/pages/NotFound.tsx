import { ArrowLeft, Search } from "lucide-react";
import { useEffect } from "react";
import { Link } from "wouter";
import StoreLayout from "@/components/store/StoreLayout";

const NOT_FOUND_PATH = "/404";

export default function NotFound() {
  useEffect(() => {
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);
    if (window.location.pathname.replace(/\/$/, "") !== NOT_FOUND_PATH) window.location.replace(NOT_FOUND_PATH);
    return () => robots.remove();
  }, []);

  return (
    <StoreLayout>
      <main id="main-content" className="page-width not-found-page">
        <div className="empty-state"><span className="not-found-page__code">404</span><div className="empty-state__icon"><Search size={21} /></div><h1>That page doesn’t exist.</h1><p>Try the hardware catalog or go back to the start.</p><Link className="button button--dark" href="/"><ArrowLeft size={17} /> Back to the shop</Link></div>
      </main>
    </StoreLayout>
  );
}
