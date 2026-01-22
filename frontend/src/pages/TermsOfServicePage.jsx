import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/common/GlassCard';
import ThemeToggle from '../components/common/ThemeToggle';

const TermsOfServicePage = () => {
    const navigate = useNavigate();

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="min-h-screen flex items-center justify-center p-6 text-[color:var(--text)]"
            style={{ background: 'linear-gradient(135deg, var(--bg-1), var(--bg-2), var(--bg-3))' }}
        >
            <ThemeToggle className="fixed top-6 right-6 z-50" />
            <GlassCard className="w-full max-w-4xl p-10 relative">
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-[color:var(--surface-muted)] hover:bg-[color:var(--border)] transition text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
                >
                    <X size={20} />
                </button>

                <header className="mb-8 pr-10">
                    <h1 className="text-3xl font-bold">BeanRecipe 이용약관</h1>
                    <p className="text-[color:var(--text-muted)] mt-2">
                        본 약관은 서비스 이용과 관련한 기본 규칙, 회원의 권리·의무 및 책임사항을 규정합니다.
                    </p>
                    <p className="text-xs text-[color:var(--text-soft)] mt-3">시행일: 2026-01-21</p>
                </header>

                <section className="space-y-8 text-sm leading-relaxed">
                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold">1. 목적</h2>
                        <p>본 약관은 BeanRecipe가 제공하는 서비스의 이용과 관련하여 회사와 회원 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold">2. 정의</h2>
                        <p>“서비스”란 회사가 제공하는 레시피 추천, 사용자 게시, AI 생성 기능 등을 의미합니다.</p>
                        <p>“회원”이란 본 약관에 동의하고 계정을 생성하여 서비스를 이용하는 자를 말합니다.</p>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold">3. 약관의 게시 및 변경</h2>
                        <p>회사는 약관의 내용을 서비스 초기 화면 또는 연결 화면에 게시합니다.</p>
                        <p>약관을 변경할 경우 적용일자와 변경 사유를 사전에 공지하며, 회원에게 불리한 변경은 법령에 따라 추가 고지합니다.</p>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold">4. 회원가입 및 계정 관리</h2>
                        <p>회원은 정확한 정보를 제공해야 하며, 계정 정보에 대한 관리 책임은 회원에게 있습니다.</p>
                        <p>회원은 계정 정보를 제3자에게 공유하거나 대여할 수 없습니다.</p>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold">5. 서비스 이용</h2>
                        <p>회사는 운영상 또는 기술상 필요에 따라 서비스의 일부를 변경하거나 중단할 수 있습니다.</p>
                        <p>회원은 관련 법령, 본 약관 및 서비스 이용 안내를 준수해야 합니다.</p>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold">6. 금지행위</h2>
                        <p>타인의 권리 침해, 불법 정보 게시, 서비스 장애 유발 행위 등은 금지됩니다.</p>
                        <p>회사는 위반 행위에 대해 이용 제한, 게시물 삭제 등의 조치를 취할 수 있습니다.</p>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold">7. 게시물의 권리와 책임</h2>
                        <p>회원이 게시한 콘텐츠에 대한 책임은 회원에게 있으며, 회사는 관련 법령에 따라 필요한 조치를 취할 수 있습니다.</p>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold">8. 개인정보 보호</h2>
                        <p>회사는 개인정보처리방침에 따라 회원의 개인정보를 보호합니다.</p>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold">9. 책임 제한</h2>
                        <p>회사는 천재지변, 불가항력, 회원의 귀책사유로 인한 손해에 대해 책임을 지지 않습니다.</p>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold">10. 분쟁 해결</h2>
                        <p>분쟁이 발생할 경우 관련 법령 및 일반 상관례에 따릅니다.</p>
                    </div>
                </section>
            </GlassCard>
        </motion.div>
    );
};

export default TermsOfServicePage;
