import { AnimatePresence, motion } from "framer-motion";
import { Check, LoaderCircle, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function AddToCartButton({ variantId, productName, quantity = 1, disabled = false }: { variantId?: string; productName: string; quantity?: number; disabled?: boolean }) {
  const utils = trpc.useUtils();
  const [justAdded, setJustAdded] = useState(false);
  const addToCart = trpc.storefront.cart.add.useMutation({
    onSuccess: async () => {
      await utils.storefront.cart.get.invalidate();
      setJustAdded(true);
      toast.success(`${productName} added to your cart.`);
      window.setTimeout(() => setJustAdded(false), 1600);
    },
    onError: error => toast.error(error.message || "That item could not be added. Try again."),
  });
  const pending = addToCart.isPending;

  return (
    <motion.button
      className="button button--accent button--add-to-cart"
      type="button"
      disabled={disabled || !variantId || pending}
      whileTap={disabled || pending ? undefined : { scale: 0.98 }}
      onClick={() => variantId && addToCart.mutate({ merchandiseId: variantId, quantity })}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={pending ? "loading" : justAdded ? "added" : "ready"} className="button__inner" initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -6, opacity: 0 }} transition={{ duration: 0.14 }}>
          {pending ? <><LoaderCircle size={18} className="spin" aria-hidden="true" /> Adding</> : justAdded ? <><Check size={18} aria-hidden="true" /> Added</> : <><ShoppingBag size={18} aria-hidden="true" /> Add to cart</>}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
