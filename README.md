# 🎴 Antoine Kim - Interactive Card Portfolio

A highly interactive, Pokémon VMAX-inspired portfolio featuring holographic 3D cards, dynamic particle backgrounds, and smooth physics-based animations.

![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 📋 Overview

This project reimagines the traditional web portfolio as a deck of collectible cards. Built with modern Vanilla JS and CSS3, it delivers a premium visual experience without heavy frameworks.

**Core Concept:**
- **Card 1 (Fire)**: Professional Profile
- **Card 2 (Electric)**: Tech Stack & Skills
- **Card 3 (Psychic)**: Personal Interests
- **Card N...**: Add as many as you need!

## ✨ Key Features

### 🎨 Visual Experience
- **Holographic VMAX Effect**: Realistic foil textures, glitter, and glare that react to light.
- **3D Tilt Physics**: Cards rotate based on mouse position (Desktop) or device orientation (Mobile Gyroscope).
- **Swirl Background**: A dynamic, noise-based particle system that creates a living backdrop.
- **Infinite Deck**: The stacking logic supports any number of cards automatically.

### 🎮 Interactions
- **Gesture Control**: Swipe down on mobile to cycle cards.
- **Scroll Navigation**: Smooth scroll wheel support on desktop.
- **Responsive Design**: Adaptive layout that transforms from a 3D showcase to a touch-friendly mobile view.

## 📁 Project Structure

The codebase is fully modularized for maintainability and scalability.

```
antoine.kim_v3/
├── index.html              # Main entry point
├── README.md               # Documentation
└── public/
    ├── css/
    │   ├── style.css       # CSS Entry point (imports modules)
    │   └── modules/
    │       ├── base.css        # Variables & Reset
    │       ├── card.css        # 3D Card Logic & Stacking
    │       ├── effects.css     # Holographic Glare & Sparkles
    │       ├── responsive.css  # Mobile Adaptations
    │       └── themes.css      # Color Palettes
    ├── js/
    │   ├── main.js         # JS Entry point
    │   ├── config.js       # ⚡ CENTRAL CONFIG (Edit this!)
    │   └── modules/
    │       ├── card-renderer.js    # HTML Generation
    │       ├── deck-manager.js     # Deck State & Animation
    │       ├── interactions.js     # Input Handling (Mouse/Touch/Gyro)
    │       ├── swirl-background.js # Canvas Background Effect
    │       └── utils.js            # Helpers
    └── img/                # Assets
```

## ⚙️ Configuration

Everything is data-driven. You don't need to touch the HTML.
Open `public/js/config.js` to customize:

### 1. Profile & Content
Modify the `CONFIG.CARDS` array to add, remove, or edit cards.
```javascript
export const CONFIG = {
    // ...
    CARDS: [
        {
            id: 1,
            theme: 'fire', // Maps to CSS themes
            header: {
                stage: 'Professional Profile',
                name: 'Your Name',
                hp: '34 Yrs'
            },
            // ...
        }
    ]
};
```

### 2. Visual Themes
Define your own color schemes in `THEME_COLORS`.
```javascript
    THEME_COLORS: {
        fire: '#4a0000',
        ice: '#004a4a', // Add custom themes
        default: '#101010'
    }
```

### 3. Tuning
Adjust physics and sensitivity.
```javascript
    // 3D effect settings
    GYRO_SENSITIVITY: 0.5,
    TILT_INTENSITY: 15,
```

## 🚀 How to Run

Since this project uses ES6 Modules, you must serve it via a local server (opening `index.html` directly won't work due to CORS policies).

**Using Python:**
```bash
python -m http.server 8000
# Open http://localhost:8000
```

**Using Node (http-server):**
```bash
npx http-server .
# Open generated URL
```

**Using VS Code:**
- Install "Live Server" extension.
- Right-click `index.html` -> "Open with Live Server".

## 📱 Browser Support

| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome  | ✅ | ✅ |
| Firefox | ✅ | ✅ |
| Safari  | ✅ | ✅ |
| Edge    | ✅ | ✅ |

*Note: Gyroscope features require HTTPS or localhost context on modern mobile browsers.*

## 👤 Author

**Antoine Kim**
- Portfolio: [antoine.kim](https://antoine.kim)
- LinkedIn: [Antoine Kim](https://www.linkedin.com/in/antoine-kim/)
- GitHub: [@dim4k](https://github.com/dim4k)

## 📝 License

MIT License - Feel free to fork and adapt for your own portfolio!

