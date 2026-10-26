import { CONFIG } from "../config.js";

// Kept outside the object so the helpers below never depend on `this`.
const mobileMql = window.matchMedia(`(max-width: ${CONFIG.MOBILE_BREAKPOINT}px)`);
const reducedMotionMql = window.matchMedia("(prefers-reduced-motion: reduce)");

export const Utils = {
    /**
     * Calculate years since a given date
     * @param {string} dateString - Date in YYYY-MM-DD format
     * @returns {number} Number of full years
     */
    calculateYearsSince: function (dateString) {
        // Parsed by hand: new Date("YYYY-MM-DD") is UTC midnight, but getMonth()/getDate()
        // read local time, which shifts the anniversary by a day west of UTC.
        const [year, month, day] = dateString.split("-").map(Number);
        const today = new Date();

        let years = today.getFullYear() - year;
        const monthDiff = today.getMonth() - (month - 1);

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
            years--;
        }
        return years;
    },

    /**
     * Clamp a value between min and max
     */
    clamp: function (value, min, max) {
        return Math.max(min, Math.min(max, value));
    },

    /**
     * Copy text to the clipboard. The async API only exists in secure contexts and can still
     * refuse (an unfocused document, a denied permission), so both cases fall back to the
     * legacy selection-based command.
     * @returns {Promise<void>}
     */
    copyText: function (text) {
        const legacyCopy = () => {
            const area = document.createElement("textarea");
            area.value = text;
            area.setAttribute("readonly", "");
            area.style.position = "fixed";
            area.style.opacity = "0";
            document.body.appendChild(area);
            area.select();
            const ok = document.execCommand("copy");
            area.remove();
            if (!ok) throw new Error("execCommand copy was refused");
        };

        if (!navigator.clipboard?.writeText) {
            return new Promise((resolve) => resolve(legacyCopy()));
        }
        return navigator.clipboard.writeText(text).catch(legacyCopy);
    },

    /**
     * Shared media queries. Exposed as MediaQueryList so callers can subscribe to changes.
     */
    mobileMql,
    reducedMotionMql,

    /**
     * Whether the viewport currently matches the mobile breakpoint.
     */
    isMobile: () => mobileMql.matches,

    /**
     * Whether the user prefers reduced motion.
     */
    prefersReducedMotion: () => reducedMotionMql.matches,
};

