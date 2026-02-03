import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../axiosConfig';

const UserBoard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const rawName = user?.userName || localStorage.getItem('userName') || '게스트';
    const maskedName = rawName.length <= 1 ? '*' : `${rawName.slice(0, -1)}*`;

    const [recipes, setRecipes] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchRecipes = async () => {
            try {
                setLoading(true);
                const res = await axiosInstance.get('/api/recipes/me');
                setRecipes(res.data || []);
            } catch (err) {
                console.error('사용자 레시피를 불러오지 못했습니다', err);
                setError('내 레시피 목록을 불러오지 못했습니다.');
            } finally {
                setLoading(false);
            }
        };

        fetchRecipes();
    }, []);

    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filteredRecipes = normalizedSearch
        ? recipes.filter((recipe) => (recipe.title || '').toLowerCase().includes(normalizedSearch))
        : recipes;

    return (
        <div className="relative">
            <div className="pointer-events-none absolute -top-16 -right-6 h-64 w-64 rounded-full bg-[color:var(--bg-3)] blur-3xl opacity-70" />
            <div className="pointer-events-none absolute bottom-6 left-16 h-52 w-52 rounded-full bg-[color:var(--surface-muted)] blur-3xl opacity-60" />

            <div className="rounded-[2.5rem] bg-[color:var(--surface)]/90 border border-[color:var(--border)] shadow-[0_30px_80px_var(--shadow)] p-8 md:p-10 backdrop-blur">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--text-soft)] mb-2">유저 레시피 허브</p>
                        <h2 className="text-2xl md:text-3xl font-semibold text-[color:var(--text)]">나의 레시피</h2>
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

                <div className="mt-6">
                    <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--text-soft)] mb-2">
                        제목 검색
                    </label>
                    <div className="flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 shadow-[0_10px_25px_var(--shadow)]">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="제목으로 레시피를 검색합니다"
                            className="w-full bg-transparent text-sm text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="text-xs font-semibold text-[color:var(--text-soft)] hover:text-[color:var(--text)] transition"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                <div className="mt-8">
                    {loading && <span className="text-sm text-[color:var(--text-muted)]">레시피를 불러오는 중입니다.</span>}
                </div>

                {error && (
                    <div className="mt-4 text-sm text-[color:var(--danger)]">{error}</div>
                )}

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredRecipes.map((recipe) => (
                        <button
                            type="button"
                            key={recipe.id}
                            onClick={() => navigate(`/mainboard/recipes/${recipe.id}`)}
                            className="relative rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_12px_30px_var(--shadow)] overflow-hidden text-left"
                        >
                            <div className="absolute top-2 right-2 text-xs">
                                {recipe.openYn === 'Y' ? '🔓' : '🔒'}
                            </div>
                            <div className="h-32 bg-[color:var(--surface-muted)] flex items-center justify-center text-sm text-[color:var(--text-soft)] overflow-hidden">
                                {recipe.imageBase64 ? (
                                    <img src={recipe.imageBase64} alt={recipe.title} className="h-full w-full object-cover" />
                                ) : (
                                    '이미지 영역'
                                )}
                            </div>
                            <div className="bg-[color:var(--accent)] text-[color:var(--accent-contrast)] text-center text-sm font-semibold py-2">
                                {recipe.title}
                            </div>
                        </button>
                    ))}
                </div>

                {!loading && recipes.length === 0 && (
                    <p className="mt-6 text-sm text-[color:var(--text-muted)]">등록된 레시피가 없습니다.</p>
                )}

                {!loading && recipes.length > 0 && filteredRecipes.length === 0 && (
                    <p className="mt-6 text-sm text-[color:var(--text-muted)]">일치하는 레시피가 없습니다.</p>
                )}
            </div>
        </div>
    );
};

export default UserBoard;
