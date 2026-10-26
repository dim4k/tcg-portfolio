# 🎴 TCG Porfolio

A highly interactive, Pokémon card inspired portfolio featuring holographic 3D cards, dynamic particle backgrounds, and smooth physics-based animations.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 📋 Overview

This project reimagines the traditional web portfolio as a deck of collectible cards. Built with modern Vanilla JS (native ES Modules) and CSS3, it delivers a premium visual experience without heavy frameworks and **without a build step**.

**Core Concept:**

-   **Card 1 (Fire)**: Professional Profile
-   **Card 2 (Psychic)**: Tech Stack & Skills
-   **Card 3 (Ice)**: Career Path
-   **Card 4 (Dark)**: Side Projects
-   **Card 5 (Grass)**: Personal Interests
-   **Card N...**: Add as many as you need!

## ✨ Key Features

### 🎨 Visual Experience

-   **Holographic VMAX Effect**: Realistic foil textures, glitter, and glare that react to light.
-   **Rare and Gold Cards**: `rarity: "rare"` or `rarity: "gold"` on a card in `config.js`. A rare gets a rainbow foil with glitter and a light that breathes at rest, a gold an engraved gold finish with sparkles; in front of the deck, either one colours the whole page. In a booster they come out last: a rare with a halo, a gold with its back cracking open.
-   **3D Tilt Physics**: Cards rotate based on mouse position (Desktop) or device orientation (Mobile Gyroscope).
-   **Swirl Background**: A dynamic, noise-based particle system that creates a living backdrop.
-   **Infinite Deck**: The stacking logic supports any number of cards automatically.
-   **Boosters & Collection**: The first visit of a session opens on one sealed pack per set. Pick one and slice it with a stroke in any direction: its cards come out face down. Tap to turn the top one over, tap again to send it flying into the Collection button; the rare and gold cards come last, each with its own reveal, and the deck comes back with the new cards. The deck is your collection: every booster opened adds its cards, filed by set. Packs still sealed wait in a dock above the deck navigation; several open a pick among them.
-   **Card Backs**: Click a card (or its flip button) to turn it over and read the details on its back.
-   **Collection Drawer**: A toolbar button opens one tile per set, with its pack and progress: an opened set narrows the deck to its cards, a sealed one opens its booster.
-   **Binder**: A book whose pages turn with a drag or a tap (two pages side by side on wide screens, one on phones), with a divider page and colour tab per set. Sealed sets show mystery pockets and a button to open their booster. A ring-less card binder: its pages are stitched into the spine, and blur as they turn. Picking a card takes it out of its pocket, full size, and it handles like the front card of the deck: it leans towards the mouse or the phone's tilt, a tap turns it over, and a throw sends it back to the binder. It can also be put back, or sent to the front of the deck. The binder is a view of its own: its own background, and in the toolbar a Boosters button counting the boosters still sealed takes the place of Collection.

### 🎮 Interactions

-   **Drag & Throw**: Grab the front card with the mouse or a finger and throw it in any direction to cycle the deck.
-   **Deck Navigation**: Collector numbers (`BS 03/05`) on each card, and a scrubber under the deck, cut into one coloured segment per set: drag it to leaf through the deck, at 10 cards or 200.
-   **Scroll & Keyboard**: Scroll wheel and arrow keys cycle the deck too.
-   **Deep Links**: `/#projects` opens the deck on the Projects card, `/#kimpay` on a card of After Hours (adding the set to the collection); the address bar follows the card in front.
-   **Accessible**: Only the front card is focusable, and card changes are announced to screen readers.
-   **Responsive Design**: Adaptive layout that transforms from a 3D showcase to a touch-friendly mobile view.

## ⚙️ Configuration

Everything is data-driven. You don't need to touch the HTML.
Open `public/js/config.js` to customize:

### 1. Profile & Content

Cards are filed by collection in `SETS`. Each set is a booster pack, a run of pages in the
binder and, once opened, a part of the deck. Adding a collection only takes a new entry: the
packs, deck dividers, binder pages and tabs are all built from it.

