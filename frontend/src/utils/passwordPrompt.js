import {
    readFromStorage,
    removeLocalStorage,
    writeLocalStorage,
} from './storage';

const PROMPT_KEY = 'passwordChangePrompt';
const DEFERRED_UNTIL_KEY = 'passwordChangeDeferredUntil';

export const shouldShowPasswordChangePrompt = () => {
    const deferredUntil = readFromStorage(DEFERRED_UNTIL_KEY, { preferSession: false });
    const deferValid = deferredUntil && new Date(deferredUntil) > new Date();
    if (deferValid) {
        return false;
    }
    return readFromStorage(PROMPT_KEY, { preferSession: false }) === 'true';
};

export const getPasswordPromptDeferredUntil = () =>
    readFromStorage(DEFERRED_UNTIL_KEY, { preferSession: false });

export const setPasswordChangePrompt = () => {
    writeLocalStorage(PROMPT_KEY, 'true');
};

export const clearPasswordChangePrompt = () => {
    removeLocalStorage(PROMPT_KEY);
};

export const deferPasswordChangePrompt = (months = 3) => {
    const deferredAt = new Date();
    deferredAt.setMonth(deferredAt.getMonth() + months);
    writeLocalStorage(DEFERRED_UNTIL_KEY, deferredAt.toISOString());
    clearPasswordChangePrompt();
};

export const resetPasswordPromptDeferral = () => {
    removeLocalStorage(DEFERRED_UNTIL_KEY);
    clearPasswordChangePrompt();
};
