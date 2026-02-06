import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import GlassCard from '../components/common/GlassCard';
import ThemeToggle from '../components/common/ThemeToggle';
import { useAuth } from '../context/AuthContext';

const OAuthCallbackPage = () => {
    const { login } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [flow, setFlow] = useState('login');
    const handledRef = useRef(false);

    useEffect(() => {
        if (handledRef.current) {
            return;
        }

        const storedFlow = sessionStorage.getItem('oauthFlow') || localStorage.getItem('oauthFlow');
        const flowValue = storedFlow || flow;
        if (storedFlow) {
            setFlow(storedFlow);
            sessionStorage.removeItem('oauthFlow');
            localStorage.removeItem('oauthFlow');
        }

        const params = new URLSearchParams(location.search);
        const token = params.get('token');
        const userId = params.get('userId');
        const errorParam = params.get('error');
        const isNewUser = params.get('isNewUser') === 'true';

        if (errorParam) {
            setError(
                flowValue === 'signup'
                    ? '회원가입 처리 중 오류가 발생했습니다. 다시 시도해주세요.'
                    : '로그인 처리 중 오류가 발생했습니다. 다시 시도해주세요.'
            );
            return;
        }

        if (!token) {
            setError(
                flowValue === 'signup'
                    ? '회원가입 토큰이 없습니다. 다시 시도해주세요.'
                    : '로그인 토큰이 없습니다. 다시 시도해주세요.'
            );
            return;
        }

        const extractedName = (() => {
            try {
                const payload = token.split('.')[1];
                if (!payload) {
                    return '';
                }
                const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
                const padded = base64 + '==='.slice((base64.length + 3) % 4);
                const binary = atob(padded);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i += 1) {
                    bytes[i] = binary.charCodeAt(i);
                }
                const jsonText = new TextDecoder('utf-8').decode(bytes);
                const decoded = JSON.parse(jsonText);
                return decoded.userName || '';
            } catch (e) {
                return '';
            }
        })();

        handledRef.current = true;
        login(token, userId || extractedName ? { userId, userName: extractedName } : {});
        if (extractedName) {
            localStorage.setItem('userName', extractedName);
        }
        if (userId) {
            localStorage.setItem('userId', userId);
        }
        if (flowValue === 'signup' || isNewUser) {
            alert('회원가입이 완료되었습니다.');
        }
        window.location.replace('/mainboard');
    }, [flow, location.search, login, navigate]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="min-h-screen flex items-center justify-center p-6 text-[color:var(--text)]"
            style={{ background: 'linear-gradient(135deg, var(--bg-1), var(--bg-2), var(--bg-3))' }}
        >
            <ThemeToggle className="fixed top-6 right-6 z-50" />
            <GlassCard className="w-full max-w-md p-12 text-center">
                {!error ? (
                    <>
                        <h2 className="text-2xl font-bold mb-3">로그인 처리 중</h2>
                        <p className="text-[color:var(--text-muted)]">잠시만 기다려주세요.</p>
                    </>
                ) : (
                    <>
                        <h2 className="text-2xl font-bold mb-3">
                            {flow === 'signup' ? '회원가입 오류' : '로그인 오류'}
                        </h2>
                        <p className="text-[color:var(--text-muted)] mb-6">{error}</p>
                        <button
                            onClick={() => navigate(flow === 'signup' ? '/signup' : '/login')}
                            className="w-full py-3 rounded-2xl bg-[color:var(--accent)] text-[color:var(--accent-contrast)] font-semibold hover:bg-[color:var(--accent-strong)] transition"
                        >
                            {flow === 'signup' ? '회원가입으로 돌아가기' : '로그인으로 돌아가기'}
                        </button>
                    </>
                )}
            </GlassCard>
        </motion.div>
    );
};

export default OAuthCallbackPage;