```javascript
export const CONFIG = {
    // ...
    SETS: [
        {
            id: "base",
            code: "BS", // printed on the pack and before each collector number
            name: "Base Set",
            icon: "star", // key of icons.js, for the dividers and binder tabs
            booster: { color: "#f0532b", highlight: "#ffd77a" }, // pack colours
            cards: [
                {
                    id: 1,
                    theme: "fire",
                    header: {
                        stage: "Professional Profile",
                        name: "Your Name",
                        hpValue: "34",
                        hpLabel: "AGE",
                        hpType: "dynamic-age",
                    },
                    // ...
                },
            ],
        },
    ],
};
```

Each card can also have:

-   `slug`: the URL hash that opens the deck on it (`antoine.kim/#profile`).
-   `back`: a title and a list of `{ label, text }` items printed on the back. Cards without
    one do not flip.
-   `art`: `{ icon }`, a large icon shown in the picture frame when there is no `image`.

A card's second row renders `actions` (keys of `CONFIG.SOCIAL`, laid out side by side). A social
entry with a `copy` value gets a button that copies it, for links like `mailto:` that do nothing
without a configured client. `expansion` adds a button that opens that expansion in the binder.

A set can list `projects` instead of `cards` (the After Hours set does): each side project,
with its own `slug`, is printed as a card, with a live demo and a source link when it has one.
Its `image` fills the picture frame (`icon` is shown when there is none). A project without
`source` or `language` (a private repository) shows only its demo link. Image sources and
credits are listed in `public/img/credits.txt`.
A set's `code` is printed before the collector number (`AH 01/06`).

The opened sets are kept in `sessionStorage` (`CONFIG.BOOSTER_KEY`), so a reload keeps the
same deck; the booster intro only plays while none is opened. "Reset collection", at the
bottom of the collection drawer, seals every booster again after a confirmation.

### 2. Visual Themes

Theme colours live in CSS, so the page background and the card gradients cannot drift
apart. Add a `--bg-*` and a `--color-*` entry in `public/css/modules/base.css`:

```css
:root {
    --bg-fire: #4a0000; /* page background */
    --color-fire: #ff9d9d; /* card accent */
}
```

Then add the matching `:host([theme="fire"])` block in
`public/css/components/tcg-card.css`, and set it as the `theme` of a card.

### 3. Tuning

Adjust physics and sensitivity in the root of the object.

```javascript
    GYRO_SENSITIVITY: 0.5,
    MOUSE_ROTATION_FACTOR: 15,
    THROW_DISTANCE: 110, // px dragged before a released card is thrown
```

### 4. Share Preview

Link previews (LinkedIn, Slack, X) use `public/img/og-image.png`, a 1200×630 screenshot of
`tools/og-image.html`. After changing the profile card, serve the folder and regenerate it:

```bash
chrome --headless=new --hide-scrollbars --window-size=1200,630 --virtual-time-budget=10000     --screenshot=public/img/og-image.png http://localhost:8000/tools/og-image.html
```

The `og:*` tags in `index.html` need absolute URLs: update them if the site moves.

## 🚀 How to Run

The site is made of plain static files (HTML, JS, CSS) using native ES modules.
Because ES modules are blocked over the `file://` protocol, you need to serve
the folder over HTTP. Any static server works — for example:

```bash
# Python 3
python -m http.server 8000

# or Node's http-server, nginx, Apache, etc.
```

Then open http://localhost:8000.

## ☁️ Deployment

No build step. Just upload the project files (`index.html` + `public/`) to any
static host (nginx, Apache, GitHub Pages, Netlify, S3, FTP…).

## 📱 Browser Support

| Browser | Desktop | Mobile |
| ------- | ------- | ------ |
| Chrome  | ✅      | ✅     |
| Firefox | ✅      | ✅     |
| Safari  | ✅      | ✅     |
| Edge    | ✅      | ✅     |

_Note: Gyroscope features require HTTPS or localhost context on modern mobile browsers._

## 👤 Author

**Antoine Kim**

-   Portfolio: [antoine.kim](https://antoine.kim)

## 📝 License

MIT License - Feel free to fork and adapt for your own portfolio!
