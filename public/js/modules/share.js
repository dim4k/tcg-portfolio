import { Utils } from "./utils.js";
import { showToast } from "./toast.js";
import { t } from "../i18n.js";

/**
 * The address that opens the site on `hash`: a card's slug, or a set's id (deep-link.js).
 * Without ?lang=, so the recipient reads it in their own language.
 */
export function linkTo(hash) {
    return `${window.location.origin}${window.location.pathname}#${hash}`;
}

/**
 * Hand a link to the phone's share sheet. On a computer, where the system sheet is out of
 * place, or when the phone refuses, the link is copied and a toast says so.
 * @returns {Promise<"shared"|"copied"|null>} null: dismissed, or the copy failed.
 */
export function shareLink({ url, title }) {
    const touch = window.matchMedia("(hover: none)").matches;
    if (touch && navigator.share) {
        return navigator.share({ title, url }).then(
            () => "shared",
            // Closing the sheet is the visitor's choice, not a failure.
            (err) => (err.name === "AbortError" ? null : copyLink(url))
        );
    }
    return copyLink(url);
}

function copyLink(url) {
    return Utils.copyText(url).then(
        () => {
            showToast(t("share.copied"));
            return "copied";
        },
        (err) => {
            console.error(`Copy failed: ${err.message}`);
            return null;
        }
    );
}
