import { AnimatePresence, motion } from "framer-motion";
import { Check, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { addToCart } from "@/lib/cart";
import type { StoreProduct } from "@/lib/storefront";

export default function AddToCartButton({ product, quantity = 1, disabled = false }: { product: StoreProduct; quantity?: number; disabled?: boolean }) {
  const [justAdded, setJustAdded] = useState(false);
  const unavailable = disabled || !product.variants.nodes[0]?.availableForSale;
  const onAdd = () => {
    if (unavailable) return;
    addToCart(product, quantity);
    setJustAdded(true);
    toast.success(`${product.title} added to your cart.`);
    window.setTimeout(() => setJustAdded(false), 1600);
  };

  return (
    <motion.button className="button button--accent button--add-to-cart" type="button" disabled={unavailable} whileTap={unavailable ? undefined : { scale: 0.98 }} onClick={onAdd}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={justAdded ? "added" : "ready"} className="button__inner" initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -6, opacity: 0 }} transition={{ duration: 0.14 }}>
          {justAdded ? <><Check size={18} aria-hidden="true" /> Added</> : <><ShoppingBag size={18} aria-hidden="true" /> Add to cart</>}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
