import { CONFIG } from "../config.js";

const pad = (n, width) => String(n).padStart(width, "0");

/** Collector number as printed on a real card: 003/005. */
export function setLabel(index, total, code = "") {
    const width = Math.max(String(total).length, code ? 2 : 3);
    const number = `${pad(index + 1, width)}/${pad(total, width)}`;
    return code ? `${code} ${number}` : number;
}

/**
 * Card data for every card of a set; projects are printed in the same shape as `cards`.
 * Each card also carries `setId`, since the deck mixes the cards of several sets.
 */
export function setCards(set) {
    if (set.cards) {
        return set.cards.map((data, index) => ({
            ...data,
            setId: set.id,
            setLabel: setLabel(index, set.cards.length, set.code),
        }));
    }

    const projects = Object.entries(set.projects);
    const total = projects.length;

    return projects.map(([key, project], index) => {
        const links = [];
        if (project.demo) {
            links.push({
                url: project.demo,
                icon: "up-right-from-square",
                label: "Live demo",
                brand: project.brand,
            });
        }
        if (project.source) {
            links.push({
                url: project.source,
                icon: "code",
                label: "Source",
                brand: project.brand,
            });
        }

        return {
            id: `${set.code}-${key}`,
            setId: set.id,
            slug: project.slug,
            brand: project.brand,
            header: {
                stage: set.name,
                name: project.label,
                hpLabel: "NO.",
                hpValue: pad(index + 1, 2),
            },
            ...(project.image ? { image: project.image } : { art: { icon: project.icon } }),
            body: {
                row1: {
                    title: project.desc,
                    desc: project.about || "",
                    icon: project.icon,
                },
                row2: { title: "Try It", links },
            },
            footer: { text: project.language ? `Built with ${project.language}` : "Private source" },
            setLabel: setLabel(index, total, set.code),
        };
    });
}

/** The set and card a URL hash names, e.g. #kimpay, or null. */
export function findSlug(slug) {
    for (const set of CONFIG.SETS) {
        const index = setCards(set).findIndex((card) => card.slug === slug);
        if (index >= 0) return { set, index };
    }
    return null;
}

export class CardRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    /**
     * @param {object[]} cards Card data, from setCards().
     * @param {number} startIndex Card shown in front first (a deep link may ask for one).
     */
    render(cards, startIndex = 0) {
        if (!this.container) return;

        this.container
            .querySelectorAll("tcg-card")
            .forEach((card) => card.remove());

        const total = cards.length;
        const fragment = document.createDocumentFragment();
        cards.forEach((cardData, index) => {
            const cardElement = document.createElement("tcg-card");
            // Position first: rendering reads it to decide the image loading priority.
            cardElement.dataset.pos = (index - startIndex + total) % total;
            cardElement.dataset.index = index;
            cardElement.data = cardData;
            fragment.appendChild(cardElement);
        });
        this.container.appendChild(fragment);
    }
}
