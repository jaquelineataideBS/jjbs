export const hairSizes = ["P", "M", "G", "EX"] as const;

export type HairSize = (typeof hairSizes)[number];
export type HairSizePrices = Partial<Record<HairSize, number | null>>;

export function isHairSize(value: unknown): value is HairSize {
  return typeof value === "string" && hairSizes.some((size) => size === value);
}

export function priceForHairSize(prices: HairSizePrices | null | undefined, size: HairSize, fallback: number | null) {
  return prices && Object.hasOwn(prices, size) ? prices[size] ?? null : fallback;
}
