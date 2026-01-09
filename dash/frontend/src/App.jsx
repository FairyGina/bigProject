import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import Dashboard from './pages/Dashboard';

export default function App() {
    const [view, setView] = useState('main'); // 'main', 'login', 'signup', 'dashboard'

    // 앱 로드 시 토큰 확인
    React.useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            // 토큰이 있으면 대시보드로 이동 (또는 /api/user/me 호출로 유효성 검증 권장)
            setView('dashboard');
        }
    }, []);

    return (
        <div className="font-sans antialiased bg-black min-h-screen selection:bg-blue-500/30">
            <AnimatePresence mode="wait">
                {view === 'main' && <LandingPage key="main" setView={setView} />}
                {view === 'login' && <LoginPage key="login" setView={setView} />}
                {view === 'signup' && <SignUpPage key="signup" setView={setView} />}
                {view === 'dashboard' && <Dashboard key="dashboard" setView={setView} />}
            </AnimatePresence>
        </div>
    );
}
