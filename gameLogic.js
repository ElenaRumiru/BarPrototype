import * as config from './config.js';

// === Игровое состояние ===
let earnings = 0, guestsServed = 0, guestCounter = 0;
let guests = new Array(5).fill(null);
let activeBarOrders = new Map();
let canCreateNewOrder = true;
let isShiftActive = false;
let gameInterval = null, shiftInterval = null, guestSpawnerInterval = null, nextGuestTimeouts = {};
let guestRequestingRetention = null;
const GUARANTEED_RETENTION_CHANCE = 1;
let isRetainAbilityOnCooldown = false;
let retainAbilityCooldownInterval = null;

// === УПРАВЛЕНИЕ ИГРОВЫМ ЦИКЛОМ ===
export function startGame() {
    resetGame(); 
    config.startButton.disabled = true;
    isShiftActive = true;
    let shiftTimeRemaining = parseInt(config.shiftTimeInput.value, 10);
    updateShiftTimerDisplay(shiftTimeRemaining);
    shiftInterval = setInterval(() => {
        shiftTimeRemaining--;
        updateShiftTimerDisplay(shiftTimeRemaining);
        if (shiftTimeRemaining <= 0) {
            endShift();
        }
    }, 1000);
    seatInitialGuestsRandomly();
    gameInterval = setInterval(manageOrders, 500);
}

function endShift() {
    isShiftActive = false;
    clearInterval(shiftInterval); shiftInterval = null;
    clearInterval(gameInterval); gameInterval = null;
    clearInterval(guestSpawnerInterval); guestSpawnerInterval = null;
    clearInterval(retainAbilityCooldownInterval); retainAbilityCooldownInterval = null;
    for (const index in nextGuestTimeouts) { clearTimeout(nextGuestTimeouts[index]); }
    nextGuestTimeouts = {};

    logEvent(`🏁 Смена окончена! Итог: ${earnings}$ заработано, ${guestsServed} гостей обслужено.`, 'log-summary');

    guests.forEach((guest, index) => {
        if (guest) {
            clearInterval(guest.stayInterval);
            clearInterval(guest.socialInterval);
            clearInterval(guest.barOrderInterval);
            clearInterval(guest.retainInterval);
        }
        config.sofas[index].innerHTML = `Диван ${index + 1}`;
        config.sofas[index].classList.remove('occupied');
    });
    config.orderButtons.forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('needs-attention');
        const overlay = btn.querySelector('.prep-overlay');
        overlay.style.transition = 'none';
        overlay.style.width = '0%';
    });
    config.socialButtons.forEach(btn => btn.classList.remove('needs-attention'));
    config.retainGuestBtn.disabled = true;
    config.retainGuestBtn.classList.remove('is-active');
    config.retainGuestBtn.classList.remove('on-cooldown');
    config.retainGuestBtn.classList.remove('is-preparing');


    if (config.shiftTimerDisplay.textContent !== "00:00") {
         config.shiftTimerDisplay.textContent = "Смена окончена!";
    }
    config.startButton.disabled = false;
}

export function resetGame() {
    if (isShiftActive) endShift();
    earnings = 0; config.earningsCounter.textContent = '0';
    guestsServed = 0; config.guestsServedCounter.textContent = '0';
    guestCounter = 0;
    activeBarOrders.clear();
    canCreateNewOrder = true;
    guestRequestingRetention = null;
    isRetainAbilityOnCooldown = false;
    clearInterval(retainAbilityCooldownInterval);
    config.retainGuestBtn.disabled = true;
    config.retainGuestBtn.classList.remove('is-active');
    config.retainGuestBtn.classList.remove('on-cooldown');
    config.retainGuestBtn.classList.remove('is-preparing');
    config.logOutput.innerHTML = '';
    for (let i = 0; i < guests.length; i++) {
        guests[i] = null;
        config.sofas[i].innerHTML = `Диван ${i + 1}`;
        config.sofas[i].classList.remove('occupied');
    }
    updateShiftTimerDisplay(parseInt(config.shiftTimeInput.value, 10));
}

