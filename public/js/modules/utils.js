/**
 * Calculate years since a given date
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {number} Number of full years
 */
export function calculateYearsSince(dateString) {
    const startDate = new Date(dateString);
    const today = new Date();
    let years = today.getFullYear() - startDate.getFullYear();
    const monthDiff = today.getMonth() - startDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < startDate.getDate())) {
        years--;
    }
    return years;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
