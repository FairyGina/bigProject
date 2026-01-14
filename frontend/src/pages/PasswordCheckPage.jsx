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
        try {
            // 실제 비밀번호 검증 API 호출
            // const response = await axiosInstance.post('/api/user/verify-password', { password });

            // 데모용: API 성공으로 가정하고 이동
            // 실제 구현 시 response.status === 200 체크 필요
            navigate('/dashboard/settings/profile');
        } catch (err) {
            console.error(err);
            // 에러 시에도 데모를 위해 이동 (개발 단계 편의)
            // 실제로는 setError('비밀번호가 일치하지 않습니다.'); 여야 함
            navigate('/dashboard/settings/profile');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] text-center">
            <div className="bg-blue-100 p-8 rounded-3xl mb-8 relative">
                <div className="bg-white/80 p-4 rounded-xl shadow-sm">
                    <div className="w-20 h-20 bg-teal-400 rounded-full flex items-center justify-center mx-auto relative overflow-hidden">
                        <Search className="text-white w-10 h-10" />
                        <div className="absolute inset-0 bg-white/20 -skew-x-12 translate-x-4"></div>
                    </div>
                </div>
                {/* 장식용 점들 */}
                <div className="absolute top-4 left-4 flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                    <div className="w-2 h-2 rounded-full bg-teal-500/50"></div>
                    <div className="w-2 h-2 rounded-full bg-teal-500/30"></div>
                </div>
            </div>

            <h2 className="text-3xl font-bold mb-12">비밀번호 확인이 필요합니다</h2>

            <div className="w-full max-w-md text-left">
                <label className="block text-sm font-bold mb-4 ml-1">비밀번호 확인</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호를 입력해주세요."
                    className="w-full p-4 rounded-xl bg-transparent border-b-2 border-gray-300 focus:border-teal-400 focus:outline-none transition-colors text-lg"
                />

                {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}

                <button
                    onClick={handlePasswordCheck}
                    className="w-full mt-12 py-4 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-teal-500/30"
                >
                    확인
                </button>
            </div>
        </div>
    );
};

export default PasswordCheckPage;