function updateShiftTimerDisplay(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    config.shiftTimerDisplay.textContent = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function logEvent(message, className = '') {
    const logEntry = document.createElement('p');
    logEntry.textContent = message;
    if (className) {
        logEntry.classList.add(className);
    }
    config.logOutput.prepend(logEntry);
}

function seatInitialGuestsRandomly() {
    let availableSofaIndexes = [0, 1, 2, 3, 4];
    let guestsToSeat = 5;
    guestSpawnerInterval = setInterval(() => {
        if (!isShiftActive || guestsToSeat <= 0) { clearInterval(guestSpawnerInterval); return; }
        if (availableSofaIndexes.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableSofaIndexes.length);
            const sofaIndex = availableSofaIndexes.splice(randomIndex, 1)[0];
            createGuest(sofaIndex);
            guestsToSeat--;
        }
    }, 5000);
}

function selectRandomGuestClass() {
    const weights = {
        poor: parseInt(config.guestClassInputs.poor.weight.value, 10),
        middle: parseInt(config.guestClassInputs.middle.weight.value, 10),
        business: parseInt(config.guestClassInputs.business.weight.value, 10),
    };
    const totalWeight = weights.poor + weights.middle + weights.business;
    if (totalWeight === 0) return 'middle';
    
    let random = Math.random() * totalWeight;

    if (random < weights.poor) {
        return 'poor';
    } else if (random < weights.poor + weights.middle) {
        return 'middle';
    } else {
        return 'business';
    }
}

function createGuest(index) {
    if (guests[index] !== null || !isShiftActive) return;
    guestCounter++;
    
    const guestClassKey = selectRandomGuestClass();
    const guestClassConfig = config.guestClassInputs[guestClassKey];

    const sofaElement = config.sofas[index];
    sofaElement.classList.add('occupied');
    const socialType = config.SOCIAL_TYPES[Math.floor(Math.random() * config.SOCIAL_TYPES.length)];
    const socialTime = parseInt(config.socialRequestTimeInput.value, 10);
    const initialStayTime = parseInt(guestClassConfig.stayTime.value, 10);

    guests[index] = {
        number: guestCounter,
        classKey: guestClassKey,
        maxRetainRequests: parseInt(guestClassConfig.maxRetain.value, 10),
        state: 'awaiting_social',
        loyalty: 0,
        moneySpent: 0,
        ordersMade: 0,
        retentionChances: 0,
        initialStayTime: initialStayTime,
        stayTimer: initialStayTime,
        socialRequest: { type: socialType, timer: socialTime },
        barOrder: null, onCooldown: false, 
        stayInterval: null, 
        socialInterval: null, 
        barOrderInterval: null, 
        retainInterval: null,
    };

    sofaElement.innerHTML = `
        <div class="guest-info">
            <p class="guest-name ${guestClassKey}">${guestClassConfig.displayName}</p>
            <div class="guest-timer">--:--</div>
            <div class="guest-stars"></div>
        </div>
        <div class="order-container">
            <div id="request-${index}" class="order-icon social-${socialType}">${config.SOCIAL_ICONS[socialType]}<div class="order-timer-overlay"></div></div>
        </div>`;
    
    guests[index].socialInterval = setInterval(() => {
        const guest = guests[index];
        if (!guest || !guest.socialRequest) { clearInterval(guest.socialInterval); return; }
        guest.socialRequest.timer--;
        updateOrderTimerVisual(guest.socialRequest, `request-${index}`, socialTime);
        if (guest.socialRequest.timer <= 0) removeGuest(index);
    }, 1000);
}

