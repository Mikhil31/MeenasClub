# Meenaa's Millionaire Club — website

Static site — plain HTML, CSS and JS. No build step. Clean URLs via folder-per-page, deployed to GitHub Pages by `.github/workflows/pages.yml` on every push to `main`.

- Pages: Home · About · Membership (21-category fee table with filters) · Branches · Facilities · Contact
- The enquiry and newsletter forms open the visitor's email app addressed to the Secretary (nothing is stored)

## Run locally

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080

## Structure

- Pages: `index.html`, `about/`, `membership/`, `branches/`, `facilities/`, `contact/`, `404.html`. The header and footer are repeated in each page, so change them in all of them.
- `404.html` uses absolute paths under `/MeenasClub/` (the GitHub Pages project path). Update them if the repo is renamed.
- Styles: `assets/css/style.css` · Fonts: `assets/css/fonts.css` + `assets/fonts/` (self-hosted, with size-matched fallbacks so text doesn't jump while fonts load)
- Scripts: `assets/js/main.js`. Reveals, counters, the city accordion and the cursor use plain JS and CSS. GSAP + ScrollTrigger + Lenis (scroll-linked parallax and smooth scroll) load from CDNs **on desktop only**, after the page has loaded. Phones never download them.
- Low-end phones and data-saver users get a "lite" mode (class `lite` on `<html>`) that drops blur and backdrop effects. `prefers-reduced-motion` turns motion off.
- Photos: `assets/img/photos/`: a JPG fallback plus WebP at 640/1280/1920 per image. All are from Unsplash (free licence), colour-graded to the logo's navy and gold. To replace one, keep the same file names.

## To do

- Instagram, Facebook, LinkedIn and YouTube links in the footer are `#` placeholders.
- Photography is illustrative stock. Replace it with the Club's own images when available.
