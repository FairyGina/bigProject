import axios from 'axios';

// Axios 인스턴스 생성
const axiosInstance = axios.create({
    baseURL: 'http://localhost:8080', // 백엔드 주소
    headers: {
        'Content-Type': 'application/json',
    },
});

// 요청 인터셉터: 모든 요청 헤더에 토큰 추가
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 응답 인터셉터: 401 에러(인증 만료 등) 처리
axiosInstance.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            // 토큰 만료 또는 유효하지 않음 -> 로그아웃 처리
            localStorage.removeItem('accessToken');
            // 필요 시 리다이렉트 (window.location.href = '/')
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