export function fulfillSocialRequest(guestIndex) {
    const guest = guests[guestIndex];
    if (!guest || guest.state !== 'awaiting_social') return;
    guestsServed++;
    config.guestsServedCounter.textContent = guestsServed;
    clearInterval(guest.socialInterval);
    guest.socialInterval = null;
    const requestIconElement = document.getElementById(`request-${guestIndex}`);
    if (requestIconElement) requestIconElement.classList.add('order-fulfilled');
    setTimeout(() => {
        const currentGuest = guests[guestIndex];
        if (!currentGuest || currentGuest.state !== 'awaiting_social') return;
        currentGuest.socialRequest = null;
        currentGuest.state = 'active';
        const sofaElement = config.sofas[guestIndex];
        sofaElement.querySelector('.order-container').innerHTML = '';
        const starsContainer = sofaElement.querySelector('.guest-stars');
        if (starsContainer) starsContainer.style.visibility = 'visible';
        updateStarDisplay(guestIndex, false); 
        const timerDisplay = sofaElement.querySelector('.guest-timer');
        timerDisplay.textContent = `${currentGuest.stayTimer}с`;
        currentGuest.stayInterval = setInterval(() => {
            const g = guests[guestIndex];
            if (!g || !isShiftActive) { if (g) clearInterval(g.stayInterval); return; }
            g.stayTimer--;
            if (timerDisplay) timerDisplay.textContent = `${g.stayTimer}с`;
            if (g.stayTimer === 10) {
                if (g.barOrder || g.state !== 'active' || g.retentionChances >= g.maxRetainRequests) { return; }
                const roll = Math.random() * 100;
                const guaranteedChance = g.loyalty >= 100 && g.retentionChances < GUARANTEED_RETENTION_CHANCE;
                if (roll < g.loyalty || guaranteedChance) {
                    triggerRetentionRequest(guestIndex);
                }
            }
            if (g.stayTimer <= 0) removeGuest(guestIndex);
        }, 1000);
        currentGuest.onCooldown = true;
        setTimeout(() => { if (guests[guestIndex] && isShiftActive) guests[guestIndex].onCooldown = false; }, parseInt(config.guestCooldownInput.value, 10) * 1000);
    }, 500);
}

function removeGuest(index) {
    const guest = guests[index];
    if (!guest) return;
    const timeSpent = guest.initialStayTime - guest.stayTimer;
    const className = config.guestClassInputs[guest.classKey].displayName;
    logEvent(`- Гость ${guest.number} [${className}] ушел. Пробыл: ${timeSpent}с. Потратил: ${guest.moneySpent}$. Заказов: ${guest.ordersMade}. Лояльность: ${guest.loyalty}%`);
    clearInterval(guest.stayInterval);
    clearInterval(guest.socialInterval);
    clearInterval(guest.barOrderInterval);
    clearInterval(guest.retainInterval);
    if (guest.barOrder) activeBarOrders.delete(index);
    if (guestRequestingRetention === index) {
        guestRequestingRetention = null;
        config.retainGuestBtn.disabled = true;
        config.retainGuestBtn.classList.remove('is-active');
    }
    guests[index] = null;
    const sofaElement = config.sofas[index];
    sofaElement.innerHTML = `Диван ${index + 1}`;
    sofaElement.classList.remove('occupied');
    const delay = parseFloat(config.newGuestDelayInput.value) * 1000;
    if (nextGuestTimeouts[index]) clearTimeout(nextGuestTimeouts[index]);
    nextGuestTimeouts[index] = setTimeout(() => {
        if (isShiftActive) createGuest(index);
        delete nextGuestTimeouts[index];
    }, delay);
}

function manageOrders() {
    if (!isShiftActive) return;
    updateWarnings();
    const minOrders = parseInt(config.minOrdersInput.value, 10);
    const maxOrders = parseInt(config.maxOrdersInput.value, 10);
    if (activeBarOrders.size < minOrders && canCreateNewOrder) {
        const availableGuests = guests.map((g, i) => i).filter(i => guests[i] && guests[i].state === 'active' && !guests[i].barOrder && !guests[i].onCooldown && guests[i].stayTimer > 11);
        if (availableGuests.length > 0 && activeBarOrders.size < maxOrders) {
            const randomGuestIndex = availableGuests[Math.floor(Math.random() * availableGuests.length)];
            createBarOrder(randomGuestIndex);
            canCreateNewOrder = false;
            setTimeout(() => { if (isShiftActive) canCreateNewOrder = true; }, parseInt(config.globalCooldownInput.value, 10) * 1000);
        }
    }
}

