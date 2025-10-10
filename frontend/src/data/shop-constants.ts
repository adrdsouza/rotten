/**
 * Shop Architecture - Hardcoded Data Structures
 * 
 * This file contains all hardcoded product data as specified in SHOP_ARCHITECTURE_PLAN.md
 * Replaces the complex ProductCatalog singleton with simple, maintainable constants.
 */

// Level 1: Style Selection (Hardcoded)
export const PRODUCTS = {
  shortSleeve: {
    name: "Core short sleeve shirt",
    price: 7000, // $70.00 in cents
    slug: "shortsleeveshirt",
    productId: "1"
  },
  longSleeve: {
    name: "Core long sleeve shirt", 
    price: 8000, // $80.00 in cents
    slug: "longsleeveshirt",
    productId: "3"
  }
} as const;

// Level 2: Size Selection (Hardcoded per style)
export const SIZES = [
  { code: "small", name: "Small" },
  { code: "medium", name: "Medium" }, 
  { code: "large", name: "Large" }
] as const;

// Level 3: Color Selection (Hardcoded per size)
export const COLORS = [
  { code: "midnight-black", name: "Midnight black" },
  { code: "cloud-white", name: "Cloud white" },
  { code: "storm-grey", name: "Storm grey" },
  { code: "deep-purple", name: "Deep purple" },
  { code: "blood-red", name: "Blood red" },
  { code: "electric-blue", name: "Electric Blue" },
  { code: "hot-pink", name: "Hot pink" },
  { code: "desert-yellow", name: "Desert yellow" },
  { code: "forest-green", name: "Forest green" }
] as const;

