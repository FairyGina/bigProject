<<<<<<< HEAD
import React, { useState } from 'react';
=======
﻿import React, { useState } from 'react';
>>>>>>> upstream/UI3
import { motion } from 'framer-motion';
import { KeyRound, Mail, User, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import GlassCard from '../components/common/GlassCard';
import ThemeToggle from '../components/common/ThemeToggle';
import axiosInstance from '../axiosConfig';

const ResetPasswordPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const initialName = location.state?.userName ?? '';
    const initialEmail = location.state?.userId ?? '';
    const [name, setName] = useState(initialName);
    const [email, setEmail] = useState(initialEmail);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

<<<<<<< HEAD
=======
    const hasSequentialDigits = (value, length = 3) => {
        if (!value) return false;
        const s = value;
        let inc = 1;
        let dec = 1;
        for (let i = 1; i < s.length; i += 1) {
            const prev = s[i - 1];
            const curr = s[i];
            const isDigitSeq = /\d/.test(prev) && /\d/.test(curr);
            if (isDigitSeq && curr.charCodeAt(0) - prev.charCodeAt(0) === 1) {
                inc += 1;
            } else {
                inc = 1;
            }
            if (isDigitSeq && prev.charCodeAt(0) - curr.charCodeAt(0) === 1) {
                dec += 1;
            } else {
                dec = 1;
            }
            if (inc >= length || dec >= length) {
                return true;
            }
        }
        return false;
    };

    const hasSequentialLetters = (value, length = 3) => {
        if (!value) return false;
        const s = value.toLowerCase();
        let inc = 1;
        let dec = 1;
        for (let i = 1; i < s.length; i += 1) {
            const prev = s[i - 1];
            const curr = s[i];
            const isAlphaSeq = /[a-z]/.test(prev) && /[a-z]/.test(curr);
            if (isAlphaSeq && curr.charCodeAt(0) - prev.charCodeAt(0) === 1) {
                inc += 1;
            } else {
                inc = 1;
            }
            if (isAlphaSeq && prev.charCodeAt(0) - curr.charCodeAt(0) === 1) {
                dec += 1;
            } else {
                dec = 1;
            }
            if (inc >= length || dec >= length) {
                return true;
            }
        }
        return false;
    };

    const hasKeyboardSequence = (value, length = 3) => {
        if (!value) return false;
        const lower = value.toLowerCase();
        const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
        const containsRun = (row) => {
            for (let i = 0; i <= row.length - length; i += 1) {
                const seq = row.slice(i, i + length);
                if (lower.includes(seq)) {
                    return true;
                }
            }
            return false;
        };
        return rows.some((row) => containsRun(row) || containsRun([...row].reverse().join('')));
    };

    const isGuessablePassword = (password, email) => {
        if (!password) return false;
        const lower = password.toLowerCase();
        if (email) {
            const local = email.split('@')[0]?.replace(/[^a-z0-9]/gi, '').toLowerCase();
            if (local && local.length >= 3 && lower.includes(local)) {
                return true;
            }
        }
        return (
            hasSequentialDigits(password, 3) ||
            hasSequentialLetters(password, 3) ||
            hasKeyboardSequence(password, 3)
        );
    };

>>>>>>> upstream/UI3
    const handleFindPassword = async () => {
        setError('');
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!name || !email) {
<<<<<<< HEAD
            setError('이름과 아이디를 입력해 주세요.');
=======
            setError('이름과 아이디를 입력해주세요.');
>>>>>>> upstream/UI3
            return;
        }
        if (!emailPattern.test(email)) {
            setError('아이디를 이메일 형식으로 입력해주세요.');
            return;
        }
        if (!newPassword || newPassword !== confirmPassword) {
            setError('새 비밀번호가 일치하지 않습니다.');
            return;
        }
<<<<<<< HEAD
=======
        if (isGuessablePassword(newPassword, email)) {
            setError('연속된 문자열이나 아이디 등 추측 가능한 정보를 비밀번호에 사용할 수 없습니다.');
            return;
        }
>>>>>>> upstream/UI3
        try {
            await axiosInstance.post('/api/auth/reset-password', {
                userId: email,
                userName: name,
                newPassword,
                confirmPassword,
            });
            alert('비밀번호가 변경되었습니다.');
            navigate('/login');
        } catch (err) {
            if (err.response && err.response.data) {
                setError(err.response.data.message || '비밀번호 변경에 실패했습니다.');
            } else {
                setError('네트워크 오류가 발생했습니다.');
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
                    onClick={() => navigate('/login')}
                    className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-[color:var(--surface-muted)] hover:bg-[color:var(--border)] transition text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
                >
                    <X size={20} />
                </button>

                <h2 className="text-3xl font-bold mb-2">비밀번호 재설정</h2>
                <p className="text-[color:var(--text-muted)] mb-10">이름과 아이디를 입력한 뒤 새 비밀번호를 설정하세요.</p>

                {error && (
                    <div className="mb-4 p-3 bg-[color:var(--danger-bg)] border border-[color:var(--danger)]/30 rounded-lg text-[color:var(--danger)] text-sm text-center">
                        {error}
                    </div>
                )}

                <form
                    className="space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleFindPassword();
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
<<<<<<< HEAD
                            placeholder="아이디(이메일)"
=======
                            placeholder="이메일"
>>>>>>> upstream/UI3
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-12 p-4 rounded-2xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] transition"
                        />
                    </div>
                    <div className="relative">
                        <KeyRound className="absolute left-4 top-4 text-[color:var(--text-soft)]" size={20} />
                        <input
                            type="password"
                            placeholder="새 비밀번호"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full pl-12 p-4 rounded-2xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] transition"
                        />
                    </div>
                    <div className="relative">
                        <KeyRound className="absolute left-4 top-4 text-[color:var(--text-soft)]" size={20} />
                        <input
                            type="password"
                            placeholder="새 비밀번호 확인"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full pl-12 p-4 rounded-2xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] transition"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-4 bg-[color:var(--accent)] text-[color:var(--accent-contrast)] rounded-2xl font-bold hover:bg-[color:var(--accent-strong)] transition mt-2 shadow-[0_10px_30px_var(--shadow)]"
                    >
                        비밀번호 변경
                    </button>
                </form>
            </GlassCard>
        </motion.div>
    );
};

export default ResetPasswordPage;
