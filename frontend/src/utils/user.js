import { readLocalStorage, writeLocalStorage } from './storage';

export const getStoredUserName = (user, fallback = '') =>
    user?.userName || readLocalStorage('userName') || fallback;

export const getStoredUserId = (user) => user?.userId || readLocalStorage('userId') || null;

export const maskUserName = (name) => {
    if (!name) {
        return '*';
    }
    return name.length <= 1 ? '*' : `${name.slice(0, -1)}*`;
};

export const storeUserIdentity = ({ userName, userId }) => {
    if (userName) {
        writeLocalStorage('userName', userName);
    }
    if (userId) {
        writeLocalStorage('userId', userId);
    }
};
