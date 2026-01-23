import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/common/ThemeToggle';
<<<<<<< HEAD
=======
import Footer from '../components/common/Footer';
>>>>>>> upstream/UI3

const LandingPage = () => {
    const navigate = useNavigate();
    const bookRef = useRef(null);
    const [rotation, setRotation] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e) => {
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;

            const mouseX = (e.clientX - centerX) / centerX;
            const mouseY = (e.clientY - centerY) / centerY;

            const rotateX = mouseY * -20;
            const rotateY = mouseX * 20;

            setRotation({ x: rotateX, y: rotateY });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen text-[color:var(--text)] flex flex-col items-center justify-center relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, var(--bg-1), var(--bg-2), var(--bg-3))', perspective: '1000px' }}
        >
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[color:var(--accent)]/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[color:var(--accent-strong)]/20 rounded-full blur-[120px]" />

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
                <div className="text-2xl font-bold tracking-tighter">BEAN RECIPE</div>
                <div className="flex gap-4 items-center text-sm font-medium text-[color:var(--text-muted)]">
                    <button onClick={() => navigate('/login')} className="hover:text-[color:var(--text)] transition">
                        Login
                    </button>
                    <button
                        onClick={() => navigate('/signup')}
                        className="bg-[color:var(--accent)] text-[color:var(--accent-contrast)] px-6 py-2.5 rounded-full font-bold hover:opacity-90 transition"
                    >
                        회원가입
                    </button>
                    <ThemeToggle className="ml-2" />
                </div>
            </nav>

            <div className="text-center px-4" style={{ zIndex: 10, position: 'relative' }}>
                <motion.h1
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-7xl md:text-9xl font-bold tracking-tight mb-8 bg-gradient-to-b from-[color:var(--text)] to-[color:var(--text-soft)] bg-clip-text text-transparent"
                >
                    빈수레의
                    <br />
                    <br />
                    빈레시피
                </motion.h1>
                {/* <p className="text-xl text-[color:var(--text-muted)] max-w-2xl mx-auto mb-12 leading-relaxed">
                    빈수레의
                    <br />
                    빈레시피
                </p> */}
            </div>
<<<<<<< HEAD
=======

            <div className="absolute bottom-0 left-0 right-0">
                <Footer />
            </div>
>>>>>>> upstream/UI3
        </motion.div>
    );
};

export default LandingPage;
