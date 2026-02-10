import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import ThemeToggle from '../common/ThemeToggle';
import Footer from '../common/Footer';
import GlassCard from '../common/GlassCard';
import axiosInstance from '../../axiosConfig';

const MainLayout = ({ children }) => {
    const navigate = useNavigate();
    const [showExpiryModal, setShowExpiryModal] = useState(false);
    const [showChatbot, setShowChatbot] = useState(false);

    // Help chatbot URL definition - 챗봇 컨테이너의 /helper/ 경로 사용 (Trailing slash 중요)
    const chatbotBaseUrl = import.meta.env.VITE_CHATBOT_URL || 'https://bp-chatbot-app.wittysand-a0f4e87e.centralindia.azurecontainerapps.io';
    const helperChatUrl = `${chatbotBaseUrl}/helper/`;

    // ==========================================================
    // Application-level Warm-up: 페이지 진입 시 컨테이너 미리 깨우기
    // ACA의 Scale-to-Zero 정책 대응 — 사용자가 실제 기능을 사용할 때쯤
    // 컨테이너가 이미 프로비저닝되어 있도록 미리 신호를 보냄
    // ==========================================================
    useEffect(() => {
        const warmUp = async () => {
            try {
                // 1. Chatbot 컨테이너 Warm-up (no-cors: CORS 에러 무시, 단순 wake-up 목적)
                fetch(chatbotBaseUrl, { mode: 'no-cors' }).catch(() => { });
                console.log('[Warm-up] Chatbot 컨테이너 wake-up 요청 전송');

                // 2. Analysis Engine 컨테이너 Warm-up (백엔드 프록시 경유)
                axiosInstance.get('/analysis/items').catch(() => { });
                console.log('[Warm-up] Analysis Engine 컨테이너 wake-up 요청 전송');
            } catch (e) {
                // Warm-up 실패는 무시 — 사용자 경험에 영향 없음
                console.log('[Warm-up] 컨테이너 warm-up 중 오류 (무시):', e);
            }
        };

        warmUp();
    }, []); // 최초 마운트 시 1회만 실행

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
            <Sidebar onOpenChatbot={() => setShowChatbot(true)} />

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

            {showChatbot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--surface)]/80 px-6">
                    <div className="w-full max-w-5xl">
                        <GlassCard className="p-4 md:p-6">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-bold">도움말 챗봇</h3>
                                <button
                                    onClick={() => setShowChatbot(false)}
                                    className="px-3 py-1 rounded-lg text-[color:var(--text-muted)] hover:text-[color:var(--text)] hover:bg-[color:var(--surface-muted)] transition"
                                >
                                    닫기
                                </button>
                            </div>
                            <div className="w-full h-[70vh] rounded-xl overflow-hidden border border-[color:var(--border)] bg-white">
                                <iframe
                                    title="도움말 챗봇"
                                    src={helperChatUrl}
                                    className="w-full h-full"
                                />
                            </div>
                        </GlassCard>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MainLayout;
