import * as config from './config.js';
import { startGame, resetGame, findAndFulfillSocialRequest, findAndPrepareBarOrder, prepareRetentionMinigame } from './gameLogic.js';

// === ОБРАБОТЧИКИ КНОПОК ===

config.startButton.addEventListener('click', startGame);

config.retainGuestBtn.addEventListener('click', prepareRetentionMinigame);

config.socialButtons.forEach(button => {
    button.addEventListener('click', () => {
        if (!config.startButton.disabled) return;
        findAndFulfillSocialRequest(button.dataset.socialType);
    });
});

config.orderButtons.forEach(button => {
    button.addEventListener('click', () => {
        if (button.disabled || !config.startButton.disabled) return;
        findAndPrepareBarOrder(button.dataset.orderType);
    });
});

// Первоначальный сброс игры при загрузке страницы
document.addEventListener('DOMContentLoaded', resetGame);