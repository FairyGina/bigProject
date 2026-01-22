import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/common/GlassCard';
import axiosInstance from '../axiosConfig';

const UserProfilePage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        userName: '',
        birthDate: '',
        userId: '',
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [isSocialAccount, setIsSocialAccount] = useState(false);

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

    const isGuessablePassword = (password, email, birthDate) => {
        if (!password) return false;
        const lower = password.toLowerCase();
        if (email) {
            const local = email.split('@')[0]?.replace(/[^a-z0-9]/gi, '').toLowerCase();
            if (local && local.length >= 3 && lower.includes(local)) {
                return true;
            }
        }
        if (birthDate) {
            const digits = birthDate.replace(/[^0-9]/g, '');
            if (digits.length >= 6) {
                const yyyymmdd = digits;
                const yymmdd = digits.slice(2);
                const mmdd = digits.slice(4);
                if (lower.includes(yyyymmdd) || lower.includes(yymmdd) || lower.includes(mmdd)) {
                    return true;
                }
            }
        }
        return hasSequentialDigits(password, 3) || hasSequentialLetters(password, 3);
    };

    useEffect(() => {
        const normalizeDate = (value) => {
            if (!value) {
                return '';
            }
            if (typeof value === 'string') {
                return value.split('T')[0];
            }
            if (Array.isArray(value) && value.length >= 3) {
                const [year, month, day] = value;
                if (!year || !month || !day) {
                    return '';
                }
                const paddedMonth = String(month).padStart(2, '0');
                const paddedDay = String(day).padStart(2, '0');
                return `${year}-${paddedMonth}-${paddedDay}`;
            }
            try {
                return new Date(value).toISOString().slice(0, 10);
            } catch {
                return '';
            }
        };

        const loadProfile = async () => {
            const storedUserName = localStorage.getItem('userName') || '';
            const storedUserId = localStorage.getItem('userId') || '';
            setFormData((prev) => ({
                ...prev,
                userName: storedUserName || prev.userName,
                userId: storedUserId || prev.userId,
                birthDate: prev.birthDate,
            }));

            try {
                const response = await axiosInstance.get('/api/user/me');
                const data = response.data || {};
                if (data.userName) {
                    localStorage.setItem('userName', data.userName);
                }
                if (data.userId) {
                    localStorage.setItem('userId', data.userId);
                }
                setIsSocialAccount(Boolean(data.socialAccount));
                setFormData((prev) => ({
                    ...prev,
                    userName: data.userName || prev.userName,
                    userId: data.userId || prev.userId,
                    birthDate: normalizeDate(data.birthDate),
                }));
            } catch (error) {
                console.error('Failed to load user profile:', error);
            }
        };

        loadProfile();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async () => {
        if (!formData.birthDate && !formData.newPassword && !formData.confirmNewPassword) {
            alert('변경할 값을 입력해주세요.');
            return;
        }
        if (!isSocialAccount) {
            if (formData.newPassword || formData.confirmNewPassword) {
                if (!formData.currentPassword) {
                    alert('현재 비밀번호를 입력해주세요.');
                    return;
                }
                if (formData.newPassword !== formData.confirmNewPassword) {
                    alert('새 비밀번호가 일치하지 않습니다.');
                    return;
                }
                if (isGuessablePassword(formData.newPassword, formData.userId, formData.birthDate)) {
                    alert('연속된 문자열이나 아이디/생년월일 등 추측 가능한 정보를 비밀번호에 사용할 수 없습니다.');
                    return;
                }
            }
        }

        setLoading(true);
        try {
            const payload = {
                birthDate: formData.birthDate || '',
            };
            if (!isSocialAccount) {
                payload.currentPassword = formData.currentPassword || '';
                if (formData.newPassword) {
                    payload.newPassword = formData.newPassword;
                    payload.confirmNewPassword = formData.confirmNewPassword;
                }
            }
            const response = await axiosInstance.put('/api/user/me', payload);
            const data = response.data || {};
            setFormData((prev) => ({
                ...prev,
                birthDate: data.birthDate || prev.birthDate,
                currentPassword: '',
                newPassword: '',
                confirmNewPassword: ''
            }));
            alert('정보가 저장되었습니다.');
        } catch (error) {
            console.error(error);
            const backendMessage = error.response?.data?.message;
            const errorCode = error.response?.data?.errorCode;
            let message = backendMessage || '정보 저장에 실패했습니다.';
            if (errorCode === 'PASSWORD_MISMATCH' && message === '비밀번호가 일치하지 않습니다.') {
                message = '현재 비밀번호가 일치하지 않습니다.';
            } else if (errorCode === 'INVALID_PASSWORD_POLICY' || message === '비밀번호 정책을 만족하지 않습니다.') {
                message = `${message}\n- 영문, 숫자, 특수문자 포함\n- 8자 이상`;
            }
            alert(message);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleSubmit();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl mx-auto p-6"
        >
            <h2 className="text-3xl font-bold mb-8">내 정보 수정</h2>

            <GlassCard className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold border-b border-[color:var(--border)] pb-2">기본 정보</h3>

                        <div>
                            <label className="block text-[color:var(--text-muted)] text-sm mb-2">아이디(이메일)</label>
                            <input
                                type="text"
                                value={formData.userId}
                                readOnly
                                className="w-full p-4 rounded-xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text-soft)] cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label className="block text-[color:var(--text-muted)] text-sm mb-2">이름</label>
                            <input
                                type="text"
                                value={formData.userName}
                                readOnly
                                className="w-full p-4 rounded-xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text-soft)] cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label className="block text-[color:var(--text-muted)] text-sm mb-2">생년월일</label>
                            <input
                                type="date"
                                name="birthDate"
                                value={formData.birthDate}
                                onChange={handleChange}
                                onKeyDown={handleKeyDown}
                                className="w-full p-4 rounded-xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-xl font-bold border-b border-[color:var(--border)] pb-2">비밀번호 변경</h3>

                        <div>
                            <label className="block text-[color:var(--text-muted)] text-sm mb-2">현재 비밀번호</label>
                            <input
                                type="password"
                                name="currentPassword"
                                value={formData.currentPassword}
                                onChange={handleChange}
                                onKeyDown={handleKeyDown}
                                placeholder={isSocialAccount ? 'SNS 계정은 변경할 수 없습니다.' : '정보 수정을 위해 입력해주세요'}
                                disabled={isSocialAccount}
                                className="w-full p-4 rounded-xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] disabled:opacity-60"
                            />
                        </div>

                        <div>
                            <label className="block text-[color:var(--text-muted)] text-sm mb-2">새 비밀번호</label>
                            <input
                                type="password"
                                name="newPassword"
                                value={formData.newPassword}
                                onChange={handleChange}
                                onKeyDown={handleKeyDown}
                                placeholder={isSocialAccount ? 'SNS 계정은 변경할 수 없습니다.' : '변경할 경우에만 입력'}
                                disabled={isSocialAccount}
                                className="w-full p-4 rounded-xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] disabled:opacity-60"
                            />
                        </div>

                        <div>
                            <label className="block text-[color:var(--text-muted)] text-sm mb-2">새 비밀번호 확인</label>
                            <input
                                type="password"
                                name="confirmNewPassword"
                                value={formData.confirmNewPassword}
                                onChange={handleChange}
                                onKeyDown={handleKeyDown}
                                placeholder={isSocialAccount ? 'SNS 계정은 변경할 수 없습니다.' : '변경할 경우에만 입력'}
                                disabled={isSocialAccount}
                                className={`w-full p-4 rounded-xl bg-[color:var(--surface-muted)] border ${formData.newPassword && formData.confirmNewPassword && formData.newPassword !== formData.confirmNewPassword ? 'border-red-500' : 'border-[color:var(--border)]'} text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] disabled:opacity-60`}
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-12 flex justify-end gap-4">
                    <button
                        onClick={() => navigate('/mainboard')}
                        className="px-8 py-3 rounded-xl hover:bg-[color:var(--surface-muted)] transition text-[color:var(--text-muted)]"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-8 py-3 rounded-xl bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-[color:var(--accent-contrast)] font-bold shadow-[0_10px_30px_var(--shadow)] transition disabled:opacity-50"
                    >
                        {loading ? '처리중..' : '수정 완료'}
                    </button>
                </div>
            </GlassCard>
        </motion.div>
    );
};

export default UserProfilePage;
