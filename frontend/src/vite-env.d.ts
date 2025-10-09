/// <reference types="vite/client" />

declare interface Window {
  braintree: any;
}

// Vite image import types - specific patterns with AVIF support
declare module "~/media/hero.png?format=avif&quality=85&url" {
  const src: string;
  export default src;
}

declare module "~/media/hero.png?format=webp&quality=85&url" {
  const src: string;
  export default src;
}

declare module "~/media/hero.png?format=jpeg&quality=95&url" {
  const src: string;
  export default src;
}

declare module "~/media/2.png?format=avif&quality=85&url" {
  const src: string;
  export default src;
}

declare module "~/media/2.png?format=webp&quality=85&url" {
  const src: string;
  export default src;
}

declare module "~/media/2.png?format=jpeg&quality=95&url" {
  const src: string;
  export default src;
}

declare module "~/media/homelast.png?format=avif&quality=85&url" {
  const src: string;
  export default src;
}

declare module "~/media/homelast.png?format=webp&quality=85&url" {
  const src: string;
  export default src;
}

declare module "~/media/homelast.png?format=jpeg&quality=95&url" {
  const src: string;
  export default src;
}

// Legacy WebP declarations
declare module "~/media/hero.png?format=webp&url" {
  const src: string;
  export default src;
}

declare module "~/media/slider1.png?format=webp&url" {
  const src: string;
  export default src;
}

declare module "~/media/slider2.png?format=webp&url" {
  const src: string;
  export default src;
}

declare module "~/media/slider 3.jpg?format=webp&url" {
  const src: string;
  export default src;
}

declare module "~/media/2.png?format=webp&url" {
  const src: string;
  export default src;
}

declare module "~/media/homelast.png?format=webp&url" {
  const src: string;
  export default src;
}

// Shop image optimized formats - multiple sizes and qualities
declare module "~/media/shop.jpg?format=avif&width=800&quality=85&url" { const src: string; export default src; }
declare module "~/media/shop.jpg?format=webp&width=800&quality=85&url" { const src: string; export default src; }

// Shop image with quality=80 (used in index.tsx)
declare module "~/media/shop.jpg?format=avif&width=800&quality=80" { const src: string; export default src; }
declare module "~/media/shop.jpg?format=avif&width=1200&quality=80" { const src: string; export default src; }
declare module "~/media/shop.jpg?format=webp&width=800&quality=80" { const src: string; export default src; }
declare module "~/media/shop.jpg?format=webp&width=1200&quality=80" { const src: string; export default src; }

// Pattern background image optimized formats
declare module "~/media/pattern.jpg?format=avif&quality=85&url" { const src: string; export default src; }
declare module "~/media/pattern.jpg?format=webp&quality=85&url" { const src: string; export default src; }

// Generic patterns for future images
declare module "*.png?*&format=webp&url" {
  const src: string;
  export default src;
}

declare module "*.jpg?*&format=webp&url" {
  const src: string;
  export default src;
}

declare module "*.jpeg?*&format=webp&url" {
  const src: string;
  export default src;
}

declare module "*.webp?*&format=webp&url" {
  const src: string;
  export default src;
}

// AVIF format declarations
declare module "*.png?format=avif&*" {
  const src: string;
  export default src;
}

declare module "*.jpg?format=avif&*" {
  const src: string;
  export default src;
}

declare module "*.jpeg?format=avif&*" {
  const src: string;
  export default src;
}

// WebP with quality declarations
declare module "*.png?format=webp&*" {
  const src: string;
  export default src;
}

declare module "*.jpg?format=webp&*" {
  const src: string;
  export default src;
}

declare module "*.jpeg?format=webp&*" {
  const src: string;
  export default src;
}

// JPEG with quality declarations
declare module "*.png?format=jpeg&*" {
  const src: string;
  export default src;
}

declare module "*.jpg?format=jpeg&*" {
  const src: string;
  export default src;
}

declare module "*.jpeg?format=jpeg&*" {
  const src: string;
  export default src;
}

// Responsive image variants for hero.png

declare module "~/media/hero.png?format=avif&width=480&quality=85&url" { const src: string; export default src; }
declare module "~/media/hero.png?format=avif&width=768&quality=85&url" { const src: string; export default src; }
declare module "~/media/hero.png?format=avif&width=1024&quality=85&url" { const src: string; export default src; }
declare module "~/media/hero.png?format=avif&width=1600&quality=85&url" { const src: string; export default src; }
declare module "~/media/hero.png?format=avif&width=2000&quality=85&url" { const src: string; export default src; }

