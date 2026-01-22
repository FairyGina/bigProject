import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import ThemeToggle from '../common/ThemeToggle';
import Footer from '../common/Footer';
import GlassCard from '../common/GlassCard';

const MainLayout = ({ children }) => {
    const navigate = useNavigate();
    const [showExpiryModal, setShowExpiryModal] = useState(false);

    useEffect(() => {
        const deferredUntil = localStorage.getItem('passwordChangeDeferredUntil');
        const deferValid = deferredUntil && new Date(deferredUntil) > new Date();
        if (deferValid) {
            localStorage.removeItem('passwordChangePrompt');
            return;
        }
        const shouldShow = localStorage.getItem('passwordChangePrompt') === 'true';
        if (shouldShow) {
            setShowExpiryModal(true);
        }
    }, []);

    return (
        <div
            className="min-h-screen text-[color:var(--text)] flex flex-col md:flex-row"
            style={{ background: 'linear-gradient(135deg, var(--bg-1), var(--bg-2), var(--bg-3))' }}
        >
            {/* 고정 사이드바 */}
            <Sidebar />

            {/* 메인 콘텐츠 영역 */}
            <div className="flex-1 p-6 md:p-10 flex flex-col">
                <div className="flex justify-end mb-6">
                    <ThemeToggle />
                </div>
                <div className="flex-1">
                    {children}
                </div>
                <Footer />
            </div>

            {showExpiryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-sm"
                    >
                        <GlassCard className="p-8 text-center">
                            <h3 className="text-xl font-bold mb-3">비밀번호 변경 권고</h3>
                            <p className="text-[color:var(--text-muted)] mb-6">
                                만료기간 6개월이 지났습니다. 비밀번호를 재설정해주세요.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        const deferredAt = new Date();
                                        deferredAt.setMonth(deferredAt.getMonth() + 3);
                                        localStorage.setItem('passwordChangeDeferredUntil', deferredAt.toISOString());
                                        localStorage.removeItem('passwordChangePrompt');
                                        setShowExpiryModal(false);
                                    }}
                                    className="flex-1 py-3 rounded-2xl border border-[color:var(--border)] text-[color:var(--text)] hover:bg-[color:var(--surface-muted)] transition"
                                >
                                    3개월 후 변경
                                </button>
                                <button
                                    onClick={() => {
                                        localStorage.removeItem('passwordChangeDeferredUntil');
                                        localStorage.removeItem('passwordChangePrompt');
                                        setShowExpiryModal(false);
                                        navigate('/mainboard/user-hub/profile');
                                    }}
                                    className="flex-1 py-3 rounded-2xl bg-[color:var(--accent)] text-[color:var(--accent-contrast)] font-semibold hover:bg-[color:var(--accent-strong)] transition"
                                >
                                    지금 변경하기
                                </button>
                            </div>
                        </GlassCard>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default MainLayout;
