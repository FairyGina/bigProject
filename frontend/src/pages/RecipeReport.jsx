import React from 'react';
import { useAuth } from '../context/AuthContext';

const recipeScores = [
    { id: 1, label: '미주', score: 10, top: '42%', left: '20%' },
    { id: 2, label: '유럽', score: 7, top: '38%', left: '50%' },
    { id: 3, label: '동아시아', score: 6, top: '30%', left: '70%' },
    { id: 4, label: '오세아니아', score: 3, top: '62%', left: '80%' },
];

const RecipeReport = () => {
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
                        <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--text-soft)] mb-2">레시피 보고서</p>
                        <h2 className="text-2xl md:text-3xl font-semibold text-[color:var(--text)]">레시피 보고서 화면</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-sm font-semibold text-[color:var(--text)]">{maskedName}</p>
                        </div>
                        <div
                            className="h-10 w-10 rounded-full shadow-[0_10px_20px_var(--shadow)]"
                            style={{ background: 'linear-gradient(135deg, var(--avatar-1), var(--avatar-2))' }}
                        />
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
                    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_12px_30px_var(--shadow)] p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-[color:var(--text)]">지도</h3>
                            <span className="text-xs text-[color:var(--text-soft)]">Google Map API 예정</span>
                        </div>
                        <div className="relative h-[360px] rounded-2xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] overflow-hidden">
                            <div className="absolute inset-0 flex items-center justify-center text-[color:var(--text-soft)] text-sm">
                                세계 지도 영역
                            </div>
                            {recipeScores.map((marker) => (
                                <div
                                    key={marker.id}
                                    className="absolute flex flex-col items-center"
                                    style={{ top: marker.top, left: marker.left }}
                                >
                                    <div className="w-8 h-8 rounded-full bg-[color:var(--accent)] text-[color:var(--accent-contrast)] flex items-center justify-center text-xs font-bold shadow-[0_6px_16px_var(--shadow)]">
                                        {marker.score}
                                    </div>
                                    <div className="mt-1 text-xs text-[color:var(--text-soft)]">{marker.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_12px_30px_var(--shadow)] p-6 space-y-4">
                        <div className="flex items-start justify-between">
                            <h3 className="text-lg font-semibold text-[color:var(--text)]">레시피 보고서</h3>
                            <button
                                type="button"
                                className="px-3 py-1.5 rounded-lg bg-[color:var(--accent)] text-[color:var(--accent-contrast)] text-xs font-semibold hover:bg-[color:var(--accent-strong)] transition"
                            >
                                PDF 다운로드
                            </button>
                        </div>

                        <div className="space-y-2 text-sm text-[color:var(--text)]">
                            <p>1. AI 심사 평가</p>
                            <p>2. 시장 분석</p>
                            <p>3. 시장 리스크</p>
                            <p>4. 홍보 추천 인플루언서</p>
                        </div>

                        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
                            <p className="text-sm font-semibold text-[color:var(--text)] mb-3">추천 인플루언서</p>
                            <div className="flex items-center gap-3">
                                <div className="h-16 w-20 rounded-lg bg-[color:var(--surface)] border border-[color:var(--border)] flex items-center justify-center text-xs text-[color:var(--text-soft)]">
                                    사진
                                </div>
                                <div className="text-sm text-[color:var(--text-muted)]">
                                    레시피와 함께한 사진을 표시합니다.
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
                            <p className="text-sm font-semibold text-[color:var(--text)] mb-2">레시피 설명</p>
                            <p className="text-sm text-[color:var(--text-muted)]">
                                시장 분석 하단에 레시피 설명이 표시됩니다.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecipeReport;
