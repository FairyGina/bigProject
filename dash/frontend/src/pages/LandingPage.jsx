import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// 메인 랜딩 페이지
const LandingPage = () => {
    const navigate = useNavigate();
    const bookRef = useRef(null);
    const [rotation, setRotation] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e) => {
            // 화면 중앙 좌표 구하기
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;

            // 마우스 위치가 중앙에서 얼마나 떨어져 있는지 계산 (-1 ~ 1 사이의 값)
            const mouseX = (e.clientX - centerX) / centerX;
            const mouseY = (e.clientY - centerY) / centerY;

            // 회전 각도 설정 (최대 20도)
            const rotateX = mouseY * -20;
            const rotateY = mouseX * 20;

            setRotation({ x: rotateX, y: rotateY });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="min-h-screen bg-black text-white flex flex-col items-center justify-center relative overflow-hidden"
            style={{ perspective: '1000px' }}
        >
            {/* 배경 빛 효과 */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px]" />

            {/* 3D 책 이미지 - 글자 뒤에 배치 */}
            <div
                ref={bookRef}
                className="absolute top-1/2 left-1/2 pointer-events-none"
                style={{
                    width: '450px',
                    zIndex: 1,
                    transform: `translate(-50%, -50%) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
                    transition: 'transform 0.1s ease-out',
                }}
            >
                <img
                    src="/PhotoshopExtension_Image.png"
                    alt="Recipe Book"
                    className="w-full h-auto drop-shadow-2xl"
                    style={{
                        opacity: 0.5,
                        filter: 'drop-shadow(0 25px 50px rgba(0, 0, 0, 0.5)) blur(1px)',
                    }}
                />
            </div>

            <nav className="fixed top-0 w-full flex justify-between items-center px-12 py-8 z-50">
                <div className="text-2xl font-bold tracking-tighter">Hello World!</div>
                <div className="flex gap-8 items-center text-sm font-medium text-gray-400">
                    <button onClick={() => navigate('/login')} className="hover:text-white transition">Login</button>
                    <button onClick={() => navigate('/signup')} className="bg-white text-black px-6 py-2.5 rounded-full font-bold hover:scale-105 transition">Get Started</button>
                </div>
            </nav>

            {/* 텍스트 콘텐츠 - 책보다 앞에 배치 */}
            <div className="text-center px-4" style={{ zIndex: 10, position: 'relative' }}>
                <motion.h1
                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                    className="text-7xl md:text-9xl font-bold tracking-tight mb-8 bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent"
                >
                    테스트 <br /> 입니다.
                </motion.h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
                    테스트 <br /> 입니다.
                </p>
            </div>
        </motion.div>
    );
};

export default LandingPage;
