# CLOUDFLARE CDN SETUP FOR DAMNEDDESIGNS.COM
# This will dramatically improve your site's global performance

## 1. SIGN UP FOR CLOUDFLARE (FREE)
- Go to https://www.cloudflare.com/
- Sign up for free account
- Add your domain: rottenhand.com

## 2. CHANGE NAMESERVERS
You'll need to change your domain's nameservers to Cloudflare's:
- Usually something like: 
  - `ava.ns.cloudflare.com`
  - `bert.ns.cloudflare.com`
- Do this in your domain registrar's control panel

## 3. CLOUDFLARE SETTINGS TO CONFIGURE

### Speed Settings:
- **Auto Minify**: Enable CSS, HTML, JavaScript
- **Brotli**: Enable
- **HTTP/2**: Enable
- **HTTP/3**: Enable
- **0-RTT Connection Resumption**: Enable

### Caching Settings:
- **Caching Level**: Standard
- **Browser Cache TTL**: 1 year
- **Always Online**: Enable

### Page Rules (create these in order):
1. `rottenhand.com/assets/*`
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 month
   - Browser Cache TTL: 1 year

2. `rottenhand.com/*.avif`
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 month
   - Browser Cache TTL: 1 year

3. `rottenhand.com/*.webp`
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 month
   - Browser Cache TTL: 1 year

4. `rottenhand.com/*.png`
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 month
   - Browser Cache TTL: 1 year

5. `rottenhand.com/*.jpg`
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 month
   - Browser Cache TTL: 1 year

### Security Settings:
- **SSL/TLS**: Full (strict)
- **Always Use HTTPS**: Enable
- **HSTS**: Enable

## 4. EXPECTED PERFORMANCE GAINS:
- **Global CDN**: Images and assets served from 200+ locations worldwide
- **Better compression**: Brotli + gzip
- **HTTP/3**: Faster connection establishment
- **Edge caching**: Reduced load on your Hetzner server
- **Image optimization**: Cloudflare can auto-optimize images

## 5. COST:
- **FREE** for your use case
- Only paid features are needed for enterprise-level traffic

This single change could make your site as fast as ciocca.it since you'll have global CDN coverage like Vercel provides for Next.js apps.