function createBarOrder(guestIndex) {
    const guest = guests[guestIndex];
    if (!guest || !isShiftActive) return;
    const orderType = config.ORDER_TYPES[Math.floor(Math.random() * config.ORDER_TYPES.length)];
    const orderTime = parseInt(config.orderTimeInput.value, 10);
    guest.barOrder = { type: orderType, timer: orderTime };
    activeBarOrders.set(guestIndex, guest.barOrder);
    const orderContainer = config.sofas[guestIndex].querySelector('.order-container');
    if (orderContainer) {
        orderContainer.innerHTML = `<div id="order-${guestIndex}" class="order-icon ${orderType}">${config.ORDER_ICONS[orderType]}<div class="order-timer-overlay"></div></div>`;
    }
    guest.barOrderInterval = setInterval(() => {
        const currentGuest = guests[guestIndex];
        if (!currentGuest || !currentGuest.barOrder || !isShiftActive) { if (currentGuest) clearInterval(currentGuest.barOrderInterval); return; }
        currentGuest.barOrder.timer--;
        updateOrderTimerVisual(currentGuest.barOrder, `order-${guestIndex}`, orderTime);
        if (currentGuest.barOrder.timer <= 0) fulfillBarOrder(guestIndex, false);
    }, 1000);
}

export function fulfillBarOrder(guestIndex, isSuccess) {
    const guest = guests[guestIndex];
    if (!guest || !guest.barOrder) return;
    const orderType = guest.barOrder.type;
    clearInterval(guest.barOrderInterval);
    guest.barOrderInterval = null;
    if (isSuccess) {
        guest.loyalty = Math.min(100, guest.loyalty + 25);
        updateStarDisplay(guestIndex, true);
        const price = parseInt(config.priceInputs[orderType].value, 10);
        earnings += price;
        guest.moneySpent += price;
        guest.ordersMade++;
        config.earningsCounter.textContent = earnings;
        const orderIconElement = document.getElementById(`order-${guestIndex}`);
        if (orderIconElement) orderIconElement.classList.add('order-fulfilled');
        setTimeout(() => {
            const currentGuest = guests[guestIndex];
            if (!currentGuest) return;
            activeBarOrders.delete(guestIndex);
            currentGuest.barOrder = null;
            const orderContainer = config.sofas[guestIndex].querySelector('.order-container');
            if (orderContainer) orderContainer.innerHTML = '';
            currentGuest.onCooldown = true;
            setTimeout(() => { if (guests[guestIndex] && isShiftActive) guests[guestIndex].onCooldown = false; }, parseInt(config.guestCooldownInput.value, 10) * 1000);
        }, 500);
    } else {
        const penalty = parseInt(config.failPenaltyTimeInput.value, 10);
        guest.stayTimer -= penalty;
        const sofaElement = config.sofas[guestIndex];
        const timerDisplay = sofaElement.querySelector('.guest-timer');
        if (timerDisplay) {
            timerDisplay.textContent = `${Math.max(0, guest.stayTimer)}с`;
        }
        if (guest.stayTimer <= 0) {
            removeGuest(guestIndex);
            return;
        }
        activeBarOrders.delete(guestIndex);
        guest.barOrder = null;
        const orderContainer = sofaElement.querySelector('.order-container');
        if (orderContainer) orderContainer.innerHTML = '';
        guest.onCooldown = true;
        setTimeout(() => { if (guests[guestIndex] && isShiftActive) guests[guestIndex].onCooldown = false; }, parseInt(config.guestCooldownInput.value, 10) * 1000);
    }
}

