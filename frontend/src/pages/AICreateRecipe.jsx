import React from 'react';
import { useAuth } from '../context/AuthContext';

const AICreateRecipe = () => {
    const { user } = useAuth();
    const rawName = user?.userName || localStorage.getItem('userName') || '사용자';
    const maskedName = rawName.length <= 1 ? '*' : `${rawName.slice(0, -1)}*`;
    const iframeSrc = '/ai/recipe/';

    return (
        <div className="relative">
            <div className="pointer-events-none absolute -top-16 -right-6 h-64 w-64 rounded-full bg-[color:var(--bg-3)] blur-3xl opacity-70" />
            <div className="pointer-events-none absolute bottom-6 left-16 h-52 w-52 rounded-full bg-[color:var(--surface-muted)] blur-3xl opacity-60" />

            <div className="rounded-[2.5rem] bg-[color:var(--surface)]/90 border border-[color:var(--border)] shadow-[0_30px_80px_var(--shadow)] p-6 md:p-10 backdrop-blur">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--text-soft)] mb-2">AI 레시피 챗봇</p>
                        <h2 className="text-2xl md:text-3xl font-semibold text-[color:var(--text)]">AI 레시피 생성하기</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-sm font-semibold text-[color:var(--text)]">{maskedName}</p>
                        </div>
                        <div
                            className="h-10 w-10 rounded-full shadow-[0_10px_20px_var(--shadow)]"
                            style={{ background: 'linear-gradient(135deg, var(--avatar-1), var(--avatar-2))' }}
                        />
                        <a
                            href={iframeSrc}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-[color:var(--accent)] underline underline-offset-4"
                        >
                            Open in new tab
                        </a>
                    </div>
                </div>

                <div className="mt-6 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] shadow-[0_12px_30px_var(--shadow)] overflow-hidden">
                    <iframe
                        title="AI Recipe Chatbot"
                        src={iframeSrc}
                        className="h-[70vh] w-full"
                        loading="lazy"
                    />
                </div>
            </div>
        </div>
    );
};

export default AICreateRecipe;
