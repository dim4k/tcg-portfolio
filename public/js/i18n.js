import { EN } from "./locales/en.js";
import { FR } from "./locales/fr.js";

/**
 * The site in English or French. The inline script in index.html picks the language before
 * the first paint (?lang= in the address, else the visitor's choice kept under LANG_KEY, else
 * the browser's) and writes it on <html lang>; everything here reads it from there.
 *
 * A locale has `ui` (the interface strings, by key) and `sets` (the card texts, by set id,
 * merged over CONFIG.SETS: see localizeCard / localizeProject). Anything a locale leaves out
 * falls back to English, so a new card shows in English until it is translated.
 */
const LOCALES = { en: EN, fr: FR };

// localStorage key of the visitor's choice. Mirrored in index.html.
export const LANG_KEY = "tcg-lang";

export const lang = LOCALES[document.documentElement.lang] ? document.documentElement.lang : "en";

const locale = LOCALES[lang];

/**
 * Interface string `key`. `{name}` placeholders are filled from `vars`; a function entry is
 * called with `vars` instead (plurals).
 */
export function t(key, vars = {}) {
    const entry = locale.ui[key] ?? EN.ui[key];
    if (entry === undefined) {
        console.warn(`Missing string "${key}"`);
        return key;
    }
    if (typeof entry === "function") return entry(vars);
    return entry.replace(/\{(\w+)\}/g, (match, name) => vars[name] ?? match);
}

/** `base` with `over` merged in, objects recursively; arrays and values are replaced. */
function merge(base, over) {
    if (!over) return base;
    const out = { ...base };
    for (const [key, value] of Object.entries(over)) {
        const isObject = value && typeof value === "object" && !Array.isArray(value);
        out[key] = isObject && base?.[key] ? merge(base[key], value) : value;
    }
    return out;
}

/** The translated texts of a set: name, tagline. */
export function localizeSet(set) {
    const over = locale.sets?.[set.id];
    return {
        name: over?.name ?? set.name,
        tagline: over?.tagline ?? set.tagline ?? "",
    };
}

/** A card of `set.cards`, its texts translated (keyed by slug in the locale). */
export function localizeCard(set, card) {
    return merge(card, locale.sets?.[set.id]?.cards?.[card.slug]);
}

/** A project of `set.projects`, its texts translated (keyed like in the config). */
export function localizeProject(set, key, project) {
    return merge(project, locale.sets?.[set.id]?.projects?.[key]);
}

/** Label of a rarity of CONFIG.RARITIES. */
export function rarityLabel(key) {
    return t(`rarity.${key}`);
}

/**
 * Switch language: the choice is kept, and the page reloads on the same card (the hash
 * follows it). Any ?lang= in the address (index.html reads it first) goes, or it would win.
 */
export function setLang(next) {
    const url = new URL(window.location.href);
    try {
        localStorage.setItem(LANG_KEY, next);
        url.searchParams.delete("lang");
    } catch {
        // Storage blocked: the address carries the choice instead.
        url.searchParams.set("lang", next);
    }
    // The same address with a hash would only scroll, not load again.
    if (url.href === window.location.href) window.location.reload();
    else window.location.replace(url.href);
}

/** Translate the static markup: data-i18n (text), data-i18n-label (aria-label). */
export function translatePage(root = document) {
    root.querySelectorAll("[data-i18n]").forEach((el) => {
        el.textContent = t(el.dataset.i18n);
    });
    root.querySelectorAll("[data-i18n-label]").forEach((el) => {
        el.setAttribute("aria-label", t(el.dataset.i18nLabel));
    });
}
