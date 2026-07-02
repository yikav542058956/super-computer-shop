import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

export function formatINR(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return "₹0";
  return INR.format(amount);
}

function strHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return Math.abs(h);
}

export function fakeRating(productId: string, realRating?: number): number {
  if (realRating && realRating > 0) return realRating;
  const h = strHash(productId || "default");
  const ratings = [4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8];
  return ratings[h % ratings.length];
}

export function fakeReviewCount(productId: string, realCount?: number): number {
  if (realCount && realCount > 0) return realCount;
  const h = strHash(productId || "default");
  return 18 + (h % 230);
}
