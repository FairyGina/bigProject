import React from 'react';
import { useAuth } from '../context/AuthContext';

const AICreateRecipe = () => {
    const { user } = useAuth();
    const rawName = user?.userName || localStorage.getItem('userName') || '김에이블러';
    const maskedName = rawName.length <= 1 ? '*' : `${rawName.slice(0, -1)}*`;

    return (
        <div className="relative">
            <div className="pointer-events-none absolute -top-16 -right-6 h-64 w-64 rounded-full bg-[color:var(--bg-3)] blur-3xl opacity-70" />
            <div className="pointer-events-none absolute bottom-6 left-16 h-52 w-52 rounded-full bg-[color:var(--surface-muted)] blur-3xl opacity-60" />

            <div className="rounded-[2.5rem] bg-[color:var(--surface)]/90 border border-[color:var(--border)] shadow-[0_30px_80px_var(--shadow)] p-8 md:p-10 backdrop-blur">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--text-soft)] mb-2">레시피 AI 생성하기</p>
                        <h2 className="text-2xl md:text-3xl font-semibold text-[color:var(--text)]">AI 레시피 생성 화면</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-sm font-semibold text-[color:var(--text)]">{maskedName}</p>
                            <p className="text-xs text-[color:var(--text-soft)]">레시피 생성</p>
                        </div>
                        <div
                            className="h-10 w-10 rounded-full shadow-[0_10px_20px_var(--shadow)]"
                            style={{ background: 'linear-gradient(135deg, var(--avatar-1), var(--avatar-2))' }}
                        />
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] shadow-[0_12px_30px_var(--shadow)] p-6 space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-full bg-[color:var(--accent)] text-[color:var(--accent-contrast)] flex items-center justify-center text-sm font-bold">
                                AI
                            </div>
                            <div className="flex-1 rounded-2xl bg-[color:var(--surface)] border border-[color:var(--border)] p-4 text-sm text-[color:var(--text)]">
                                어떤 레시피 재료를 사용할까요?
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-full bg-[color:var(--accent)]/80 text-[color:var(--accent-contrast)] flex items-center justify-center text-sm font-bold">
                                AI
                            </div>
                            <div className="flex-1 rounded-2xl bg-[color:var(--surface)] border border-[color:var(--border)] p-4 text-sm text-[color:var(--text)]">
                                채소, 곡물, 견과류 포함해주세요.
                            </div>
                        </div>
                        <div className="flex items-center justify-center">
                            <div className="h-32 w-32 rounded-2xl bg-[color:var(--surface)] border border-[color:var(--border)] flex items-center justify-center text-[color:var(--text-soft)] text-sm">
                                레시피 이미지
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="px-4 py-2 rounded-xl bg-[color:var(--surface)] border border-[color:var(--border)] text-sm text-[color:var(--text)] hover:bg-[color:var(--surface-muted)] transition"
                            >
                                다시 만들어
                            </button>
                            <button
                                type="button"
                                className="ml-auto px-6 py-2 rounded-xl bg-[color:var(--accent)] text-[color:var(--accent-contrast)] text-sm font-semibold hover:bg-[color:var(--accent-strong)] transition"
                            >
                                전송
                            </button>
                        </div>
                        <div className="border-t border-[color:var(--border)] pt-4">
                            <p className="text-sm text-[color:var(--text-muted)] mb-3">레시피를 재생성하시겠습니까?</p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    className="flex-1 py-2 rounded-lg bg-[color:var(--surface)] border border-[color:var(--border)] text-sm text-[color:var(--text)] hover:bg-[color:var(--surface-muted)] transition"
                                >
                                    YES
                                </button>
                                <button
                                    type="button"
                                    className="flex-1 py-2 rounded-lg bg-[color:var(--surface)] border border-[color:var(--border)] text-sm text-[color:var(--text)] hover:bg-[color:var(--surface-muted)] transition"
                                >
                                    NO
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_12px_30px_var(--shadow)] p-6">
                        <h3 className="text-lg font-semibold text-[color:var(--text)] mb-4">AI 요약 보고서</h3>
                        <ol className="space-y-2 text-sm text-[color:var(--text-muted)] list-decimal list-inside">
                            <li>AI 심사 평가</li>
                            <li>시장 분석</li>
                            <li>시장 리스크</li>
                            <li>관련 인플루언서</li>
                        </ol>
                        <div className="mt-6 space-y-3 text-sm text-[color:var(--text)]">
                            <p>레시피 메뉴명 : 두바이 스파이시 마라 초콜릿</p>
                            <p>레시피 내용 : 카다이프와 카카오, 그리고 마라소스로 구성된 초콜릿</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AICreateRecipe;
