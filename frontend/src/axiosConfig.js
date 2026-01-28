import axios from 'axios';

// 쿠키에서 특정 이름의 값을 읽는 헬퍼 함수
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// Axios instance
const axiosInstance = axios.create({
    // baseURL을 아예 제거하거나 '/'로 설정하여 브라우저가 현재 도메인을 쓰게 합니다.
    // 혹은 .env 파일 값을 그대로 쓰되, 호출할 때 /api를 중복하지 않도록 합니다.
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

axiosInstance.defaults.xsrfCookieName = 'XSRF-TOKEN';
axiosInstance.defaults.xsrfHeaderName = 'X-XSRF-TOKEN';

// Request interceptor: attach token & CSRF
axiosInstance.interceptors.request.use(
    (config) => {
        // JWT 토큰 추가
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        // POST, PUT, DELETE 등 변경 요청 시 CSRF 토큰 최신화
        const method = config.method?.toUpperCase();
        if (method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
            const csrfToken = getCookie('XSRF-TOKEN');
            if (csrfToken) {
                config.headers['X-XSRF-TOKEN'] = csrfToken;
            }
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
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            const requestUrl = error.config?.url || '';
            const isPasswordCheck = requestUrl.includes('/user/verify-password');
            const isProfileUpdate = requestUrl.includes('/user/me');
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
