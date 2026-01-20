import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/common/GlassCard';
import ThemeToggle from '../components/common/ThemeToggle';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

const LoginPage = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async () => {
        setError('');
        try {
            const normalizedUserId = userId.trim();
            const response = await axiosInstance.post('/api/auth/login', { userId: normalizedUserId, password });
            const data = response.data;

            if (data.accessToken) {
                login(data.accessToken, { userName: data.userName });
                if (data.userName) {
                    localStorage.setItem('userName', data.userName);
                }
            }

            navigate('/mainboard');
        } catch (err) {
            console.error('Login error:', err);
            if (err.response && err.response.data) {
                setError(err.response.data.message || '로그인에 실패했습니다.');
            } else {
                setError('서버 연결에 실패했습니다.');
            }
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="min-h-screen flex items-center justify-center p-6 text-[color:var(--text)]"
            style={{ background: 'linear-gradient(135deg, var(--bg-1), var(--bg-2), var(--bg-3))' }}
        >
            <ThemeToggle className="fixed top-6 right-6 z-50" />
            <GlassCard className="w-full max-w-md p-12 relative">
                <button
                    onClick={() => navigate('/')}
                    className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-[color:var(--surface-muted)] hover:bg-[color:var(--border)] transition text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
                >
                    <X size={20} />
                </button>

                <h2 className="text-3xl font-bold mb-2">반가워요!</h2>
                <p className="text-[color:var(--text-muted)] mb-10">계정에 로그인하여 시작하세요.</p>

                {error && (
                    <div className="mb-4 p-3 bg-[color:var(--danger-bg)] border border-[color:var(--danger)]/30 rounded-lg text-[color:var(--danger)] text-sm text-center">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div className="relative">
                        <Mail className="absolute left-4 top-4 text-[color:var(--text-soft)]" size={20} />
                        <input
                            type="text"
                            placeholder="아이디"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            className="w-full pl-12 p-4 rounded-2xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] transition"
                        />
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-4 top-4 text-[color:var(--text-soft)]" size={20} />
                        <input
                            type="password"
                            placeholder="비밀번호"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-12 p-4 rounded-2xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] transition"
                        />
                    </div>
                    <div className="flex justify-end text-sm text-[color:var(--text-muted)]">
                        <button
                            type="button"
                            onClick={() => navigate('/find-password')}
                            className="hover:text-[color:var(--text)] transition"
                        >
                            비밀번호 찾기
                        </button>
                    </div>
                    <button
                        onClick={handleLogin}
                        className="w-full py-4 bg-[color:var(--accent)] text-[color:var(--accent-contrast)] rounded-2xl font-bold hover:bg-[color:var(--accent-strong)] transition mt-4 shadow-[0_10px_30px_var(--shadow)]"
                    >
                        로그인
                    </button>
                </div>
                <p className="mt-8 text-center text-[color:var(--text-muted)]">
                    계정이 없으신가요?{' '}
                    <button
                        onClick={() => navigate('/signup')}
                        className="text-[color:var(--text)] font-semibold underline underline-offset-4 ml-1"
                    >
                        회원가입
                    </button>
                </p>
            </GlassCard>
        </motion.div>
    );
};

export default LoginPage;
