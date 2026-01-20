import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/common/GlassCard';
import ThemeToggle from '../components/common/ThemeToggle';

const SignUpPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        userName: '',
        birthDate: '',
        userId: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSignup = async () => {
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('비밀번호가 일치하지 않습니다.');
            return;
        }

        const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
        if (!passwordPattern.test(formData.password)) {
            setError('비밀번호는 8자 이상, 영문+숫자+특수문자를 포함해야 합니다.');
            return;
        }

        if (!formData.birthDate) {
            setError('생년월일을 입력해주세요.');
            return;
        }

        try {
            const response = await fetch('http://localhost:8080/api/auth/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                alert('회원가입이 완료되었습니다. 로그인해주세요.');
                navigate('/login');
            } else {
                const errorData = await response.json();
                setError(errorData.message || '회원가입에 실패했습니다.');
            }
        } catch (err) {
            console.error(err);
            setError('서버 연결에 실패했습니다.');
        }
    };

    const handleSocialSignup = (provider) => {
        sessionStorage.setItem('oauthFlow', 'signup');
        localStorage.setItem('oauthFlow', 'signup');
        window.location.href = `http://localhost:8080/oauth2/authorization/${provider}`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="min-h-screen flex items-center justify-center p-6 text-[color:var(--text)]"
            style={{ background: 'linear-gradient(135deg, var(--bg-1), var(--bg-2), var(--bg-3))' }}
        >
            <ThemeToggle className="fixed top-6 right-6 z-50" />
            <GlassCard className="w-full max-w-lg p-12 relative">
                <button
                    onClick={() => navigate('/')}
                    className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-[color:var(--surface-muted)] hover:bg-[color:var(--border)] transition text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
                >
                    <X size={20} />
                </button>

                <div className="flex justify-between items-start mb-10 pr-8">
                    <div>
                        <h2 className="text-3xl font-bold mb-2">계정 생성</h2>
                        <p className="text-[color:var(--text-muted)]">필수 정보를 입력하여 가입해주세요.</p>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-[color:var(--danger-bg)] border border-[color:var(--danger)]/30 rounded-lg text-[color:var(--danger)] text-sm text-center">
                        {error}
                    </div>
                )}

                <form
                    className="space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSignup();
                    }}
                >
                    <input
                        type="text"
                        name="userName"
                        placeholder="이름 (실명)"
                        value={formData.userName}
                        onChange={handleChange}
                        className="w-full p-4 rounded-2xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    />

                    <input
                        type="date"
                        name="birthDate"
                        placeholder="생년월일"
                        value={formData.birthDate}
                        onChange={handleChange}
                        className="w-full p-4 rounded-2xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    />

                    <input
                        type="email"
                        name="userId"
                        placeholder="이메일 주소 (아이디)"
                        value={formData.userId}
                        onChange={handleChange}
                        className="w-full p-4 rounded-2xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    />

                    <input
                        type="password"
                        name="password"
                        placeholder="비밀번호 (8자 이상, 영문+숫자+특수문자)"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full p-4 rounded-2xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    />

                    <input
                        type="password"
                        name="confirmPassword"
                        placeholder="비밀번호 확인"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={`w-full p-4 rounded-2xl bg-[color:var(--surface-muted)] border ${formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-red-500' : 'border-[color:var(--border)]'} text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] transition`}
                    />

                    <button
                        type="submit"
                        className="w-full py-4 mt-8 bg-[color:var(--accent)] text-[color:var(--accent-contrast)] rounded-2xl font-bold hover:bg-[color:var(--accent-strong)] transition shadow-[0_10px_30px_var(--shadow)]"
                    >
                        회원가입 완료
                    </button>
                </form>

                <div className="flex items-center gap-3 text-[color:var(--text-muted)] text-xs uppercase tracking-[0.2em] justify-center mt-6">
                    <span className="h-px flex-1 bg-[color:var(--border)]/60"></span>
                    소셜 회원가입
                    <span className="h-px flex-1 bg-[color:var(--border)]/60"></span>
                </div>
                <div className="grid grid-cols-1 gap-3 mt-4">
                    <button
                        type="button"
                        onClick={() => handleSocialSignup('naver')}
                        className="w-full py-3 rounded-2xl border border-[color:var(--border)] text-[color:var(--text)] hover:bg-[color:var(--surface-muted)] transition"
                    >
                        네이버로 회원가입
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSocialSignup('kakao')}
                        className="w-full py-3 rounded-2xl border border-[color:var(--border)] text-[color:var(--text)] hover:bg-[color:var(--surface-muted)] transition"
                    >
                        카카오로 회원가입
                    </button>
                </div>
            </GlassCard>
        </motion.div>
    );
};

export default SignUpPage;
