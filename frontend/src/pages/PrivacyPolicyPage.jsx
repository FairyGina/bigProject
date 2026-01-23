import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/common/GlassCard';
import ThemeToggle from '../components/common/ThemeToggle';

const PrivacyPolicyPage = () => {
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
                    <h1 className="text-3xl font-bold">개인정보처리방침</h1>
                    <p className="text-[color:var(--text-muted)] mt-2">
                        BeanRecipe는 개인정보보호법 등 관계 법령을 준수하며, 이용자의 개인정보를 안전하게 보호합니다.
                    </p>
                    <p className="text-xs text-[color:var(--text-soft)] mt-3">시행일: 2026-01-21</p>
                </header>

                <section className="space-y-8 text-sm leading-relaxed">
                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold">1. 개인정보의 수집·이용 목적</h2>
                        <p>회원가입 및 서비스 제공, 고객지원, 부정 이용 방지, 서비스 고도화를 위해 개인정보를 처리합니다.</p>
                    </div>

                    <div className="space-y-3">
                        <h2 className="text-lg font-semibold">2. 수집 항목</h2>
                        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)]/40 p-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                <div className="font-semibold text-[color:var(--text-muted)]">구분</div>
                                <div className="font-semibold text-[color:var(--text-muted)]">수집 항목</div>
                                <div className="font-semibold text-[color:var(--text-muted)]">수집 목적</div>
                                <div>필수</div>
                                <div>이름(닉네임), 이메일(아이디), 생년월일, 비밀번호(암호화 저장)</div>
                                <div>회원가입 처리, 서비스 제공, 계정 식별</div>
                                <div>자동수집</div>
                                <div>접속 로그, 쿠키, 서비스 이용 기록</div>
                                <div>서비스 안정성 및 보안, 통계 분석</div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold">3. 보유 및 이용 기간</h2>
                        <p>원칙적으로 회원 탈퇴 시까지 보관하며, 관계 법령에 따라 보관이 필요한 경우 해당 기간 동안 보관합니다.</p>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold">4. 개인정보의 제3자 제공</h2>
                        <p>원칙적으로 이용자의 동의 없이 제3자에게 제공하지 않습니다. 다만 법령에 따라 제공이 필요한 경우는 예외로 합니다.</p>
                        <p>동의가 필요한 경우 제공받는 자, 목적, 항목, 보유 기간을 사전에 고지합니다.</p>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold">5. 개인정보 처리 위탁</h2>
                        <p>서비스 제공을 위해 필요한 경우에 한하여 업무를 위탁할 수 있으며, 위탁 시 관련 법령에 따라 관리·감독합니다.</p>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold">6. 이용자의 권리</h2>
                        <p>이용자는 언제든지 개인정보 열람·정정·삭제·처리정지를 요구할 수 있습니다. 문의처로 요청해주세요.</p>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold">7. 안전성 확보 조치</h2>
                        <p>접근 통제, 암호화, 로그 관리, 취약점 점검 등 기술적·관리적 보호조치를 시행합니다.</p>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold">8. 문의처</h2>
                        <p>개인정보 관련 문의: privacy@beanrecipe.example</p>
                    </div>
                </section>
            </GlassCard>
        </motion.div>
    );
};

export default PrivacyPolicyPage;
