import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/common/GlassCard';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

// 로그인 페이지
const LoginPage = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async () => {
        setError('');
        try {
            // axiosInstance 사용 (baseURL 설정됨)
            const response = await axiosInstance.post('/api/auth/login', { userId, password });

            // axios는 response.data에 본문이 있음
            const data = response.data;
            console.log('Login success:', data);

            // 토큰 및 사용자 이름 저장 (AuthContext 사용)
            if (data.accessToken) {
                // AuthContext의 login 함수 호출하여 상태 업데이트
                login(data.accessToken, { userName: data.userName });
            }

            navigate('/dashboard');
        } catch (err) {
            console.error('Login error:', err);
            // 에러 메시지 처리
            if (err.response && err.response.data) {
                setError(err.response.data.message || '로그인에 실패했습니다.');
            } else {
                setError('서버 연결에 실패했습니다.');
            }
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="min-h-screen bg-[#0A0A0C] flex items-center justify-center p-6"
        >
            <GlassCard className="w-full max-w-md p-12 relative">
                {/* X 닫기 버튼 */}
                <button
                    onClick={() => navigate('/')}
                    className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition text-gray-400 hover:text-white"
                >
                    <X size={20} />
                </button>

                <h2 className="text-3xl font-bold text-white mb-2">반가워요!</h2>
                <p className="text-gray-400 mb-10">계정에 로그인하여 시작하세요.</p>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm text-center">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div className="relative">
                        <Mail className="absolute left-4 top-4 text-gray-500" size={20} />
                        <input
                            type="text"
                            placeholder="아이디"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            className="w-full pl-12 p-4 rounded-2xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        />
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-4 top-4 text-gray-500" size={20} />
                        <input
                            type="password"
                            placeholder="비밀번호"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-12 p-4 rounded-2xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        />
                    </div>
                    <button
                        onClick={handleLogin}
                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-500 transition mt-4 shadow-lg shadow-blue-600/20"
                    >
                        로그인
                    </button>
                </div>
                <p className="mt-8 text-center text-gray-500">
                    계정이 없으신가요? <button onClick={() => navigate('/signup')} className="text-white font-semibold underline underline-offset-4 ml-1">회원가입</button>
                </p>
            </GlassCard>
        </motion.div>
    );
};

export default LoginPage;
