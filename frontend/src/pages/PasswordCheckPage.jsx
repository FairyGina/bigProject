import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../axiosConfig';

const PasswordCheckPage = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handlePasswordCheck = async () => {
        setError('');
        if (!password.trim()) {
            setError('비밀번호를 입력해주세요.');
            return;
        }
        try {
            await axiosInstance.post('/user/verify-password', { password });
            navigate('/mainboard/user-hub/profile');
        } catch (err) {
            console.error(err);
            const message =
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                '비밀번호가 일치하지 않습니다.';
            setError(message);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] text-center text-[color:var(--text)]"
        >
            <div className="bg-[color:var(--surface-muted)] p-8 rounded-3xl mb-8 relative shadow-[0_10px_30px_var(--shadow)]">
                <div className="bg-[color:var(--surface)] p-4 rounded-xl shadow-sm">
                    <div className="w-20 h-20 bg-[color:var(--accent)] rounded-full flex items-center justify-center mx-auto relative overflow-hidden">
                        <Search className="text-[color:var(--accent-contrast)] w-10 h-10" />
                        <div className="absolute inset-0 bg-[color:var(--accent-contrast)]/20 -skew-x-12 translate-x-4"></div>
                    </div>
                </div>
                <div className="absolute top-4 left-4 flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-[color:var(--accent-strong)]"></div>
                    <div className="w-2 h-2 rounded-full bg-[color:var(--accent)]/60"></div>
                    <div className="w-2 h-2 rounded-full bg-[color:var(--accent)]/30"></div>
                </div>
            </div>

            <h2 className="text-3xl font-bold mb-12">비밀번호 확인이 필요합니다</h2>

            <div className="w-full max-w-md text-left">
                <label className="block text-sm font-bold mb-4 ml-1 text-[color:var(--text-muted)]">비밀번호 확인</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handlePasswordCheck();
                        }
                    }}
                    placeholder="정보 수정을 위해 입력해주세요."
                    className="w-full p-4 rounded-xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] transition-colors text-lg"
                />

                {error && <p className="text-[color:var(--danger)] mt-2 text-sm">{error}</p>}

                <button
                    onClick={handlePasswordCheck}
                    className="w-full mt-12 py-4 bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-[color:var(--accent-contrast)] font-bold rounded-xl transition-colors shadow-[0_10px_30px_var(--shadow)]"
                >
                    확인
                </button>
            </div>
        </motion.div>
    );
};

export default PasswordCheckPage;