// Level 4: Variant/SKU Mapping (Hardcoded)
export const VARIANT_MAP = {
  // Short sleeve variants (IDs 1-27)
  "short-small-midnight-black": { variantId: "1", sku: "RHWQWM1880-01" },
  "short-small-cloud-white": { variantId: "2", sku: "RHWQWM1880-02" },
  "short-small-storm-grey": { variantId: "3", sku: "RHWQWM1880-03" },
  "short-small-deep-purple": { variantId: "4", sku: "RHWQWM1880-04" },
  "short-small-blood-red": { variantId: "5", sku: "RHWQWM1880-05" },
  "short-small-electric-blue": { variantId: "6", sku: "RHWQWM1880-06" },
  "short-small-hot-pink": { variantId: "7", sku: "RHWQWM1880-07" },
  "short-small-desert-yellow": { variantId: "8", sku: "RHWQWM1880-08" },
  "short-small-forest-green": { variantId: "9", sku: "RHWQWM1880-09" },
  
  "short-medium-midnight-black": { variantId: "10", sku: "RHWQWM1880-10" },
  "short-medium-cloud-white": { variantId: "11", sku: "RHWQWM1880-11" },
  "short-medium-storm-grey": { variantId: "12", sku: "RHWQWM1880-12" },
  "short-medium-deep-purple": { variantId: "13", sku: "RHWQWM1880-13" },
  "short-medium-blood-red": { variantId: "14", sku: "RHWQWM1880-14" },
  "short-medium-electric-blue": { variantId: "15", sku: "RHWQWM1880-15" },
  "short-medium-hot-pink": { variantId: "16", sku: "RHWQWM1880-16" },
  "short-medium-desert-yellow": { variantId: "17", sku: "RHWQWM1880-17" },
  "short-medium-forest-green": { variantId: "18", sku: "RHWQWM1880-18" },
  
  "short-large-midnight-black": { variantId: "19", sku: "RHWQWM1880-19" },
  "short-large-cloud-white": { variantId: "20", sku: "RHWQWM1880-20" },
  "short-large-storm-grey": { variantId: "21", sku: "RHWQWM1880-21" },
  "short-large-deep-purple": { variantId: "22", sku: "RHWQWM1880-22" },
  "short-large-blood-red": { variantId: "23", sku: "RHWQWM1880-23" },
  "short-large-electric-blue": { variantId: "24", sku: "RHWQWM1880-24" },
  "short-large-hot-pink": { variantId: "25", sku: "RHWQWM1880-25" },
  "short-large-desert-yellow": { variantId: "26", sku: "RHWQWM1880-26" },
  "short-large-forest-green": { variantId: "27", sku: "RHWQWM1880-27" },
  
  // Long sleeve variants (IDs 55-81)  
  "long-small-midnight-black": { variantId: "55", sku: "RH17HEIB70-01" },
  "long-small-cloud-white": { variantId: "56", sku: "RH17HEIB70-02" },
  "long-small-storm-grey": { variantId: "57", sku: "RH17HEIB70-03" },
  "long-small-deep-purple": { variantId: "58", sku: "RH17HEIB70-04" },
  "long-small-blood-red": { variantId: "59", sku: "RH17HEIB70-05" },
  "long-small-electric-blue": { variantId: "60", sku: "RH17HEIB70-06" },
  "long-small-hot-pink": { variantId: "61", sku: "RH17HEIB70-07" },
  "long-small-desert-yellow": { variantId: "62", sku: "RH17HEIB70-08" },
  "long-small-forest-green": { variantId: "63", sku: "RH17HEIB70-09" },
  
  "long-medium-midnight-black": { variantId: "64", sku: "RH17HEIB70-10" },
  "long-medium-cloud-white": { variantId: "65", sku: "RH17HEIB70-11" },
  "long-medium-storm-grey": { variantId: "66", sku: "RH17HEIB70-12" },
  "long-medium-deep-purple": { variantId: "67", sku: "RH17HEIB70-13" },
  "long-medium-blood-red": { variantId: "68", sku: "RH17HEIB70-14" },
  "long-medium-electric-blue": { variantId: "69", sku: "RH17HEIB70-15" },
  "long-medium-hot-pink": { variantId: "70", sku: "RH17HEIB70-16" },
  "long-medium-desert-yellow": { variantId: "71", sku: "RH17HEIB70-17" },
  "long-medium-forest-green": { variantId: "72", sku: "RH17HEIB70-18" },
  
  "long-large-midnight-black": { variantId: "73", sku: "RH17HEIB70-19" },
  "long-large-cloud-white": { variantId: "74", sku: "RH17HEIB70-20" },
  "long-large-storm-grey": { variantId: "75", sku: "RH17HEIB70-21" },
  "long-large-deep-purple": { variantId: "76", sku: "RH17HEIB70-22" },
  "long-large-blood-red": { variantId: "77", sku: "RH17HEIB70-23" },
  "long-large-electric-blue": { variantId: "78", sku: "RH17HEIB70-24" },
  "long-large-hot-pink": { variantId: "79", sku: "RH17HEIB70-25" },
  "long-large-desert-yellow": { variantId: "80", sku: "RH17HEIB70-26" },
  "long-large-forest-green": { variantId: "81", sku: "RH17HEIB70-27" }
} as const;

// Helper function to get variant ID from style, size, color
export function getVariantId(style: 'short' | 'long', size: string, color: string): string | null {
  const key = `${style}-${size}-${color}` as keyof typeof VARIANT_MAP;
  return VARIANT_MAP[key]?.variantId || null;
}

// Helper function to get SKU from style, size, color
export function getSKU(style: 'short' | 'long', size: string, color: string): string | null {
  const key = `${style}-${size}-${color}` as keyof typeof VARIANT_MAP;
  return VARIANT_MAP[key]?.sku || null;
}

// Helper function to get all variant IDs for a style
export function getStyleVariantIds(style: 'short' | 'long'): string[] {
  return Object.entries(VARIANT_MAP)
    .filter(([key]) => key.startsWith(style))
    .map(([, value]) => value.variantId);
}

// Helper function to get all variant IDs
export function getAllVariantIds(): string[] {
  return Object.values(VARIANT_MAP).map(v => v.variantId);
}

// Type definitions for better TypeScript support
export type StyleType = keyof typeof PRODUCTS;
export type SizeCode = typeof SIZES[number]['code'];
export type ColorCode = typeof COLORS[number]['code'];
export type VariantKey = keyof typeof VARIANT_MAP;
