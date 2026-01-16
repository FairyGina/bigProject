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
                alert('회원가입이 완료되었습니다! 로그인해주세요.');
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
                        <p className="text-[color:var(--text-muted)]">필수 정보를 입력하여 가입하세요.</p>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-[color:var(--danger-bg)] border border-[color:var(--danger)]/30 rounded-lg text-[color:var(--danger)] text-sm text-center">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <input
                        type="text"
                        name="userName"
                        placeholder="이름 (전체)"
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
                </div>

                <button
                    onClick={handleSignup}
                    className="w-full py-4 mt-8 bg-[color:var(--accent)] text-[color:var(--accent-contrast)] rounded-2xl font-bold hover:bg-[color:var(--accent-strong)] transition shadow-[0_10px_30px_var(--shadow)]"
                >
                    회원가입 완료
                </button>
            </GlassCard>
        </motion.div>
    );
};

export default SignUpPage;
