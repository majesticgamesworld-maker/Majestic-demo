# Majestic Games Product and Discovery Redesign Notes

## Playful Spectrum Principles

- Use Instrument Serif for H1/H2-style headings and Geist for readable body/UI text.
- Keep the core palette focused: primary `#FC3903`, background `#F4F6F6`, text/dark UI `#0A1515`, on-dark text `#FFFFFF`, and dividers `#D9E2E2`.
- Keep default text slightly enlarged for storefront readability, with footer emphasis allowed to use logo-inspired crimson `#4a1211` and gold `#c9a14c`.
- Use 2px borders on high-value controls, purchase blocks, badges, and recommendation actions.
- Keep cards rounded and tactile, but avoid nesting decorative cards inside larger decorative cards.

## Product Page Components

- `product-gallery`: responsive product media area with thumbnails, zoom, and mobile swipe support.
- `product-detail-panel`: primary product decision area containing title, category, price, stock status, quantity, and CTAs.
- `product-purchase-block`: conversion block for quantity, Add to Cart, and WhatsApp order.
- `product-detail-chips` and `product-info-grid`: short facts for players, age, playtime, and difficulty.
- `mobile-sticky-add`: mobile conversion shortcut that hides when the footer intersects the viewport.

## Discovery Components

- `smart-shop-v2`: desktop Smart Shop click menu with mood, category, need, gift, and concierge paths.
- `smart-shop-hint-buttons`: clickable quick search/category hints.
- Mobile discovery lives in the mobile navigation as search, category, mood, gift, and WhatsApp sections.
- `finder-live-count`: real-time safe match feedback while answering the Game Finder.
- `finder-why-badge`: compact reason label for each recommendation.
- `finder-result-add`: direct Quick Add action from Game Finder results.

## Implementation Notes

- Product page spacing and logo sizing are finalized at the end of `products.css` to override older layered rules.
- Game Finder scoring is centralized in `getFinderScoredMatches()` so live counts and final results use the same source.
- Product pages use clean routes and dynamic SEO metadata from `script.js`.
