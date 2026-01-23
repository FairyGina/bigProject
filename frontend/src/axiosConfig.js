import axios from 'axios';

<<<<<<< HEAD
// Axios 인스턴스 생성
const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api', // Nginx 역방향 프록시 활용
    headers: {
        'Content-Type': 'application/json',
    },
});

// 요청 인터셉터: 모든 요청 헤더에 토큰 추가
=======
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
>>>>>>> upstream/UI3
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
<<<<<<< HEAD
=======
        const csrfToken = localStorage.getItem('csrfToken');
        if (csrfToken && !config.headers['X-XSRF-TOKEN']) {
            config.headers['X-XSRF-TOKEN'] = csrfToken;
        }
>>>>>>> upstream/UI3
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

<<<<<<< HEAD
// 응답 인터셉터: 401 에러(인증 만료 등) 처리
axiosInstance.interceptors.response.use(
    (response) => {
=======
// Response interceptor: handle 401
axiosInstance.interceptors.response.use(
    (response) => {
        if (response.config?.url?.includes('/api/csrf') && response.data?.token) {
            localStorage.setItem('csrfToken', response.data.token);
        }
>>>>>>> upstream/UI3
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
<<<<<<< HEAD
            // 토큰 만료 또는 유효하지 않음 -> 로그아웃 처리
            localStorage.removeItem('accessToken');
            // 필요 시 리다이렉트 (window.location.href = '/')
=======
            const requestUrl = error.config?.url || '';
            const isPasswordCheck = requestUrl.includes('/api/user/verify-password');
            const isProfileUpdate = requestUrl.includes('/api/user/me');
            const errorCode = error.response?.data?.errorCode;
            const isPasswordMismatch = errorCode === 'PASSWORD_MISMATCH';
            if (!isPasswordCheck && !isProfileUpdate && !isPasswordMismatch) {
                localStorage.removeItem('accessToken');
                // Optionally redirect to login: window.location.href = '/'
            }
>>>>>>> upstream/UI3
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
