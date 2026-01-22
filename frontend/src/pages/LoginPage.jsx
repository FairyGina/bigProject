import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/common/GlassCard';
import ThemeToggle from '../components/common/ThemeToggle';
import Footer from '../components/common/Footer';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

const LoginPage = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showResetModal, setShowResetModal] = useState(false);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [warningCount, setWarningCount] = useState(null);

    const handleSocialLogin = (provider) => {
        sessionStorage.setItem('oauthFlow', 'login');
        localStorage.setItem('oauthFlow', 'login');
        window.location.href = `http://localhost:8080/oauth2/authorization/${provider}`;
    };

    const handleLogin = async () => {
        setError('');
        setShowResetModal(false);
        setShowWarningModal(false);
        setWarningCount(null);
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!userId) {
            setError('아이디(이메일)를 입력해주세요.');
            return;
        }
        if (!password) {
            setError('비밀번호를 입력해주세요.');
            return;
        }
        if (!emailPattern.test(userId)) {
            setError('아이디를 이메일 형식으로 입력해주세요.');
            return;
        }
        try {
            await axiosInstance.get('/api/csrf');
            const response = await axiosInstance.post('/api/auth/login', { userId, password });
            const data = response.data;

            if (data.accessToken) {
                login(data.accessToken, { userName: data.userName });
                if (data.userName) {
                    localStorage.setItem('userName', data.userName);
                }
                if (data.userId) {
                    localStorage.setItem('userId', data.userId);
                } else {
                    localStorage.setItem('userId', userId);
                }
            }

            const deferredUntil = localStorage.getItem('passwordChangeDeferredUntil');
            const deferValid = deferredUntil && new Date(deferredUntil) > new Date();
            const changedAtRaw = data.passwordChangedAt || data.passwordExpiryAt;
            const changedAt = changedAtRaw ? new Date(changedAtRaw) : null;
            const expiryAt = changedAt ? new Date(changedAt) : null;
            if (expiryAt) {
                expiryAt.setMonth(expiryAt.getMonth() + 6);
            }
            const clientExpired = expiryAt && !Number.isNaN(expiryAt.getTime()) && new Date() > expiryAt;
            if (clientExpired && !data.socialAccount && !deferValid) {
                localStorage.setItem('passwordChangePrompt', 'true');
            } else {
                localStorage.removeItem('passwordChangePrompt');
            }

            navigate('/mainboard');
        } catch (err) {
            console.error('Login error:', err);
            const errorCode = err.response?.data?.errorCode;
            const backendMessage = err.response?.data?.message;
            if (errorCode === 'PASSWORD_RESET_REQUIRED') {
                setShowResetModal(true);
                return;
            }
            if (errorCode === 'PASSWORD_RESET_WARNING_3' || errorCode === 'PASSWORD_RESET_WARNING_4') {
                const count = errorCode === 'PASSWORD_RESET_WARNING_4' ? 4 : 3;
                setWarningCount(count);
                setShowWarningModal(true);
                return;
            }
            if (err.response?.status === 403) {
                setError('보안 토큰이 만료되었거나 권한이 없습니다. 새로고침 후 다시 시도해주세요.');
                return;
            }
            if (err.response && err.response.data) {
                if (errorCode === 'INVALID_PASSWORD') {
                    setError('비밀번호를 다시 확인해주세요.');
                    return;
                }
                if (errorCode === 'INVALID_USER_ID') {
                    setError('일치하는 계정 정보가 없습니다. 아이디(이메일)를 확인 또는 회원가입을 해주세요.');
                    return;
                }
                if (err.response?.status === 401 || backendMessage === 'Invalid credentials' || backendMessage === 'Bad credentials') {
                    setError('일치하는 계정 정보가 없습니다. 아이디(이메일)를 확인 또는 회원가입을 해주세요.');
                    return;
                }
                setError(backendMessage || '로그인에 실패했습니다.');
            } else {
                setError('네트워크 오류가 발생했습니다.');
            }
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="min-h-screen flex flex-col items-center justify-center p-6 text-[color:var(--text)]"
            style={{ background: 'linear-gradient(135deg, var(--bg-1), var(--bg-2), var(--bg-3))' }}
        >
            {showResetModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-sm"
                    >
                        <GlassCard className="p-8 text-center">
                            <h3 className="text-xl font-bold mb-3">로그인 제한</h3>
                            <p className="text-[color:var(--text-muted)] mb-6">
                                로그인 실패가 5회 이상입니다. 비밀번호를 재설정해 주세요.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowResetModal(false)}
                                    className="flex-1 py-3 rounded-2xl border border-[color:var(--border)] text-[color:var(--text)] hover:bg-[color:var(--surface-muted)] transition"
                                >
                                    닫기
                                </button>
                                <button
                                    onClick={() => navigate('/reset-password')}
                                    className="flex-1 py-3 rounded-2xl bg-[color:var(--accent)] text-[color:var(--accent-contrast)] font-semibold hover:bg-[color:var(--accent-strong)] transition"
                                >
                                    비밀번호 재설정
                                </button>
                            </div>
                        </GlassCard>
                    </motion.div>
                </div>
            )}
            {showWarningModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-sm"
                    >
                        <GlassCard className="p-8 text-center">
                            <h3 className="text-xl font-bold mb-3">로그인 경고</h3>
                            <p className="text-[color:var(--text-muted)] mb-6">
                                로그인 오류 횟수 {warningCount ?? 0}회 / 5회
                                <br />
                                {warningCount === 4 ? 1 : 2}회 로그인 실패 시 비밀번호를 재설정 해야합니다.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowWarningModal(false)}
                                    className="flex-1 py-3 rounded-2xl border border-[color:var(--border)] text-[color:var(--text)] hover:bg-[color:var(--surface-muted)] transition"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={() => setShowWarningModal(false)}
                                    className="flex-1 py-3 rounded-2xl bg-[color:var(--accent)] text-[color:var(--accent-contrast)] font-semibold hover:bg-[color:var(--accent-strong)] transition"
                                >
                                    확인
                                </button>
                            </div>
                        </GlassCard>
                    </motion.div>
                </div>
            )}
            <ThemeToggle className="fixed top-6 right-6 z-50" />
            <GlassCard className="w-full max-w-md p-12 relative">
                <button
                    onClick={() => navigate('/')}
                    className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-[color:var(--surface-muted)] hover:bg-[color:var(--border)] transition text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
                >
                    <X size={20} />
                </button>

                <h2 className="text-3xl font-bold mb-2">반가워요!</h2>
                <p className="text-[color:var(--text-muted)] mb-10">계정으로 로그인하고 시작하세요.</p>

                {error && (
                    <div className="mb-4 p-3 bg-[color:var(--danger-bg)] border border-[color:var(--danger)]/30 rounded-lg text-[color:var(--danger)] text-sm text-center">
                        {error}
                    </div>
                )}

                <form
                    className="space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleLogin();
                    }}
                >
                    <div className="relative">
                        <Mail className="absolute left-4 top-4 text-[color:var(--text-soft)]" size={20} />
                        <input
                            type="text"
                            placeholder="아이디(이메일)"
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
                        type="submit"
                        className="w-full py-4 bg-[color:var(--accent)] text-[color:var(--accent-contrast)] rounded-2xl font-bold hover:bg-[color:var(--accent-strong)] transition mt-4 shadow-[0_10px_30px_var(--shadow)]"
                    >
                        로그인
                    </button>
                    <div className="flex items-center gap-3 text-[color:var(--text-muted)] text-xs uppercase tracking-[0.2em] justify-center mt-6">
                        <span className="h-px flex-1 bg-[color:var(--border)]/60"></span>
                        소셜 로그인
                        <span className="h-px flex-1 bg-[color:var(--border)]/60"></span>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        <button
                            type="button"
                            onClick={() => handleSocialLogin('naver')}
                            className="w-full py-3 rounded-2xl border border-[color:var(--border)] text-[color:var(--text)] hover:bg-[color:var(--surface-muted)] transition"
                        >
                            네이버로 로그인
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSocialLogin('kakao')}
                            className="w-full py-3 rounded-2xl border border-[color:var(--border)] text-[color:var(--text)] hover:bg-[color:var(--surface-muted)] transition"
                        >
                            카카오로 로그인
                        </button>
                    </div>
                </form>
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
            <div className="w-full max-w-4xl mt-6">
                <Footer />
            </div>
        </motion.div>
    );
};

export default LoginPage;

