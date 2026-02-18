import axios from 'axios';
import {
    clearAccessToken,
    getAccessToken,
    getCsrfToken,
    setCsrfToken,
} from './utils/authStorage';

// Axios 인스턴스
const axiosInstance = axios.create({
    baseURL: 'http://localhost:8080',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

axiosInstance.defaults.xsrfCookieName = 'XSRF-TOKEN';
axiosInstance.defaults.xsrfHeaderName = 'X-XSRF-TOKEN';

// 요청 인터셉터: 토큰 첨부
axiosInstance.interceptors.request.use(
    (config) => {
        const token = getAccessToken();
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        const csrfToken = getCsrfToken();
        if (csrfToken && !config.headers['X-XSRF-TOKEN']) {
            config.headers['X-XSRF-TOKEN'] = csrfToken;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 응답 인터셉터: 401 처리
axiosInstance.interceptors.response.use(
    (response) => {
        if (response.config?.url?.includes('/api/csrf') && response.data?.token) {
            setCsrfToken(response.data.token);
        }
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            const requestUrl = error.config?.url || '';
            const isPasswordCheck = requestUrl.includes('/api/user/verify-password');
            const isProfileUpdate = requestUrl.includes('/api/user/me');
            const errorCode = error.response?.data?.errorCode;
            const isPasswordMismatch = errorCode === 'PASSWORD_MISMATCH';
            if (!isPasswordCheck && !isProfileUpdate && !isPasswordMismatch) {
                clearAccessToken();
                // 필요 시 로그인으로 이동: window.location.href = '/'
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
