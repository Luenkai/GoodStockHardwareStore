export function calculateMarkup(sellingPrice: number, supplierCost: number) {
  const selling = Number.isFinite(sellingPrice) ? sellingPrice : 0;
  const cost = Number.isFinite(supplierCost) ? supplierCost : 0;
  const amount = Math.round((selling - cost) * 100) / 100;
  return {
    amount,
    percentage: cost > 0 ? Math.round((amount / cost) * 10000) / 100 : null,
  };
}

export function suggestedReplenishment(maxStock: number, currentStock: number) {
  if (!Number.isFinite(maxStock) || !Number.isFinite(currentStock)) return 0;
  return Math.max(0, Math.floor(maxStock) - Math.max(0, Math.floor(currentStock)));
}
