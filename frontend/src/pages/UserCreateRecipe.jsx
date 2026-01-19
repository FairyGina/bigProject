import React from 'react';
import { useAuth } from '../context/AuthContext';

const steps = [
    { id: 1, title: '1. 떡볶이용 떡을 냄비에 담아 5-10분 불려요.' },
    { id: 2, title: '2. 양념장을 만들어요.' },
    { id: 3, title: '3. 물에 육수를 넣고 끓여주세요.' },
    { id: 4, title: '4. 떡과 양념을 넣고 완성해요.' },
];

const UserCreateRecipe = () => {
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
                        <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--text-soft)] mb-2">레시피 직접 등록하기</p>
                        <h2 className="text-2xl md:text-3xl font-semibold text-[color:var(--text)]">유저 레시피 등록 화면</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-sm font-semibold text-[color:var(--text)]">{maskedName}</p>
                            <p className="text-xs text-[color:var(--text-soft)]">직접 레시피 등록</p>
                        </div>
                        <div
                            className="h-10 w-10 rounded-full shadow-[0_10px_20px_var(--shadow)]"
                            style={{ background: 'linear-gradient(135deg, var(--avatar-1), var(--avatar-2))' }}
                        />
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
                    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_12px_30px_var(--shadow)] p-6 space-y-5">
                        <div>
                            <h3 className="text-lg font-semibold text-[color:var(--text)] mb-4">레시피</h3>
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="제목"
                                    className="w-full p-3 rounded-xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                                />
                                <textarea
                                    rows="3"
                                    placeholder="소개"
                                    className="w-full p-3 rounded-xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                                />
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold text-[color:var(--text-muted)] mb-2">조리순서</h4>
                            <div className="space-y-3">
                                {steps.map((step) => (
                                    <div
                                        key={step.id}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-[color:var(--surface-muted)] border border-[color:var(--border)]"
                                    >
                                        <div className="h-12 w-12 rounded-lg bg-[color:var(--surface)] border border-[color:var(--border)] flex items-center justify-center text-[color:var(--text-soft)] text-xs">
                                            사진
                                        </div>
                                        <p className="text-sm text-[color:var(--text)]">{step.title}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_12px_30px_var(--shadow)] p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-[color:var(--text)]">재료</h3>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    className="px-3 py-1.5 rounded-lg bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-xs text-[color:var(--text)]"
                                >
                                    새로 입력
                                </button>
                                <button
                                    type="button"
                                    className="px-3 py-1.5 rounded-lg bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-xs text-[color:var(--text)]"
                                >
                                    불러오기
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm text-[color:var(--text-muted)]">
                            <div className="flex items-center justify-between rounded-lg border border-[color:var(--border)] px-3 py-2">
                                <span>계란</span>
                                <span>2개</span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border border-[color:var(--border)] px-3 py-2">
                                <span>떡</span>
                                <span>200g</span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border border-[color:var(--border)] px-3 py-2">
                                <span>어묵</span>
                                <span>150g</span>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm text-[color:var(--text-muted)]">
                            <p className="font-semibold text-[color:var(--text)]">PDF 다운로드</p>
                            <button
                                type="button"
                                className="w-full py-2 rounded-lg bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-sm text-[color:var(--text)]"
                            >
                                다운로드
                            </button>
                        </div>

                        <button
                            type="button"
                            className="w-full py-3 rounded-xl bg-[color:var(--accent)] text-[color:var(--accent-contrast)] font-semibold hover:bg-[color:var(--accent-strong)] transition shadow-[0_10px_30px_var(--shadow)]"
                        >
                            레시피 저장
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserCreateRecipe;
