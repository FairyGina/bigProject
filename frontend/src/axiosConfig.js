import axios from 'axios';

<<<<<<< HEAD
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
=======
// Axios 인스턴스
const axiosInstance = axios.create({
    baseURL: 'http://localhost:8080',
>>>>>>> upstream/UI5
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

axiosInstance.defaults.xsrfCookieName = 'XSRF-TOKEN';
axiosInstance.defaults.xsrfHeaderName = 'X-XSRF-TOKEN';

<<<<<<< HEAD
// Request interceptor: attach token & CSRF
axiosInstance.interceptors.request.use(
    (config) => {
        // JWT 토큰 추가
=======
// 요청 인터셉터: 토큰 첨부
axiosInstance.interceptors.request.use(
    (config) => {
>>>>>>> upstream/UI5
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
<<<<<<< HEAD

        // POST, PUT, DELETE 등 변경 요청 시 CSRF 토큰 최신화
        const method = config.method?.toUpperCase();
        if (method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
            const csrfToken = getCookie('XSRF-TOKEN');
            if (csrfToken) {
                config.headers['X-XSRF-TOKEN'] = csrfToken;
            }
        }

=======
        const csrfToken = localStorage.getItem('csrfToken');
        if (csrfToken && !config.headers['X-XSRF-TOKEN']) {
            config.headers['X-XSRF-TOKEN'] = csrfToken;
        }
>>>>>>> upstream/UI5
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

<<<<<<< HEAD
// Response interceptor: handle 401
axiosInstance.interceptors.response.use(
    (response) => {
=======
// 응답 인터셉터: 401 처리
axiosInstance.interceptors.response.use(
    (response) => {
        if (response.config?.url?.includes('/api/csrf') && response.data?.token) {
            localStorage.setItem('csrfToken', response.data.token);
        }
>>>>>>> upstream/UI5
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            const requestUrl = error.config?.url || '';
<<<<<<< HEAD
            const isPasswordCheck = requestUrl.includes('/user/verify-password');
            const isProfileUpdate = requestUrl.includes('/user/me');
=======
            const isPasswordCheck = requestUrl.includes('/api/user/verify-password');
            const isProfileUpdate = requestUrl.includes('/api/user/me');
>>>>>>> upstream/UI5
            const errorCode = error.response?.data?.errorCode;
            const isPasswordMismatch = errorCode === 'PASSWORD_MISMATCH';
            if (!isPasswordCheck && !isProfileUpdate && !isPasswordMismatch) {
                localStorage.removeItem('accessToken');
<<<<<<< HEAD
                // Optionally redirect to login: window.location.href = '/'
=======
                // 필요 시 로그인으로 이동: window.location.href = '/'
>>>>>>> upstream/UI5
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
