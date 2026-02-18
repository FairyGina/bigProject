import {
    readLocalStorage,
    removeLocalStorage,
    writeLocalStorage,
} from './storage';

export const getAccessToken = () => readLocalStorage('accessToken');

export const setAccessToken = (token) => writeLocalStorage('accessToken', token);

export const clearAccessToken = () => removeLocalStorage('accessToken');

export const getCsrfToken = () => readLocalStorage('csrfToken');

export const setCsrfToken = (token) => writeLocalStorage('csrfToken', token);
