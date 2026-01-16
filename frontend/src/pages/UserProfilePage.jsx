import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '../components/common/GlassCard';
import axiosInstance from '../axiosConfig';

const UserProfilePage = () => {
    const [formData, setFormData] = useState({
        userName: '',
        birthDate: '',
        userId: '',
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const mockUser = {
            userName: localStorage.getItem('userName') || '홍길동',
            userId: 'user@example.com',
            birthDate: '1990-01-01'
        };
        setFormData(prev => ({
            ...prev,
            ...mockUser
        }));
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async () => {
        if (formData.newPassword && formData.newPassword !== formData.confirmNewPassword) {
            alert('새 비밀번호가 일치하지 않습니다.');
            return;
        }

        setLoading(true);
        try {
            // await axiosInstance.put('/api/user/me', formData);
            alert('정보가 수정되었습니다.');
        } catch (error) {
            console.error(error);
            alert('정보 수정에 실패했습니다.');
        } finally {
            setLoading(false);
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
                            <label className="block text-[color:var(--text-muted)] text-sm mb-2">아이디 (이메일)</label>
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
                                placeholder="정보 수정을 위해 입력해주세요"
                                className="w-full p-4 rounded-xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                            />
                        </div>

                        <div>
                            <label className="block text-[color:var(--text-muted)] text-sm mb-2">새 비밀번호</label>
                            <input
                                type="password"
                                name="newPassword"
                                value={formData.newPassword}
                                onChange={handleChange}
                                placeholder="변경할 경우에만 입력"
                                className="w-full p-4 rounded-xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                            />
                        </div>

                        <div>
                            <label className="block text-[color:var(--text-muted)] text-sm mb-2">새 비밀번호 확인</label>
                            <input
                                type="password"
                                name="confirmNewPassword"
                                value={formData.confirmNewPassword}
                                onChange={handleChange}
                                placeholder="변경할 경우에만 입력"
                                className={`w-full p-4 rounded-xl bg-[color:var(--surface-muted)] border ${formData.newPassword && formData.confirmNewPassword && formData.newPassword !== formData.confirmNewPassword ? 'border-red-500' : 'border-[color:var(--border)]'} text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]`}
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-12 flex justify-end gap-4">
                    <button className="px-8 py-3 rounded-xl hover:bg-[color:var(--surface-muted)] transition text-[color:var(--text-muted)]">
                        취소
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-8 py-3 rounded-xl bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-[color:var(--accent-contrast)] font-bold shadow-[0_10px_30px_var(--shadow)] transition disabled:opacity-50"
                    >
                        {loading ? '처리중...' : '수정 완료'}
                    </button>
                </div>
            </GlassCard>
        </motion.div>
    );
};

export default UserProfilePage;
