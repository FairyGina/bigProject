import React from 'react';
import { useAuth } from '../context/AuthContext';

const AICreateRecipe = () => {
    const { user } = useAuth();
    const rawName = user?.userName || localStorage.getItem('userName') || '김에이블러';
    const maskedName = rawName.length <= 1 ? '*' : `${rawName.slice(0, -1)}*`;

    const messages = [
        {
            id: 'init',
            role: 'assistant',
            type: 'text',
            content: '기획하고 싶은 레시피가 있나요? 예/아니오로 선택해주세요.',
        },
    ];

    return (
        <div className="relative">
            <div className="pointer-events-none absolute -top-16 -right-6 h-64 w-64 rounded-full bg-[color:var(--bg-3)] blur-3xl opacity-70" />
            <div className="pointer-events-none absolute bottom-6 left-16 h-52 w-52 rounded-full bg-[color:var(--surface-muted)] blur-3xl opacity-60" />

            <div className="rounded-[2.5rem] bg-[color:var(--surface)]/90 border border-[color:var(--border)] shadow-[0_30px_80px_var(--shadow)] p-8 md:p-10 backdrop-blur">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--text-soft)] mb-2">레시피 AI로 생성하기</p>
                        <h2 className="text-2xl md:text-3xl font-semibold text-[color:var(--text)]">AI 레시피 생성</h2>
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

                <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] shadow-[0_12px_30px_var(--shadow)] p-6 space-y-4">
                        <div className="space-y-4 max-h-[520px] overflow-y-auto pr-2">
                            {messages.map((msg) => (
                                <div key={msg.id} className="flex items-start gap-3">
                                    <div className="h-10 w-10 rounded-full bg-[color:var(--accent)] text-[color:var(--accent-contrast)] flex items-center justify-center text-sm font-bold">
                                        AI
                                    </div>
                                    <div className="rounded-2xl border border-[color:var(--border)] p-4 text-sm whitespace-pre-line max-w-[85%] bg-[color:var(--surface)] text-[color:var(--text)]">
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                disabled
                                className="flex-1 py-2 rounded-lg bg-[color:var(--accent)] text-[color:var(--accent-contrast)] text-sm font-semibold opacity-60"
                            >
                                예
                            </button>
                            <button
                                type="button"
                                disabled
                                className="flex-1 py-2 rounded-lg border border-[color:var(--border)] text-sm text-[color:var(--text)] opacity-60"
                            >
                                아니오
                            </button>
                        </div>

                        <div className="space-y-2">
                            <textarea
                                disabled
                                rows={3}
                                placeholder="예: 닭가슴살과 고구마, 매콤한 컨셉"
                                className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3 text-sm text-[color:var(--text)] opacity-60"
                            />
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled
                                    className="px-4 py-2 rounded-xl bg-[color:var(--accent)] text-[color:var(--accent-contrast)] text-sm font-semibold opacity-60"
                                >
                                    전송
                                </button>
                                <button
                                    type="button"
                                    disabled
                                    className="px-4 py-2 rounded-xl bg-[color:var(--surface)] border border-[color:var(--border)] text-sm text-[color:var(--text)] opacity-60"
                                >
                                    다시 만들어
                                </button>
                            </div>
                            <p className="text-xs text-[color:var(--text-soft)]">기능은 추후 연결됩니다.</p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_12px_30px_var(--shadow)] p-6 space-y-4">
                        <div className="flex items-start justify-between">
                            <h3 className="text-lg font-semibold text-[color:var(--text)]">AI 요약 보고서</h3>
                        </div>

                        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
                            <p className="text-sm font-semibold text-[color:var(--text)] mb-2">생성된 레시피</p>
                            <p className="text-sm text-[color:var(--text-muted)] whitespace-pre-line">
                                아직 생성된 레시피가 없습니다.
                            </p>
                        </div>

                        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4 space-y-3">
                            <button
                                type="button"
                                disabled
                                className="w-full py-2 rounded-lg bg-[color:var(--accent)] text-[color:var(--accent-contrast)] text-sm font-semibold opacity-60"
                            >
                                리포트 생성하기
                            </button>
                            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3">
                                <p className="text-sm font-semibold text-[color:var(--text)] mb-2">요약</p>
                                <p className="text-sm text-[color:var(--text-muted)] whitespace-pre-line">
                                    레시피 이미지를 클릭하거나 버튼을 눌러 요약을 생성하세요.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AICreateRecipe;