function updateWarnings() {
    config.socialButtons.forEach(btn => btn.classList.remove('needs-attention'));
    config.orderButtons.forEach(btn => btn.classList.remove('needs-attention'));
    guests.forEach((guest, index) => {
        const socialIcon = document.getElementById(`request-${index}`);
        const barIcon = document.getElementById(`order-${index}`);
        const retainIcon = document.getElementById(`retain-${index}`);
        if(socialIcon) socialIcon.classList.remove('is-expiring');
        if(barIcon) barIcon.classList.remove('is-expiring');
        if(retainIcon) retainIcon.classList.remove('is-expiring');
        
        if (!guest) return;
        if (guest.socialRequest && guest.socialRequest.timer <= 5) {
            if (socialIcon) socialIcon.classList.add('is-expiring');
            const button = document.querySelector(`.social-btn[data-social-type="${guest.socialRequest.type}"]`);
            if (button && !button.disabled) button.classList.add('needs-attention');
        }
        if (guest.barOrder && guest.barOrder.timer <= 5) {
            if (barIcon) barIcon.classList.add('is-expiring');
            const button = document.querySelector(`.order-btn[data-order-type="${guest.barOrder.type}"]`);
            if (button && !button.disabled) button.classList.add('needs-attention');
        }
        if (guest.retainRequest && guest.retainRequest.timer <= 3) {
            if (retainIcon) retainIcon.classList.add('is-expiring');
        }
    });
}

function triggerRetentionRequest(guestIndex) {
    const guest = guests[guestIndex];
    if (!guest || guest.state !== 'active' || guestRequestingRetention !== null || isRetainAbilityOnCooldown) return;
    guest.retentionChances++;
    guestRequestingRetention = guestIndex;
    config.retainGuestBtn.disabled = false;
    config.retainGuestBtn.classList.add('is-active');
    guest.state = 'awaiting_retain';
    const retainTime = 8;
    guest.retainRequest = { timer: retainTime };
    const orderContainer = config.sofas[guestIndex].querySelector('.order-container');
    if (orderContainer) {
        orderContainer.innerHTML = `<div id="retain-${guestIndex}" class="order-icon request-retain" data-guest-index="${guestIndex}">${config.RETAIN_ICON}<div class="order-timer-overlay"></div></div>`;
    }
    guest.retainInterval = setInterval(() => {
        if (!guest.retainRequest) { clearInterval(guest.retainInterval); return; }
        guest.retainRequest.timer--;
        updateOrderTimerVisual(guest.retainRequest, `retain-${guestIndex}`, retainTime);
        if (guest.retainRequest.timer <= 0) removeGuest(guestIndex);
    }, 1000);
}

function startRetentionMinigame() {
    const guestIndex = guestRequestingRetention;
    if (guestIndex === null || !isShiftActive) return;
    const guest = guests[guestIndex];
    if (!guest || guest.state !== 'awaiting_retain') return;
    
    guestRequestingRetention = null;
    config.retainGuestBtn.classList.remove('is-active');
    clearInterval(guest.retainInterval);
    guest.retainInterval = null;
    
    const isMinigameSuccess = true; 
    
    if (isMinigameSuccess) {
        logEvent(`⭐ Гость ${guest.number} [${config.guestClassInputs[guest.classKey].displayName}] остался ещё!`);
        guest.stayTimer = guest.initialStayTime;
        const timerDisplay = config.sofas[guestIndex].querySelector('.guest-timer');
        if(timerDisplay) timerDisplay.textContent = `${guest.stayTimer}с`;
        const orderContainer = config.sofas[guestIndex].querySelector('.order-container');
        if(orderContainer) orderContainer.innerHTML = '';
        guest.state = 'active';
        guest.onCooldown = true;
        setTimeout(() => {
            if (guests[guestIndex] && isShiftActive) guests[guestIndex].onCooldown = false;
        }, parseInt(config.guestCooldownInput.value, 10) * 1000);

        isRetainAbilityOnCooldown = true;
        config.retainGuestBtn.disabled = true;
        config.retainGuestBtn.classList.add('on-cooldown');
        let cooldownTime = parseInt(config.retainAbilityCooldownInput.value, 10);
        const cooldownTimerSpan = config.retainGuestBtn.querySelector('.cooldown-timer');
        cooldownTimerSpan.textContent = cooldownTime;

        retainAbilityCooldownInterval = setInterval(() => {
            cooldownTime--;
            cooldownTimerSpan.textContent = cooldownTime;
            if (cooldownTime <= 0) {
                clearInterval(retainAbilityCooldownInterval);
                isRetainAbilityOnCooldown = false;
                config.retainGuestBtn.classList.remove('on-cooldown');
            }
        }, 1000);

    } else {
        removeGuest(guestIndex);
    }
}

