import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/common/GlassCard';
import ThemeToggle from '../components/common/ThemeToggle';
import Footer from '../components/common/Footer';
import axiosInstance from '../axiosConfig';

const TARGET_COUNTRY_OPTIONS = [
    { value: 'KR', label: '한국' },
    { value: 'US', label: '미국' },
    { value: 'JP', label: '일본' },
    { value: 'CN', label: '중국' },
    { value: 'FR', label: '프랑스' },
    { value: 'DE', label: '독일' },
    { value: 'PL', label: '폴란드' },
    { value: 'IN', label: '인도' },
    { value: 'VN', label: '베트남' },
    { value: 'TH', label: '태국' },
];

const SignUpPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        userName: '',
        birthDate: '',
        userId: '',
        password: '',
        confirmPassword: '',
        companyName: '',
        industry: '',
        targetCountry: ''
    });
    const [consents, setConsents] = useState({
        terms: false,
        privacy: false,
        thirdParty: false,
        uniqueId: false
    });
    const [error, setError] = useState('');

    const showError = (message) => {
        setError(message);
        alert(message);
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const hasSequentialDigits = (value, length = 3) => {
        if (!value) return false;
        const s = value;
        let inc = 1;
        let dec = 1;
        for (let i = 1; i < s.length; i += 1) {
            const prev = s[i - 1];
            const curr = s[i];
            const isDigitSeq = /\d/.test(prev) && /\d/.test(curr);
            if (isDigitSeq && curr.charCodeAt(0) - prev.charCodeAt(0) === 1) {
                inc += 1;
            } else {
                inc = 1;
            }
            if (isDigitSeq && prev.charCodeAt(0) - curr.charCodeAt(0) === 1) {
                dec += 1;
            } else {
                dec = 1;
            }
            if (inc >= length || dec >= length) {
                return true;
            }
        }
        return false;
    };

    const hasSequentialLetters = (value, length = 3) => {
        if (!value) return false;
        const s = value.toLowerCase();
        let inc = 1;
        let dec = 1;
        for (let i = 1; i < s.length; i += 1) {
            const prev = s[i - 1];
            const curr = s[i];
            const isAlphaSeq = /[a-z]/.test(prev) && /[a-z]/.test(curr);
            if (isAlphaSeq && curr.charCodeAt(0) - prev.charCodeAt(0) === 1) {
                inc += 1;
            } else {
                inc = 1;
            }
            if (isAlphaSeq && prev.charCodeAt(0) - curr.charCodeAt(0) === 1) {
                dec += 1;
            } else {
                dec = 1;
            }
            if (inc >= length || dec >= length) {
                return true;
            }
        }
        return false;
    };

    const hasKeyboardSequence = (value, length = 3) => {
        if (!value) return false;
        const lower = value.toLowerCase();
        const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
        const containsRun = (row) => {
            for (let i = 0; i <= row.length - length; i += 1) {
                const seq = row.slice(i, i + length);
                if (lower.includes(seq)) {
                    return true;
                }
            }
            return false;
        };
        return rows.some((row) => containsRun(row) || containsRun([...row].reverse().join('')));
    };

    const isGuessablePassword = (password, email, birthDate) => {
        if (!password) return false;
        const lower = password.toLowerCase();
        if (email) {
            const local = email.split('@')[0]?.replace(/[^a-z0-9]/gi, '').toLowerCase();
            if (local && local.length >= 3 && lower.includes(local)) {
                return true;
            }
        }
        if (birthDate) {
            const digits = birthDate.replace(/[^0-9]/g, '');
            if (digits.length >= 6) {
                const yyyymmdd = digits;
                const yymmdd = digits.slice(2);
                const mmdd = digits.slice(4);
                if (lower.includes(yyyymmdd) || lower.includes(yymmdd) || lower.includes(mmdd)) {
                    return true;
                }
            }
        }
        return (
            hasSequentialDigits(password, 3) ||
            hasSequentialLetters(password, 3) ||
            hasKeyboardSequence(password, 3)
        );
    };

    const handleSignup = async () => {
        setError('');

        if (!formData.userName) {
            showError('이름(닉네임)을 입력해주세요');
            return;
        }

        if (!formData.companyName) {
            showError('기업명을 입력해주세요.');
            return;
        }

        if (!formData.industry) {
            showError('업종을 선택해주세요.');
            return;
        }

        if (!formData.targetCountry) {
            showError('주요 타겟국을 선택해주세요');
            return;
        }

        if (!formData.birthDate) {
            showError('생년월일을 입력해주세요.');
            return;
        }

        if (!formData.userId) {
            showError('이메일 주소(아이디)를 입력해주세요');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            showError('비밀번호가 일치하지 않습니다.');
            return;
        }

        const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
        if (!passwordPattern.test(formData.password)) {
            showError('비밀번호는 8자 이상, 영문+숫자+특수문자를 포함해야 합니다.');
            return;
        }

        if (isGuessablePassword(formData.password, formData.userId, formData.birthDate)) {
            showError('연속된 문자열이나 아이디/생년월일 등 추측 가능한 정보를 비밀번호에 사용할 수 없습니다.');
            return;
        }

        if (!consents.terms || !consents.privacy || !consents.thirdParty || !consents.uniqueId) {
            showError('필수 동의 항목을 체크해주세요');
            return;
        }

        try {
            const response = await axiosInstance.post('/api/auth/join', formData);
            if (response.status >= 200 && response.status < 300) {
                alert('회원가입이 완료되었습니다. 로그인해주세요.');
                navigate('/login');
            } else {
                showError('회원가입에 실패했습니다.');
            }
        } catch (err) {
            console.error(err);
            const backendMessage = err.response?.data?.message;
            showError(backendMessage || '서버 연결에 실패했습니다.');
        }
    };

    const handleConsentChange = (key) => {
        setConsents((prev) => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleSocialSignup = (provider) => {
        if (!consents.terms || !consents.privacy || !consents.thirdParty || !consents.uniqueId) {
            showError('필수 약관에 모두 동의해주세요.');
            return;
        }

        try {
            sessionStorage.setItem('oauthFlow', 'signup');
            localStorage.setItem('oauthFlow', 'signup');
        } catch (storageError) {
            console.warn('OAuth flow storage unavailable:', storageError);
        }
        const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
        window.location.assign(`${baseUrl}/oauth2/authorization/${provider}`);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-6 text-[color:var(--text)]"
            style={{ background: 'linear-gradient(135deg, var(--bg-1), var(--bg-2), var(--bg-3))' }}
        >
            <ThemeToggle className="fixed top-6 right-6 z-50" />
            <GlassCard className="w-full max-w-lg p-12 relative">
                <button
                    onClick={() => navigate('/')}
                    className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-[color:var(--surface-muted)] hover:bg-[color:var(--border)] transition text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
                >
                    <X size={20} />
                </button>

                <div className="flex justify-between items-start mb-10 pr-8">
                    <div>
                        <h2 className="text-3xl font-bold mb-2">계정 생성</h2>
                        <p className="text-[color:var(--text-muted)]">필수 정보를 입력해 주세요.</p>
                        <p className="mt-2 text-sm text-[color:var(--text-soft)]">
                            소셜 회원가입을 원할 시, 필수 동의 항목 4가지 체크 후 맨 아래 소셜 회원가입 버튼을 클릭해주세요.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-[color:var(--danger-bg)] border border-[color:var(--danger)]/30 rounded-lg text-[color:var(--danger)] text-sm text-center">
                        {error}
                    </div>
                )}

                <form
                    className="space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSignup();
                    }}
                >
                    <input
                        type="text"
                        name="userName"
                        placeholder="이름 (닉네임)"
                        value={formData.userName}
                        onChange={handleChange}
                        className="w-full p-4 rounded-2xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    />
                    <input
                        type="text"
                        name="companyName"
                        placeholder="기업명"
                        value={formData.companyName}
                        onChange={handleChange}
                        className="w-full p-4 rounded-2xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    />

                    <select
                        name="industry"
                        value={formData.industry}
                        onChange={handleChange}
                        className="w-full p-4 rounded-2xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    >
                        <option value="" disabled>
                            업종 선택
                        </option>
                        <option value="식품제조">식품제조</option>
                        <option value="식품가공/조리식품">식품가공/조리식품</option>
                        <option value="간편식/HMR">간편식/HMR</option>
                        <option value="소스/양념/조미">소스/양념/조미</option>
                        <option value="베이커리/디저트">베이커리/디저트</option>
                        <option value="카페/음료">카페/음료</option>
                        <option value="외식">외식</option>
                        <option value="프랜차이즈">프랜차이즈</option>
                        <option value="유통/리테일">유통/리테일</option>
                        <option value="수출/무역">수출/무역</option>
                        <option value="농수산물/원재료">농수산물/원재료</option>
                        <option value="급식/케이터링">급식/케이터링</option>
                        <option value="기타">기타</option>
                    </select>

                    <select
                        name="targetCountry"
                        value={formData.targetCountry}
                        onChange={handleChange}
                        className="w-full p-4 rounded-2xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    >
                        <option value="" disabled>
                            주요 타겟국
                        </option>
                        {TARGET_COUNTRY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>

                    <input
                        type="date"
                        name="birthDate"
                        placeholder="생년월일"
                        value={formData.birthDate}
                        onChange={handleChange}
                        className="w-full p-4 rounded-2xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    />

                    <input
                        type="email"
                        name="userId"
                        placeholder="이메일 주소 (아이디)"
                        value={formData.userId}
                        onChange={handleChange}
                        className="w-full p-4 rounded-2xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    />

                    <input
                        type="password"
                        name="password"
                        placeholder="비밀번호 (8자 이상, 영문+숫자+특수문자)"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full p-4 rounded-2xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    />

                    <input
                        type="password"
                        name="confirmPassword"
                        placeholder="비밀번호 확인"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={`w-full p-4 rounded-2xl bg-[color:var(--surface-muted)] border ${formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-red-500' : 'border-[color:var(--border)]'} text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] transition`}
                    />

                    <div className="mt-4 space-y-3">
                        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)]/40 p-4">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={consents.terms}
                                    onChange={() => handleConsentChange('terms')}
                                    className="mt-1 h-4 w-4 accent-[color:var(--accent)]"
                                />
                                <span className="text-sm font-semibold">[필수] BeanRecipe 이용약관 동의</span>
                            </label>
                            <details className="mt-2 text-xs text-[color:var(--text-muted)]">
                                <summary className="cursor-pointer select-none">주요 내용 보기</summary>
                                <div className="mt-2 leading-relaxed space-y-1">
                                    <p>서비스 이용을 위해 필요한 기본 규칙과 책임, 금지행위, 계정 관리 기준을 안내합니다.</p>
                                    <p>회원은 정확한 정보를 제공해야 하며, 타인의 권리를 침해하는 행위를 해서는 안 됩니다.</p>
                                </div>
                            </details>
                        </div>

                        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)]/40 p-4">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={consents.uniqueId}
                                    onChange={() => handleConsentChange('uniqueId')}
                                    className="mt-1 h-4 w-4 accent-[color:var(--accent)]"
                                />
                                <span className="text-sm font-semibold">[필수] 고유식별정보 수집 및 이용 동의</span>
                            </label>
                            <details className="mt-2 text-xs text-[color:var(--text-muted)]">
                                <summary className="cursor-pointer select-none">주요 내용 보기</summary>
                                <div className="mt-2 leading-relaxed space-y-1">
                                    <p>수집 항목: 주민등록번호(필요 시에만 수집).</p>
                                    <p>수집 목적: 본인확인, 부정 이용 방지, 관련 법령 준수.</p>
                                    <p>보유 및 이용 기간: 목적 달성 시 즉시 파기(법령에 따라 보관 필요 시 해당 기간).</p>
                                    <p>동의 거부권 및 불이익: 동의를 거부할 권리가 있으나 본인확인이 필요한 서비스 이용이 제한될 수 있습니다.</p>
                                    <p>근거: 개인정보보호법 제24조의2(주민등록번호 처리 제한), 제15조(수집·이용).</p>
                                </div>
                            </details>
                        </div>

                        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)]/40 p-4">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={consents.privacy}
                                    onChange={() => handleConsentChange('privacy')}
                                    className="mt-1 h-4 w-4 accent-[color:var(--accent)]"
                                />
                                <span className="text-sm font-semibold">[필수] 개인정보 수집 및 이용 동의</span>
                            </label>
                            <details className="mt-2 text-xs text-[color:var(--text-muted)]">
                                <summary className="cursor-pointer select-none">주요 내용 보기</summary>
                                <div className="mt-2 leading-relaxed space-y-1">
                                    <p>수집 목적: 회원가입 처리, 서비스 제공, 고객 지원, 부정 이용 방지.</p>
                                    <p>수집 항목: 이름(닉네임), 이메일(아이디), 생년월일, 비밀번호(암호화 저장).</p>
                                    <p>보유 및 이용 기간: 회원 탈퇴 시까지(관련 법령에 따라 보관 필요 시 해당 기간).</p>
                                    <p>동의 거부권 및 불이익: 동의를 거부할 권리가 있으나 필수 항목 미동의 시 가입이 제한됩니다.</p>
                                    <p>근거: 개인정보보호법 제15조(수집·이용), 제22조(동의).</p>
                                </div>
                            </details>
                        </div>

                        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)]/40 p-4">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={consents.thirdParty}
                                    onChange={() => handleConsentChange('thirdParty')}
                                    className="mt-1 h-4 w-4 accent-[color:var(--accent)]"
                                />
                                <span className="text-sm font-semibold">[필수] 개인정보 제3자 제공 동의</span>
                            </label>
                            <details className="mt-2 text-xs text-[color:var(--text-muted)]">
                                <summary className="cursor-pointer select-none">주요 내용 보기</summary>
                                <div className="mt-2 leading-relaxed space-y-1">
                                    <p>제공받는 자: BeanRecipe 제휴 서비스 운영 파트너(제휴사 목록은 약관에서 안내).</p>
                                    <p>이용 목적: 서비스 연동 제공, 고객지원, 계정 연계 처리.</p>
                                    <p>제공 항목: 이름(닉네임), 이메일(아이디), 생년월일.</p>
                                    <p>보유 및 이용 기간: 제휴 목적 달성 또는 회원 탈퇴 시까지.</p>
                                    <p>동의 거부권 및 불이익: 동의를 거부할 권리가 있으나 필수 동의 미제공 시 가입이 제한됩니다.</p>
                                    <p>근거: 개인정보보호법 제17조(제3자 제공).</p>
                                </div>
                            </details>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-4 mt-8 bg-[color:var(--accent)] text-[color:var(--accent-contrast)] rounded-2xl font-bold hover:bg-[color:var(--accent-strong)] transition shadow-[0_10px_30px_var(--shadow)]"
                    >
                        회원가입 완료
                    </button>
                </form>

                <div className="flex items-center gap-3 text-[color:var(--text-muted)] text-xs uppercase tracking-[0.2em] justify-center mt-6">
                    <span className="h-px flex-1 bg-[color:var(--border)]/60"></span>
                    소셜 회원가입
                    <span className="h-px flex-1 bg-[color:var(--border)]/60"></span>
                </div>
                <div className="grid grid-cols-1 gap-3 mt-4">
                    <button
                        type="button"
                        onClick={() => handleSocialSignup('naver')}
                        className="w-full py-3 rounded-2xl border border-[color:var(--border)] text-[color:var(--text)] hover:bg-[color:var(--surface-muted)] transition"
                    >
                        네이버로 회원가입
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSocialSignup('kakao')}
                        className="w-full py-3 rounded-2xl border border-[color:var(--border)] text-[color:var(--text)] hover:bg-[color:var(--surface-muted)] transition"
                    >
                        카카오로 회원가입
                    </button>
                </div>
            </GlassCard>
            <div className="w-full max-w-4xl mt-6">
                <Footer />
            </div>
        </motion.div>
    );
};

export default SignUpPage;








