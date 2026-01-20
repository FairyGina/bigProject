import React from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const recipeCards = [
    { id: 5, name: '레시피명5' },
    { id: 4, name: '레시피명4' },
    { id: 3, name: '레시피명3' },
    { id: 2, name: '레시피명2' },
    { id: 1, name: '레시피명1' },
];

const UserBoard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const rawName = user?.userName || localStorage.getItem('userName') || '김에이블러';
    const maskedName = rawName.length <= 1 ? '*' : `${rawName.slice(0, -1)}*`;

    return (
        <div className="relative">
            <div className="pointer-events-none absolute -top-16 -right-6 h-64 w-64 rounded-full bg-[color:var(--bg-3)] blur-3xl opacity-70" />
            <div className="pointer-events-none absolute bottom-6 left-16 h-52 w-52 rounded-full bg-[color:var(--surface-muted)] blur-3xl opacity-60" />

            <div className="rounded-[2.5rem] bg-[color:var(--surface)]/90 border border-[color:var(--border)] shadow-[0_30px_80px_var(--shadow)] p-8 md:p-10 backdrop-blur">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--text-soft)] mb-2">유저 레시피 허브</p>
                        <h2 className="text-2xl md:text-3xl font-semibold text-[color:var(--text)]">유저 레시피 목록</h2>
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

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recipeCards.map((card) => (
                        <button
                            type="button"
                            key={card.id}
                            onClick={() => navigate('/mainboard/recipe-report')}
                            className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_12px_30px_var(--shadow)] overflow-hidden"
                        >
                            <div className="h-32 bg-[color:var(--surface-muted)] flex items-center justify-center text-sm text-[color:var(--text-soft)]">
                                사진
                            </div>
                            <div className="bg-[color:var(--accent)] text-[color:var(--accent-contrast)] text-center text-sm font-semibold py-2">
                                {card.name}
                            </div>
                        </button>
                    ))}
                </div>

            </div>
        </div>
    );
};

export default UserBoard;
