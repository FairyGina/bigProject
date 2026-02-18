const getStorageOrder = (preferSession) =>
    preferSession ? [sessionStorage, localStorage] : [localStorage, sessionStorage];

export const readLocalStorage = (key) => localStorage.getItem(key);

export const readSessionStorage = (key) => sessionStorage.getItem(key);

export const writeLocalStorage = (key, value) => localStorage.setItem(key, value);

export const writeSessionStorage = (key, value) => sessionStorage.setItem(key, value);

export const removeLocalStorage = (key) => localStorage.removeItem(key);

export const removeSessionStorage = (key) => sessionStorage.removeItem(key);

export const readFromStorage = (key, { preferSession = true } = {}) => {
    const ordered = getStorageOrder(preferSession);
    for (const store of ordered) {
        const value = store.getItem(key);
        if (value != null) {
            return value;
        }
    }
    return null;
};

export const safeParseJson = (value) => {
    if (!value) {
        return null;
    }
    try {
        return JSON.parse(value);
    } catch (err) {
        return null;
    }
};

export const readJsonFromStorage = (key, { preferSession = true } = {}) => {
    const cached = readFromStorage(key, { preferSession });
    return safeParseJson(cached);
};

export const writeToStorages = (key, value, { session = true, local = true } = {}) => {
    if (session) {
        sessionStorage.setItem(key, value);
    }
    if (local) {
        localStorage.setItem(key, value);
    }
};

export const removeFromStorages = (key, { session = true, local = true } = {}) => {
    if (session) {
        sessionStorage.removeItem(key);
    }
    if (local) {
        localStorage.removeItem(key);
    }
};

export const safeWriteToStorage = (key, value, { session = true, local = true } = {}) => {
    try {
        writeToStorages(key, value, { session, local });
        return true;
    } catch (err) {
        return false;
    }
};

export const safeRemoveFromStorage = (key, { session = true, local = true } = {}) => {
    try {
        removeFromStorages(key, { session, local });
    } catch (err) {
    }
};