function updateStarDisplay(guestIndex, withAnimation) {
    const guest = guests[guestIndex];
    if (!guest) return;
    const starsContainer = config.sofas[guestIndex].querySelector('.guest-stars');
    if (!starsContainer) return;
    
    if (withAnimation) {
        starsContainer.classList.remove('level-up');
        void starsContainer.offsetWidth;
        starsContainer.classList.add('level-up');
    }

    const filledStars = guest.state === 'awaiting_social' ? 0 : 1 + Math.floor(guest.loyalty / 25);
    starsContainer.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const star = document.createElement('div');
        star.classList.add('star');
        if (i < filledStars) {
            star.classList.add('star-filled');
        } else {
            star.classList.add('star-empty');
        }
        starsContainer.appendChild(star);
    }
}

function updateOrderTimerVisual(order, elementId, totalTime) {
    if (!order) return;
    const overlay = document.querySelector(`#${elementId} .order-timer-overlay`);
    if (overlay) {
        const heightPercentage = 100 - (order.timer / totalTime) * 100;
        overlay.style.height = `${heightPercentage}%`;
    }
}

export function findAndFulfillSocialRequest(socialType) {
    for (let i = 0; i < guests.length; i++) {
        if (guests[i] && guests[i].socialRequest && guests[i].socialRequest.type === socialType) {
            fulfillSocialRequest(i);
            return;
        }
    }
}

export function findAndPrepareBarOrder(orderType) {
    let guestIndexToServe = -1;
    for (const [guestIndex, order] of activeBarOrders.entries()) {
        if (order.type === orderType) {
            guestIndexToServe = guestIndex;
            break;
        }
    }
    if (guestIndexToServe !== -1) {
        const prepTime = parseFloat(config.prepTimeInputs[orderType].value);
        const button = [...config.orderButtons].find(btn => btn.dataset.orderType === orderType);
        if (!button) return;
        const overlay = button.querySelector('.prep-overlay');
        button.disabled = true;
        button.classList.add('is-preparing');
        overlay.style.transition = `width ${prepTime}s linear`;
        overlay.style.width = '100%';
        setTimeout(() => {
            if (guests[guestIndexToServe] && guests[guestIndexToServe].barOrder && guests[guestIndexToServe].barOrder.type === orderType && isShiftActive) {
                fulfillBarOrder(guestIndexToServe, true);
            }
            button.disabled = false;
            button.classList.remove('is-preparing');
            overlay.style.transition = 'none';
            overlay.style.width = '0%';
        }, prepTime * 1000);
    }
}

export function prepareRetentionMinigame() {
    if (config.retainGuestBtn.disabled || !isShiftActive || config.retainGuestBtn.classList.contains('on-cooldown')) return;
    
    const prepTime = parseFloat(config.retainPrepTimeInput.value, 10);
    const button = config.retainGuestBtn;
    const overlay = button.querySelector('.prep-overlay');

    button.disabled = true;
    button.classList.add('is-preparing');
    overlay.style.transition = `width ${prepTime}s linear`;
    overlay.style.width = '100%';
    
    setTimeout(() => {
        startRetentionMinigame();
        button.classList.remove('is-preparing');
        overlay.style.transition = 'none';
        overlay.style.width = '0%';
    }, prepTime * 1000);
}