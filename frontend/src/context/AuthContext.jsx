<<<<<<< HEAD
import React, { createContext, useState, useEffect, useContext } from 'react';
=======
﻿import React, { createContext, useState, useEffect, useContext } from 'react';
>>>>>>> upstream/UI3

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
<<<<<<< HEAD
        // 앱 시작 시 토큰 확인
        const token = localStorage.getItem('accessToken');
        if (token) {
            // 실제 앱에서는 여기서 /api/user/me 등을 호출하여 토큰 유효성을 검증하고 유저 정보를 받아옴
            // 지금은 단순히 토큰이 있으면 로그인 된 것으로 간주
=======
        // 초기 로딩 시 CSRF 토큰 발급
        fetch('http://localhost:8080/api/csrf', { credentials: 'include' })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data?.token) {
                    localStorage.setItem('csrfToken', data.token);
                }
            })
            .catch(() => {});

        const token = localStorage.getItem('accessToken');
        if (token) {
>>>>>>> upstream/UI3
            setUser({ token });
        }
        setLoading(false);
    }, []);

    const login = (token, userData = {}) => {
        localStorage.setItem('accessToken', token);
        setUser({ token, ...userData });
    };

    const logout = () => {
        localStorage.removeItem('accessToken');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
