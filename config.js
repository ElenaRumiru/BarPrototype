// === DOM Элементы ===
export const sofas = document.querySelectorAll('.sofa');
export const earningsCounter = document.getElementById('earnings-counter');
export const guestsServedCounter = document.getElementById('guests-served-counter');
export const orderButtons = document.querySelectorAll('.order-btn');
export const socialButtons = document.querySelectorAll('.social-btn');
export const startButton = document.getElementById('start-button');
export const shiftTimerDisplay = document.getElementById('shift-timer-display');
export const retainGuestBtn = document.getElementById('retain-guest-btn');
export const logOutput = document.getElementById('log-output');

// === Настройки из полей ввода ===
export const shiftTimeInput = document.getElementById('shift-time');
export const orderTimeInput = document.getElementById('order-time');
export const minOrdersInput = document.getElementById('min-orders');
export const maxOrdersInput = document.getElementById('max-orders');
export const guestCooldownInput = document.getElementById('guest-cooldown');
export const globalCooldownInput = document.getElementById('global-cooldown');
export const newGuestDelayInput = document.getElementById('new-guest-delay');
export const socialRequestTimeInput = document.getElementById('social-request-time');
export const failPenaltyTimeInput = document.getElementById('fail-penalty-time');
export const retainPrepTimeInput = document.getElementById('retain-prep-time');
export const retainAbilityCooldownInput = document.getElementById('retain-ability-cooldown');

// НОВЫЙ ОБЪЕКТ: Настройки для классов гостей
export const guestClassInputs = {
    poor: {
        displayName: 'Нищий',
        stayTime: document.getElementById('stay-time-poor'),
        maxRetain: document.getElementById('max-retain-poor'),
        weight: document.getElementById('weight-poor'),
    },
    middle: {
        displayName: 'Средний класс',
        stayTime: document.getElementById('stay-time-middle'),
        maxRetain: document.getElementById('max-retain-middle'),
        weight: document.getElementById('weight-middle'),
    },
    business: {
        displayName: 'Бизнесмен',
        stayTime: document.getElementById('stay-time-business'),
        maxRetain: document.getElementById('max-retain-business'),
        weight: document.getElementById('weight-business'),
    }
};

// ИСПРАВЛЕНИЕ: Эти объекты были пустыми, я их заполнил
export const prepTimeInputs = {
    'drink-red': document.getElementById('prep-drink-red'),
    'drink-blue': document.getElementById('prep-drink-blue'),
    'drink-green': document.getElementById('prep-drink-green'),
    'drink-yellow': document.getElementById('prep-drink-yellow'),
};

export const priceInputs = {
    'drink-red': document.getElementById('price-drink-red'),
    'drink-blue': document.getElementById('price-drink-blue'),
    'drink-green': document.getElementById('price-drink-green'),
    'drink-yellow': document.getElementById('price-drink-yellow'),
};

// === Игровые константы ===
export const ORDER_TYPES = ['drink-red', 'drink-blue', 'drink-green', 'drink-yellow'];
export const ORDER_ICONS = { 'drink-red': '🍷', 'drink-blue': '🍹', 'drink-green': '🍸', 'drink-yellow': '🍺' };
export const SOCIAL_TYPES = ['heart', 'chat', 'fun'];
export const SOCIAL_ICONS = { 'heart': '❤️', 'chat': '💬', 'fun': '🔥' };
export const RETAIN_ICON = '⏰';