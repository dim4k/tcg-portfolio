import { CONFIG } from '../config.js';
import { calculateYearsSince } from './utils.js';

export class CardRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    render() {
        if (!this.container) return;

        // Clear existing content (except swipe hint if it's inside, but swipe hint is usually first)
        // Actually, let's keep the swipe hint if it exists
        const swipeHint = this.container.querySelector('.swipe-hint-mobile');
        this.container.innerHTML = '';
        if (swipeHint) this.container.appendChild(swipeHint);

        CONFIG.CARDS.forEach((cardData, index) => {
            const cardElement = this.createCardElement(cardData, index);
            this.container.appendChild(cardElement);
        });
    }

    createCardElement(data, index) {
        const card = document.createElement('div');
        card.className = `card theme-${data.theme}`;
        card.dataset.pos = index;

        // HP Value logic
        let hpContent = '';
        if (data.header.hpType === 'dynamic-exp') {
            const exp = calculateYearsSince(CONFIG.CAREER_START_DATE);
            hpContent = `<span id="dynamic-exp">${exp}</span>Y`;
        } else if (data.header.hpType === 'dynamic-age') {
            const age = calculateYearsSince(CONFIG.BIRTH_DATE);
            hpContent = `<span id="dynamic-age">${age}</span>`;
        } else {
            hpContent = data.header.hpValue || '';
        }

        // Actions logic
        let actionsHtml = '';
        if (data.body.row2.actions) {
            actionsHtml = `<div class="action-btn-group">
                ${data.body.row2.actions.map(actionKey => {
                    const social = CONFIG.SOCIAL[actionKey];
                    return `<a href="${social.url}" class="action-btn ${social.class}" target="_blank" rel="noopener noreferrer">
                        <i class="${social.icon}"></i> ${social.label}
                    </a>`;
                }).join('')}
            </div>`;
        }

        card.innerHTML = `
            <div class="card-inner">
                <div class="card-header">
                    <div>
                        <div class="stage-label">${data.header.stage}</div>
                        <div class="card-name">${data.header.name}</div>
                    </div>
                    <div class="card-hp">
                        <span class="hp-label">${data.header.hpLabel}</span>${hpContent}
                    </div>
                </div>

                <div class="card-image-container">
                    <img src="${data.image}" alt="${data.header.name}" class="card-image" data-card="${data.id}">
                </div>

                <div class="card-body">
                    <div class="skill-row">
                        <div class="skill-desc">
                            <h3>${data.body.row1.title}</h3>
                            <p>${data.body.row1.desc}</p>
                        </div>
                        <div class="damage"><i class="${data.body.row1.icon}"></i></div>
                    </div>
                    
                    <div class="skill-row" style="flex-direction: column; align-items: flex-start;">
                        <div class="skill-desc">
                            <h3>${data.body.row2.title}</h3>
                            <p>${data.body.row2.desc}</p>
                        </div>
                        ${actionsHtml}
                    </div>
                </div>

                <div class="card-footer">
                    <div class="weakness">${data.footer.text}</div>
                    <div class="theme-switcher">
                        <button class="theme-btn" data-theme="dark" title="Dark"><i class="fas fa-circle"></i></button>
                        <button class="theme-btn" data-theme="ice" title="Ice"><i class="fas fa-snowflake"></i></button>
                        <button class="theme-btn" data-theme="fire" title="Fire"><i class="fas fa-fire"></i></button>
                        <button class="theme-btn" data-theme="electric" title="Electric"><i class="fas fa-bolt"></i></button>
                        <button class="theme-btn" data-theme="psychic" title="Psychic"><i class="fas fa-moon"></i></button>
                        <button class="theme-btn" data-theme="grass" title="Grass"><i class="fas fa-leaf"></i></button>
                    </div>
                </div>
            </div>
            <div class="texture-overlay"></div>
            <div class="holographic-grid"></div>
            <div class="holo-overlay"></div>
            <div class="glare"></div>
            <div class="glitter-layer"></div>
        `;

        return card;
    }
}
