import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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
