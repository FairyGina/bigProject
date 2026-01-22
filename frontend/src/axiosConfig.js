import axios from 'axios';

// Axios instance
const axiosInstance = axios.create({
    baseURL: 'http://localhost:8080',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

axiosInstance.defaults.xsrfCookieName = 'XSRF-TOKEN';
axiosInstance.defaults.xsrfHeaderName = 'X-XSRF-TOKEN';

// Request interceptor: attach token
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        const csrfToken = localStorage.getItem('csrfToken');
        if (csrfToken && !config.headers['X-XSRF-TOKEN']) {
            config.headers['X-XSRF-TOKEN'] = csrfToken;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor: handle 401
axiosInstance.interceptors.response.use(
    (response) => {
        if (response.config?.url?.includes('/api/csrf') && response.data?.token) {
            localStorage.setItem('csrfToken', response.data.token);
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
                localStorage.removeItem('accessToken');
                // Optionally redirect to login: window.location.href = '/'
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
