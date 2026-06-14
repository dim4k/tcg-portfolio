# 🎴 TCG Porfolio

A highly interactive, Pokémon card inspired portfolio featuring holographic 3D cards, dynamic particle backgrounds, and smooth physics-based animations.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 📋 Overview

This project reimagines the traditional web portfolio as a deck of collectible cards. Built with modern Vanilla JS (native ES Modules) and CSS3, it delivers a premium visual experience without heavy frameworks and **without a build step**.

**Core Concept:**

-   **Card 1 (Fire)**: Professional Profile
-   **Card 2 (Electric)**: Tech Stack & Skills
-   **Card 3 (Psychic)**: Personal Interests
-   **Card N...**: Add as many as you need!

## ✨ Key Features

### 🎨 Visual Experience

-   **Holographic VMAX Effect**: Realistic foil textures, glitter, and glare that react to light.
-   **3D Tilt Physics**: Cards rotate based on mouse position (Desktop) or device orientation (Mobile Gyroscope).
-   **Swirl Background**: A dynamic, noise-based particle system that creates a living backdrop.
-   **Infinite Deck**: The stacking logic supports any number of cards automatically.

### 🎮 Interactions

-   **Gesture Control**: Swipe down on mobile to cycle cards.
-   **Scroll Navigation**: Smooth scroll wheel support on desktop.
-   **Responsive Design**: Adaptive layout that transforms from a 3D showcase to a touch-friendly mobile view.

## ⚙️ Configuration

Everything is data-driven. You don't need to touch the HTML.
Open `public/js/config.js` to customize:

### 1. Profile & Content

Modify the `CARDS` array to add, remove, or edit cards.

```javascript
export const CONFIG = {
    // ...
    CARDS: [
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
};
```

### 2. Visual Themes

Define your own color schemes in `THEME_COLORS`.

```javascript
    THEME_COLORS: {
        "fire": "#4a0000",
        "ice": "#004a4a",
        "default": "#101010"
    }
```

### 3. Tuning

Adjust physics and sensitivity in the root of the object.

```javascript
    GYRO_SENSITIVITY: 0.5,
    MOUSE_ROTATION_FACTOR: 15
```

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
