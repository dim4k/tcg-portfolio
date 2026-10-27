// How long the toast stays up.
const TOAST_DURATION = 4500;

/** A short message at the top of the screen, read out by screen readers. */
export function showToast(text) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = text;
    toast.hidden = false;
    toast.classList.remove("is-leaving");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
        toast.classList.add("is-leaving");
        showToast.timer = setTimeout(() => (toast.hidden = true), 400);
    }, TOAST_DURATION);
}
