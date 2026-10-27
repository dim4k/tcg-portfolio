// English: the interface strings. The card texts are in config.js itself.
const cards = (n) => (n === 1 ? "1 card" : `${n} cards`);
const sets = (n) => (n === 1 ? "1 set" : `${n} sets`);
const boosters = (n) => (n === 1 ? "1 booster" : `${n} boosters`);
const seenOf = (seen, total) => `${seen} of ${total} seen`;
const cardsSeenOf = (seen, total) => `${seen} of ${total} cards seen`;

export const EN = {
    ui: {
        loading: "Loading",
        cards: ({ n }) => cards(n),

        "rarity.rare": "Rare",
        "rarity.gold": "Gold",
        "rarity.secret": "Secret Rare",

        "pack.series": "Series {n}",
        "pack.edition": "1st<br />Ed.",
        "pack.rarityCount": ({ n, rarity }) => {
            const label = { rare: "rare", gold: "gold", secret: "secret rare" }[rarity] ?? rarity;
            return `${n} ${label}${n > 1 && rarity !== "gold" ? "s" : ""}`;
        },
        "pack.allCommon": "All common",

        "card.demo": "Live demo",
        "card.source": "Source",
        "card.tryIt": "Try It",
        "card.builtWith": "Built with {language}",
        "card.privateSource": "Private source",
        "card.years": "{n}Y",
        "card.copy": "Copy {label} address",
        "card.copied": "Copied",
        "card.openSet": "View set",
        "card.openSetLabel": "Open the {name} set in the binder",
        "card.since": "SINCE",
        "card.share": "Share this card",
        "share.copied": "Link copied",
        "card.showBack": "Show the back of the card",
        "card.showFront": "Show the front of the card",
        "card.new": "New",

        "view.binder": "Binder",
        "view.deck": "Deck",
        "lang.switch": "FR",
        "lang.label": "Version française",

        "lobby.role": "Engineering Manager",
        "lobby.lede": "Open a booster to explore my work, my side projects and life off the clock.",

        "booster.pick": "Pick a booster",
        "booster.pickSwipe": "Swipe through, tap one to pick it",
        "booster.focus": "Slice the pack, any direction",
        "booster.skipIntro": "Skip intro",
        "booster.skip": "Skip",
        "booster.notNow": "Not now",
        "booster.label": ({ name, n }) => `${name} booster, ${cards(n)}`,
        "booster.tapReveal": "Tap to reveal",
        "booster.rarityInside": "{rarity} inside · tap to reveal",
        "booster.rarityShown": "{rarity}!",
        "booster.new": "New",

        "dock.openOne": "Open the {name} booster",
        "dock.openSeveral": "Open a booster, {n} left",
        "dock.boosters": ({ n }) => boosters(n),
        "dock.toOpen": ({ n }) => `${cards(n)} to open`,
        "dock.cta": "Open",

        "collection.title": "Collection",
        "collection.boosters": "Boosters",
        "collection.close": "Close",
        "collection.summary": ({ seen, total }) => cardsSeenOf(seen, total),
        "collection.unlockHint": ({ total }) => `See all ${total} cards to unlock a secret booster`,
        "collection.complete": "Collection complete",
        "collection.all": "All cards",
        "collection.sets": ({ n }) => sets(n),
        "collection.tileSeen": ({ seen, total }) => seenOf(seen, total),
        "collection.tileSealed": ({ n }) => `Sealed · ${cards(n)}`,
        "collection.tileOpenLabel": "{name}, {seen} of {total} cards seen: show only these",
        "collection.tileSealedLabel": "{name}, sealed: open its booster",
        "collection.buttonFiltered": "Collection, showing {name} only",
        "collection.share": "Share the {name} set",
        "collection.reset": "Reset collection",
        "collection.resetAsk": "Seal every booster again and start over?",
        "collection.cancel": "Cancel",
        "collection.confirm": "Reset",
        "collection.unlocked": "Collection complete! A secret booster just appeared.",

        "binder.label": "Binder",
        "binder.sets": "Sets",
        "binder.pages": "Pages",
        "binder.prevPage": "Previous page",
        "binder.nextPage": "Next page",
        "binder.card": "Card",
        "binder.putBack": "Put back",
        "binder.showInDeck": "Show in deck",
        "binder.cover": "Collection",
        "binder.coverCount": ({ seen, total, n }) => `${cardsSeenOf(seen, total)} · ${sets(n)}`,
        "binder.series": "Series {n}",
        "binder.dividerSeen": ({ seen, total }) => seenOf(seen, total),
        "binder.share": "Share",
        "binder.dividerSealed": ({ n }) => `Sealed · ${cards(n)}`,
        "binder.openBooster": "Open the booster",
        "binder.tabSealed": "{name}, sealed",
        "binder.new": "New",
        "binder.pocketNew": "{name}, {number}, not seen yet",

        "nav.deck": "Deck navigation",
        "nav.position": "Card position",
        "nav.prev": "Previous card",
        "nav.next": "Next card",
        "nav.status": "Card {i} of {n}: {name}",
        "nav.valueText": "{name}, {i} of {n}",

        "hint.throwPointer": "Drag a card to throw it",
        "hint.throwTouch": "Swipe a card to throw it",
        "hint.flipPointer": "click to flip it",
        "hint.flipTouch": "tap to flip it",
    },
};
