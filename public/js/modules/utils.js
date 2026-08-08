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

