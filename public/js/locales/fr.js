// French: the interface strings, then the card texts, by set id and card slug (or project key
// for a set of `projects`), merged over config.js. Anything left out shows in English.
const cards = (n) => (n === 1 ? "1 carte" : `${n} cartes`);
const sets = (n) => (n === 1 ? "1 set" : `${n} sets`);
const boosters = (n) => (n === 1 ? "1 booster" : `${n} boosters`);
// "0 vue", "1 vue", "2 vues": in French, zero takes the singular.
const seenOf = (seen, total) => `${seen} ${seen > 1 ? "vues" : "vue"} sur ${total}`;
const cardsSeenOf = (seen, total) => `${seen} ${seen > 1 ? "cartes vues" : "carte vue"} sur ${total}`;

export const FR = {
    ui: {
        loading: "Chargement",
        cards: ({ n }) => cards(n),

        "rarity.rare": "Rare",
        "rarity.gold": "Or",
        "rarity.secret": "Rare secrète",

        "pack.series": "Série {n}",
        "pack.edition": "1re<br />Éd.",
        "pack.rarityCount": ({ n, rarity }) => {
            const s = n > 1 ? "s" : "";
            const label = { rare: `rare${s}`, gold: "or", secret: `rare${s} secrète${s}` }[rarity] ?? rarity;
            return `${n} ${label}`;
        },
        "pack.allCommon": "Que des communes",

        "card.demo": "Démo",
        "card.source": "Code",
        "card.tryIt": "Essayer",
        "card.builtWith": "Fait en {language}",
        "card.privateSource": "Code privé",
        "card.years": "{n} ans",
        "card.copy": "Copier l'adresse {label}",
        "card.copied": "Copié",
        "card.openSet": "Voir le set",
        "card.openSetLabel": "Ouvrir le set {name} dans le classeur",
        "card.since": "DEPUIS",
        "card.share": "Partager cette carte",
        "share.copied": "Lien copié",
        "card.showBack": "Voir le dos de la carte",
        "card.showFront": "Voir le recto de la carte",
        "card.new": "Nouveau",

        "view.binder": "Classeur",
        "view.deck": "Deck",
        "lang.switch": "EN",
        "lang.label": "English version",

        "lobby.role": "Engineering Manager",
        "lobby.lede": "Ouvrez un booster pour découvrir mon travail, mes projets perso et ma vie hors du travail.",

        "booster.pick": "Choisissez un booster",
        "booster.pickSwipe": "Faites défiler, touchez-en un pour le choisir",
        "booster.focus": "Tranchez le paquet, dans n'importe quel sens",
        "booster.skipIntro": "Passer l'intro",
        "booster.skip": "Passer",
        "booster.notNow": "Plus tard",
        "booster.label": ({ name, n }) => `Booster ${name}, ${cards(n)}`,
        "booster.tapReveal": "Appuyez pour révéler",
        "booster.rarityInside": "Carte {rarity} à l'intérieur · appuyez pour la révéler",
        "booster.rarityShown": "Carte {rarity} !",
        "booster.new": "Nouveau",

        "dock.openOne": "Ouvrir le booster {name}",
        "dock.openSeveral": "Ouvrir un booster, encore {n}",
        "dock.boosters": ({ n }) => boosters(n),
        "dock.toOpen": ({ n }) => `${cards(n)} à ouvrir`,
        "dock.cta": "Ouvrir",

        "collection.title": "Collection",
        "collection.boosters": "Boosters",
        "collection.close": "Fermer",
        "collection.summary": ({ seen, total }) => cardsSeenOf(seen, total),
        "collection.unlockHint": ({ total }) => `Voyez les ${total} cartes pour débloquer un booster secret`,
        "collection.complete": "Collection complète",
        "collection.all": "Toutes les cartes",
        "collection.sets": ({ n }) => sets(n),
        "collection.tileSeen": ({ seen, total }) => seenOf(seen, total),
        "collection.tileSealed": ({ n }) => `Scellé · ${cards(n)}`,
        "collection.tileOpenLabel": "{name}, {seen} cartes vues sur {total} : n'afficher que celles-ci",
        "collection.tileSealedLabel": "{name}, scellé : ouvrir son booster",
        "collection.buttonFiltered": "Collection, seulement {name}",
        "collection.share": "Partager le set {name}",
        "collection.reset": "Réinitialiser la collection",
        "collection.resetAsk": "Resceller tous les boosters et tout recommencer ?",
        "collection.cancel": "Annuler",
        "collection.confirm": "Réinitialiser",
        "collection.unlocked": "Collection complète ! Un booster secret vient d'apparaître.",

        "binder.label": "Classeur",
        "binder.sets": "Sets",
        "binder.pages": "Pages",
        "binder.prevPage": "Page précédente",
        "binder.nextPage": "Page suivante",
        "binder.card": "Carte",
        "binder.putBack": "Ranger",
        "binder.showInDeck": "Voir dans le deck",
        "binder.cover": "Collection",
        "binder.coverCount": ({ seen, total, n }) => `${cardsSeenOf(seen, total)} · ${sets(n)}`,
        "binder.series": "Série {n}",
        "binder.dividerSeen": ({ seen, total }) => seenOf(seen, total),
        "binder.share": "Partager",
        "binder.dividerSealed": ({ n }) => `Scellé · ${cards(n)}`,
        "binder.openBooster": "Ouvrir le booster",
        "binder.tabSealed": "{name}, scellé",
        "binder.new": "Nouveau",
        "binder.pocketNew": "{name}, {number}, pas encore vue",

        "nav.deck": "Navigation du deck",
        "nav.position": "Position de la carte",
        "nav.prev": "Carte précédente",
        "nav.next": "Carte suivante",
        "nav.status": "Carte {i} sur {n} : {name}",
        "nav.valueText": "{name}, {i} sur {n}",

        "hint.throwPointer": "Glissez une carte pour la lancer",
        "hint.throwTouch": "Balayez une carte pour la lancer",
        "hint.flipPointer": "cliquez pour la retourner",
        "hint.flipTouch": "touchez pour la retourner",
    },

    sets: {
        base: {
            tagline: "Profil et contact",
            cards: {
                profile: {
                    header: { stage: "Profil professionnel" },
                    body: {
                        row1: {
                            desc: "Leadership technique et management d'équipe. Je pilote des projets complexes avec une forte exigence de qualité de code.",
                        },
                        row2: { title: "Me contacter" },
                    },
                    footer: { text: "Statut : ouvert aux opportunités" },
                    back: {
                        title: "En bref",
                        items: [
                            { label: "Rôle", text: "Engineering Manager" },
                            { label: "Code depuis", text: "2011" },
                            { label: "Basé à", text: "Nantes, France" },
                            { label: "Langues", text: "Français, anglais" },
                            { label: "Statut", text: "Ouvert aux opportunités" },
                            { label: "Contact", text: "contact@antoine.kim" },
                        ],
                    },
                },
                stack: {
                    header: { stage: "Compétences clés", name: "Stack technique", hpLabel: "NIV" },
                    body: {
                        row1: {
                            title: "Leadership technique",
                            desc: "J'encadre et je manage des équipes de développement. Expert PHP et Python, et architectures qui tiennent la charge.",
                        },
                        row2: {
                            desc: "Expertise backend, pipelines CI/CD, mentorat et livraison agile.",
                        },
                    },
                    footer: { text: "Équipe : Dev Manager" },
                    back: {
                        items: [
                            { label: "Backend", text: "PHP, Python" },
                            { label: "Architecture", text: "Systèmes backend scalables" },
                            { label: "Livraison", text: "Pipelines CI/CD, DevOps" },
                            { label: "Leadership", text: "Management d'équipe, mentorat, livraison agile" },
                            { label: "Le soir", text: "JavaScript, TypeScript, Vue" },
                        ],
                    },
                },
                experience: {
                    header: { stage: "Parcours", name: "Expérience", hpLabel: "POSTES" },
                    body: {
                        row1: {
                            title: "Mon parcours",
                            desc: "Quinze ans à écrire du code sur toute la stack, puis à diriger les équipes qui l'écrivent. Toujours dans les pull requests.",
                        },
                        row2: {
                            title: "Tout le parcours",
                            desc: "Retournez la carte pour les postes, année par année. Tous les détails sur LinkedIn.",
                        },
                    },
                    footer: { text: "Base : Nantes" },
                    back: {
                        title: "Parcours",
                        items: [
                            { label: "2026 – auj. · Engineering Manager", text: "Recommerce. IA générative dans tout le cycle de dev." },
                            { label: "2024 – 2026 · Lead Dev Manager", text: "Recommerce. DX assistée par l'IA, AWS." },
                            { label: "2020 – 2024 · Lead Developer", text: "Recommerce. Équipe de 8, API Symfony." },
                            { label: "2017 – 2020 · Développeur backend", text: "Recommerce. Symfony, Zend, AWS Lambda." },
                            { label: "2014 – 2017 · Développeur full-stack", text: "Groupe Zéphir. Java, PHP, Vue.js." },
                            { label: "2011 – 2013 · Développeur web", text: "Stages. PHP, MySQL, Drupal." },
                        ],
                    },
                },
                projects: {
                    header: { stage: "Projets perso", name: "Projets" },
                    body: {
                        row1: {
                            title: "Faits le soir",
                            desc: "De petits outils que j'utilise vraiment, développés à côté. Chacun a sa carte dans l'extension After Hours.",
                        },
                        row2: { title: "Explorer" },
                    },
                    footer: { text: "Licence : MIT" },
                    back: {
                        items: [
                            { label: "Map2Poster", text: "Votre ville en affiche à imprimer" },
                            { label: "Kimpay", text: "Dépenses de groupe, au centime près" },
                            { label: "MixEra", text: "Un quiz musical : devinez l'année" },
                            { label: "Naolib", text: "Les transports nantais dans Home Assistant" },
                            { label: "EzLoc", text: "Location de vacances, avec son CMS" },
                            { label: "Cookim", text: "Recettes, menus, listes de courses" },
                            { label: "TCG Portfolio", text: "Le site sur lequel vous êtes" },
                        ],
                    },
                },
                about: {
                    header: { stage: "Perso", name: "À propos", hpLabel: "ÂGE" },
                    body: {
                        row1: {
                            title: "Centres d'intérêt",
                            desc: "Passionné de vélo, de photo et de cinéma. Inspiré par le mélange d'art et d'industrie de Nantes.",
                        },
                        row2: {
                            title: "Côté créatif",
                            desc: "Partager des moments à travers l'objectif, à vélo.",
                        },
                    },
                    footer: { text: "Langues : FR / EN" },
                    back: {
                        items: [
                            { label: "Sur la route", text: "Vélo, bikepacking" },
                            { label: "Derrière l'objectif", text: "Photographie" },
                            { label: "Dans le noir", text: "Cinéma" },
                            { label: "Chez moi", text: "Nantes, art et industrie" },
                            { label: "Langues", text: "Français, anglais" },
                        ],
                    },
                },
            },
        },

        "after-hours": {
            tagline: "Projets perso",
            projects: {
                map2poster: {
                    desc: "Votre ville en affiche à imprimer",
                    about: "Dix styles d'affiche, exportés en 300 DPI pour un tirage A1. Dans le navigateur, sans compte ni clé d'API.",
                },
                kimpay: {
                    desc: "Dépenses de groupe, au centime près",
                    about: "Pas de compte, juste un lien : chacun ajoute ce qu'il a payé, et l'appli calcule qui doit quoi en un minimum de virements.",
                },
                mixera: {
                    desc: "Un quiz musical : devinez l'année",
                    about: "Cinq modes de jeu, de l'année exacte d'une chanson au blind test. Se joue aussi avec les cartes Hitster.",
                },
                haNaolib: {
                    desc: "Les transports nantais dans Home Assistant",
                    about: "Les départs de bus, tram et navette fluviale du réseau Naolib en temps réel, et les vélos dispos à chaque station.",
                },
                ezloc: {
                    desc: "Location de vacances, avec son CMS",
                    about: "Le site vitrine d'une maison de vacances : textes, photos, tarifs et SEO se modifient dans un PocketBase auto-hébergé.",
                },
                cookim: {
                    desc: "Recettes, menus, listes de courses",
                    about: "Mes recettes au même endroit, un weekend ou une semaine de repas planifiés, et la liste de courses déjà fusionnée.",
                },
                tcgPortfolio: {
                    desc: "Le site sur lequel vous êtes",
                    about: "Boosters, holo et physique des cartes en JS vanilla, sans étape de build.",
                },
            },
        },

        "off-the-clock": {
            tagline: "La vie hors du travail",
            cards: {
                cycling: {
                    header: { name: "Vélo" },
                    body: {
                        row1: {
                            desc: "Les sacoches sur le vélo et quelques jours sur la route, de Nantes jusqu'où ça mène.",
                        },
                        row2: { title: "Roulez avec moi", desc: "Les sorties, et les pauses en chemin." },
                    },
                    footer: { text: "Base : Nantes" },
                },
                photography: {
                    header: { name: "Photographie" },
                    body: {
                        row1: {
                            title: "À travers l'objectif",
                            desc: "Des instants saisis en chemin, sur la route ou en ville.",
                        },
                        row2: { title: "Voir les photos" },
                    },
                    footer: { text: "Partagé sur Instagram" },
                },
                cinema: {
                    header: { name: "Cinéma" },
                    body: {
                        row1: {
                            title: "Le grand écran",
                            desc: "Une salle noire, un grand écran, et une histoire qui reste après le générique.",
                        },
                        row2: {
                            title: "Parler cinéma",
                            desc: "Toujours partant pour une recommandation, à donner ou à recevoir.",
                        },
                    },
                },
                nantes: {
                    body: {
                        row1: {
                            title: "Art et industrie",
                            desc: "D'anciens chantiers navals devenus terrains de jeu, et un éléphant mécanique qui se promène sur l'île de Nantes.",
                        },
                        row2: { title: "Port d'attache", desc: "Là où je vis, travaille et roule." },
                    },
                    footer: { text: "Base : Nantes" },
                },
                follow: {
                    header: { name: "Me suivre" },
                    body: {
                        row1: {
                            title: "Vélo, photos et films",
                            desc: "Ce que je fais en dehors du travail, partagé au fil de l'eau.",
                        },
                        row2: { title: "Me trouver" },
                    },
                    footer: { text: "Langues : FR / EN" },
                },
            },
        },

        secret: {
            tagline: "Toutes les cartes vues",
            cards: {
                "lets-talk": {
                    header: { stage: "Rare secrète", name: "Parlons-en", hpLabel: "CARTES" },
                    body: {
                        row1: {
                            title: "Vous les avez toutes vues",
                            desc: "Toutes les cartes sont sorties. Si vous avez tenu jusqu'ici, on devrait sans doute discuter.",
                        },
                        row2: { title: "Me contacter" },
                    },
                    footer: { text: "Statut : ouvert aux opportunités" },
                    back: {
                        title: "La suite",
                        items: [
                            { label: "Email", text: "contact@antoine.kim" },
                            { label: "LinkedIn", text: "in/antoine-kim" },
                            { label: "Basé à", text: "Nantes, France" },
                            { label: "Statut", text: "Ouvert aux opportunités" },
                            { label: "Collection", text: "Complète. Bien joué." },
                        ],
                    },
                },
            },
        },
    },
};
