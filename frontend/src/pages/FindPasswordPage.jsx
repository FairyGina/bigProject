import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, Mail, User, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/common/GlassCard';
import ThemeToggle from '../components/common/ThemeToggle';
import axiosInstance from '../axiosConfig';

const FindPasswordPage = () => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [codeSent, setCodeSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [remainingSeconds, setRemainingSeconds] = useState(0);

    useEffect(() => {
        if (!codeSent || remainingSeconds <= 0) {
            return undefined;
        }

        const timer = setInterval(() => {
            setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(timer);
    }, [codeSent, remainingSeconds]);

    useEffect(() => {
        if (!codeSent || remainingSeconds > 0) {
            return;
        }

        setError('인증에 실패했습니다. 인증번호를 다시 요청해 주세요.');
        setCodeSent(false);
        setInfo('');
    }, [codeSent, remainingSeconds]);

    const formatTime = (totalSeconds) => {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const handleSendCode = async () => {
        setError('');
        setInfo('');
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!name || !email) {
            setError('이름과 아이디를 입력해 주세요.');
            return;
        }
        if (!emailPattern.test(email)) {
            setError('아이디를 이메일 형식으로 입력해주세요.');
            return;
        }
        setLoading(true);
        try {
            await axiosInstance.post('/api/auth/password-reset/request', {
                userId: email,
                userName: name,
            });
            setCodeSent(true);
            setInfo('인증번호가 이메일로 전송되었습니다.');
            setRemainingSeconds(180);
        } catch (err) {
            if (err.response && err.response.data) {
                setError(err.response.data.message || '인증번호 전송에 실패했습니다.');
            } else {
                setError('네트워크 오류가 발생했습니다.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async () => {
        setError('');
        setInfo('');
        if (!code) {
            setError('인증번호를 입력해 주세요.');
            return;
        }
        setLoading(true);
        try {
            await axiosInstance.post('/api/auth/password-reset/verify', {
                userId: email,
                code,
            });
            navigate('/reset-password', { state: { userId: email, userName: name } });
        } catch (err) {
            if (err.response && err.response.data) {
                setError(err.response.data.message || '인증번호 확인에 실패했습니다.');
            } else {
                setError('네트워크 오류가 발생했습니다.');
            }
        } finally {
            setLoading(false);
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
                    onClick={() => navigate('/login')}
                    className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-[color:var(--surface-muted)] hover:bg-[color:var(--border)] transition text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
                >
                    <X size={20} />
                </button>

                <h2 className="text-3xl font-bold mb-2">비밀번호 찾기</h2>
                <p className="text-[color:var(--text-muted)] mb-10">이름과 아이디를 입력하면 인증번호가 전송됩니다.</p>

                {error && (
                    <div className="mb-4 p-3 bg-[color:var(--danger-bg)] border border-[color:var(--danger)]/30 rounded-lg text-[color:var(--danger)] text-sm text-center">
                        {error}
                    </div>
                )}

                {info && (
                    <div className="mb-4 p-3 bg-[color:var(--surface-muted)] border border-[color:var(--border)] rounded-lg text-[color:var(--danger)] text-sm text-center">
                        {info}
                    </div>
                )}

                <form
                    className="space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (codeSent) {
                            handleVerifyCode();
                            return;
                        }
                        handleSendCode();
                    }}
                >
                    <div className="relative">
                        <User className="absolute left-4 top-4 text-[color:var(--text-soft)]" size={20} />
                        <input
                            type="text"
                            placeholder="이름"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full pl-12 p-4 rounded-2xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] transition"
                        />
                    </div>
                    <div className="relative">
                        <Mail className="absolute left-4 top-4 text-[color:var(--text-soft)]" size={20} />
                        <input
                            type="email"
                            placeholder="아이디 (이메일)"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-12 p-4 rounded-2xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] transition"
                        />
                    </div>
                    <button
                        onClick={handleSendCode}
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-[color:var(--accent)] text-[color:var(--accent-contrast)] rounded-2xl font-bold hover:bg-[color:var(--accent-strong)] transition mt-2 shadow-[0_10px_30px_var(--shadow)] disabled:opacity-60"
                    >
                        {codeSent ? '인증번호 재전송' : '인증번호 전송'}
                    </button>
                    {codeSent && (
                        <>
                            <div className="text-center text-sm text-[color:var(--text-muted)]">
                                {formatTime(remainingSeconds)}
                            </div>
                            <div className="relative">
                                <KeyRound className="absolute left-4 top-4 text-[color:var(--text-soft)]" size={20} />
                                <input
                                    type="text"
                                    placeholder="인증번호"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    className="w-full pl-12 p-4 rounded-2xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] transition"
                                />
                            </div>
                            <button
                                onClick={handleVerifyCode}
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-[color:var(--accent-strong)] text-[color:var(--accent-contrast)] rounded-2xl font-bold hover:bg-[color:var(--accent)] transition shadow-[0_10px_30px_var(--shadow)] disabled:opacity-60"
                            >
                                인증번호 확인
                            </button>
                        </>
                    )}
                </form>
            </GlassCard>
        </motion.div>
    );
};

export default FindPasswordPage;