declare module "~/media/hero.png?format=webp&width=480&quality=85&url" { const src: string; export default src; }
declare module "~/media/hero.png?format=webp&width=768&quality=85&url" { const src: string; export default src; }
declare module "~/media/hero.png?format=webp&width=1024&quality=85&url" { const src: string; export default src; }
declare module "~/media/hero.png?format=webp&width=1600&quality=85&url" { const src: string; export default src; }
declare module "~/media/hero.png?format=webp&width=2000&quality=85&url" { const src: string; export default src; }

declare module "~/media/hero.png?format=jpeg&width=480&quality=95&url" { const src: string; export default src; }
declare module "~/media/hero.png?format=jpeg&width=768&quality=95&url" { const src: string; export default src; }
declare module "~/media/hero.png?format=jpeg&width=1024&quality=95&url" { const src: string; export default src; }
declare module "~/media/hero.png?format=jpeg&width=1600&quality=95&url" { const src: string; export default src; }
declare module "~/media/hero.png?format=jpeg&width=2000&quality=95&url" { const src: string; export default src; }

// Responsive image variants for 2.png

declare module "~/media/2.png?format=avif&width=480&quality=85&url" { const src: string; export default src; }
declare module "~/media/2.png?format=avif&width=768&quality=85&url" { const src: string; export default src; }
declare module "~/media/2.png?format=avif&width=1024&quality=85&url" { const src: string; export default src; }
declare module "~/media/2.png?format=avif&width=1600&quality=85&url" { const src: string; export default src; }
declare module "~/media/2.png?format=avif&width=2000&quality=85&url" { const src: string; export default src; }

declare module "~/media/2.png?format=webp&width=480&quality=85&url" { const src: string; export default src; }
declare module "~/media/2.png?format=webp&width=768&quality=85&url" { const src: string; export default src; }
declare module "~/media/2.png?format=webp&width=1024&quality=85&url" { const src: string; export default src; }
declare module "~/media/2.png?format=webp&width=1600&quality=85&url" { const src: string; export default src; }
declare module "~/media/2.png?format=webp&width=2000&quality=85&url" { const src: string; export default src; }

declare module "~/media/2.png?format=jpeg&width=480&quality=95&url" { const src: string; export default src; }
declare module "~/media/2.png?format=jpeg&width=768&quality=95&url" { const src: string; export default src; }
declare module "~/media/2.png?format=jpeg&width=1024&quality=95&url" { const src: string; export default src; }
declare module "~/media/2.png?format=jpeg&width=1600&quality=95&url" { const src: string; export default src; }
declare module "~/media/2.png?format=jpeg&width=2000&quality=95&url" { const src: string; export default src; }

// Responsive image variants for homelast.png

declare module "~/media/homelast.png?format=avif&width=480&quality=85&url" { const src: string; export default src; }
declare module "~/media/homelast.png?format=avif&width=768&quality=85&url" { const src: string; export default src; }
declare module "~/media/homelast.png?format=avif&width=1024&quality=85&url" { const src: string; export default src; }
declare module "~/media/homelast.png?format=avif&width=1600&quality=85&url" { const src: string; export default src; }
declare module "~/media/homelast.png?format=avif&width=2000&quality=85&url" { const src: string; export default src; }

declare module "~/media/homelast.png?format=webp&width=480&quality=85&url" { const src: string; export default src; }
declare module "~/media/homelast.png?format=webp&width=768&quality=85&url" { const src: string; export default src; }
declare module "~/media/homelast.png?format=webp&width=1024&quality=85&url" { const src: string; export default src; }
declare module "~/media/homelast.png?format=webp&width=1600&quality=85&url" { const src: string; export default src; }
declare module "~/media/homelast.png?format=webp&width=2000&quality=85&url" { const src: string; export default src; }

declare module "~/media/homelast.png?format=jpeg&width=480&quality=95&url" { const src: string; export default src; }
declare module "~/media/homelast.png?format=jpeg&width=768&quality=95&url" { const src: string; export default src; }
declare module "~/media/homelast.png?format=jpeg&width=1024&quality=95&url" { const src: string; export default src; }
declare module "~/media/homelast.png?format=jpeg&width=1600&quality=95&url" { const src: string; export default src; }
declare module "~/media/homelast.png?format=jpeg&width=2000&quality=95&url" { const src: string; export default src; }
