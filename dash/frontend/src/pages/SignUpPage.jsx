import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/common/GlassCard';

// 회원가입 페이지
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

        // 프론트엔드 유효성 검사
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
                navigate('/login'); // 회원가입 후 로그인 페이지로 이동
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
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="min-h-screen bg-[#0A0A0C] flex items-center justify-center p-6"
        >
            <GlassCard className="w-full max-w-lg p-12 relative">
                {/* X 닫기 버튼 */}
                <button
                    onClick={() => navigate('/')}
                    className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition text-gray-400 hover:text-white"
                >
                    <X size={20} />
                </button>

                <div className="flex justify-between items-start mb-10 pr-8">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">계정 생성</h2>
                        <p className="text-gray-400">필수 정보를 입력하여 가입하세요.</p>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm text-center">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    {/* 이름 */}
                    <input
                        type="text"
                        name="userName"
                        placeholder="이름 (전체)"
                        value={formData.userName}
                        onChange={handleChange}
                        className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />

                    {/* 생년월일 */}
                    <input
                        type="date"
                        name="birthDate"
                        placeholder="생년월일"
                        value={formData.birthDate}
                        onChange={handleChange}
                        className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />

                    {/* 이메일 (아이디) */}
                    <input
                        type="email"
                        name="userId"
                        placeholder="이메일 주소 (아이디)"
                        value={formData.userId}
                        onChange={handleChange}
                        className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />

                    {/* 비밀번호 */}
                    <input
                        type="password"
                        name="password"
                        placeholder="비밀번호 (8자 이상, 영문+숫자+특수문자)"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />

                    {/* 비밀번호 확인 */}
                    <input
                        type="password"
                        name="confirmPassword"
                        placeholder="비밀번호 확인"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={`w-full p-4 rounded-2xl bg-white/5 border ${formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-red-500' : 'border-white/10'} text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition`}
                    />
                </div>

                <button
                    onClick={handleSignup}
                    className="w-full py-4 mt-8 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-bold hover:opacity-90 transition shadow-xl shadow-purple-600/20"
                >
                    회원가입 완료
                </button>
            </GlassCard>
        </motion.div>
    );
};

export default SignUpPage;
