import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

const RecipeReport = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams();
    const rawName = user?.userName || localStorage.getItem('userName') || '게스트';
    const maskedName = rawName.length <= 1 ? '*' : `${rawName.slice(0, -1)}*`;
    const userId = user?.userId || localStorage.getItem('userId') || null;

    const [recipe, setRecipe] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);

    React.useEffect(() => {
        const fetchRecipe = async () => {
            try {
                setLoading(true);
                const res = await axiosInstance.get(`/api/recipes/${id}`);
                setRecipe(res.data);
            } catch (err) {
                console.error('Failed to fetch recipe', err);
                setError('레시피 정보를 불러오지 못했습니다.');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchRecipe();
        }
    }, [id]);

    const reportInput = useMemo(() => {
        if (!recipe) {
            return null;
        }
        const ingredientsText = (recipe.ingredients || []).join(', ');
        const stepsText = (recipe.steps || []).join('\n');
        return {
            recipe: `${recipe.title}\n${recipe.description || ''}\n재료: ${ingredientsText}\n조리 단계:\n${stepsText}`,
            targetCountry: '미국',
            targetPersona: '20~30대 직장인, 간편식 선호',
            priceRange: 'USD 6~9',
        };
    }, [recipe]);

<<<<<<< HEAD
    const getCachedInfluencers = (recipeId) => {
        const cached =
            sessionStorage.getItem(`recipeInfluencers:${recipeId}`) ||
            localStorage.getItem(`recipeInfluencers:${recipeId}`);
=======
    const influencerMetaKey = (recipeId) => `recipeInfluencerMeta:${recipeId}`;
    const getCachedInfluencers = (currentRecipe) => {
        if (Array.isArray(currentRecipe?.influencers) && currentRecipe.influencers.length) {
            return currentRecipe.influencers;
        }
        const cachedMeta =
            sessionStorage.getItem(influencerMetaKey(currentRecipe?.id)) ||
            localStorage.getItem(influencerMetaKey(currentRecipe?.id));
        if (cachedMeta) {
            try {
                const meta = JSON.parse(cachedMeta);
                if (
                    meta.title !== (currentRecipe?.title ?? '') ||
                    meta.summary !== (currentRecipe?.summary ?? '')
                ) {
                    sessionStorage.removeItem(`recipeInfluencers:${currentRecipe?.id}`);
                    sessionStorage.removeItem(`recipeInfluencerImage:${currentRecipe?.id}`);
                    sessionStorage.removeItem(influencerMetaKey(currentRecipe?.id));
                    localStorage.removeItem(`recipeInfluencers:${currentRecipe?.id}`);
                    localStorage.removeItem(`recipeInfluencerImage:${currentRecipe?.id}`);
                    localStorage.removeItem(influencerMetaKey(currentRecipe?.id));
                    return [];
                }
            } catch (err) {
                // ignore meta parse errors
            }
        }
        const cached =
            sessionStorage.getItem(`recipeInfluencers:${currentRecipe?.id}`) ||
            localStorage.getItem(`recipeInfluencers:${currentRecipe?.id}`);
>>>>>>> upstream/UI3
        if (!cached) {
            return [];
        }
        try {
            const parsed = JSON.parse(cached);
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            return [];
        }
    };

<<<<<<< HEAD
    const getCachedInfluencerImage = (recipeId) =>
        sessionStorage.getItem(`recipeInfluencerImage:${recipeId}`) ||
        localStorage.getItem(`recipeInfluencerImage:${recipeId}`) ||
=======
    const getCachedInfluencerImage = (currentRecipe) =>
        currentRecipe?.influencerImageBase64 ||
        sessionStorage.getItem(`recipeInfluencerImage:${currentRecipe?.id}`) ||
        localStorage.getItem(`recipeInfluencerImage:${currentRecipe?.id}`) ||
>>>>>>> upstream/UI3
        '';


    const handleDelete = async () => {
        if (!recipe || deleteLoading) {
            return;
        }
        const confirmDelete = window.confirm('레시피를 삭제할까요? 삭제 후 복구할 수 없습니다.');
        if (!confirmDelete) {
            return;
        }
        setDeleteLoading(true);
        try {
            await axiosInstance.delete(`/api/recipes/${recipe.id}`);
            navigate('/mainboard');
        } catch (err) {
            console.error('Failed to delete recipe', err);
            setError('레시피 삭제에 실패했습니다.');
        } finally {
            setDeleteLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="rounded-[2.5rem] bg-[color:var(--surface)]/90 border border-[color:var(--border)] shadow-[0_30px_80px_var(--shadow)] p-10 backdrop-blur">
                <p className="text-[color:var(--text-muted)]">레시피 정보를 불러오는 중입니다...</p>
            </div>
        );
    }

    if (error || !recipe) {
        return (
            <div className="rounded-[2.5rem] bg-[color:var(--surface)]/90 border border-[color:var(--border)] shadow-[0_30px_80px_var(--shadow)] p-10 backdrop-blur">
                <p className="text-[color:var(--danger)]">{error || '레시피 정보를 찾을 수 없습니다.'}</p>
            </div>
        );
    }

    const isOwner =
        (userId && recipe.authorId === userId) ||
        (!userId && recipe.authorName && recipe.authorName === rawName);

    return (
        <div className="relative">
            <div className="pointer-events-none absolute -top-16 -right-6 h-64 w-64 rounded-full bg-[color:var(--bg-3)] blur-3xl opacity-70" />
            <div className="pointer-events-none absolute bottom-6 left-16 h-52 w-52 rounded-full bg-[color:var(--surface-muted)] blur-3xl opacity-60" />

            <div className="rounded-[2.5rem] bg-[color:var(--surface)]/90 border border-[color:var(--border)] shadow-[0_30px_80px_var(--shadow)] p-8 md:p-10 backdrop-blur">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--text-soft)] mb-2">레시피 상세</p>
                        <h2 className="text-2xl md:text-3xl font-semibold text-[color:var(--text)]">{recipe.title}</h2>
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
                            <h3 className="text-lg font-semibold text-[color:var(--text)]">레시피 정보</h3>
                        </div>
                        <div className="relative h-[200px] rounded-2xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] overflow-hidden flex items-center justify-center text-[color:var(--text-soft)] text-sm">
                            {recipe.imageBase64 ? (
                                <img src={recipe.imageBase64} alt="recipe" className="h-full w-full object-cover" />
                            ) : (
                                '레시피 이미지 영역'
                            )}
                        </div>

                        <div className="mt-6 space-y-4 text-sm text-[color:var(--text)]">
                            <div>
                                <p className="font-semibold text-[color:var(--text)]">설명</p>
                                <p className="text-[color:var(--text-muted)] mt-1">{recipe.description || '설명이 없습니다.'}</p>
                            </div>
                            <div>
                                <p className="font-semibold text-[color:var(--text)]">재료</p>
                                {recipe.ingredients?.length ? (
                                    <ul className="mt-2 space-y-2 text-sm text-[color:var(--text)]">
                                        {recipe.ingredients.map((item, idx) => (
                                            <li key={`${idx}-${item}`} className="flex items-center justify-between">
                                                <span>{item}</span>
                                                <span className="text-[color:var(--text-soft)]">-</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-[color:var(--text-muted)] mt-1">등록된 재료가 없습니다.</p>
                                )}
                            </div>
                            <div>
                                <p className="font-semibold text-[color:var(--text)]">조리 단계</p>
                                {recipe.steps?.length ? (
                                    <ol className="mt-2 space-y-2 list-decimal list-inside text-[color:var(--text)]">
                                        {recipe.steps.map((step, idx) => (
                                            <li key={`${idx}-${step}`}>{step}</li>
                                        ))}
                                    </ol>
                                ) : (
                                    <p className="text-[color:var(--text-muted)] mt-1">등록된 조리 단계가 없습니다.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_12px_30px_var(--shadow)] p-6 space-y-4">
                        <div className="flex items-start justify-between">
                            <h3 className="text-lg font-semibold text-[color:var(--text)]">레시피 요약</h3>
                        </div>

                        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
                            <p className="text-sm font-semibold text-[color:var(--text)] mb-2">요약</p>
                            <p className="text-sm text-[color:var(--text-muted)] whitespace-pre-line">
                                {recipe.summary || '요약 결과가 없습니다.'}
                            </p>
                        </div>

                        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4 space-y-3">
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (recipe?.id) {
                                            navigate(`/mainboard/recipes/${recipe.id}/report`, {
                                                state: {
<<<<<<< HEAD
                                                    reportInput,
                                                    influencers: getCachedInfluencers(recipe.id),
                                                    influencerImageBase64: getCachedInfluencerImage(recipe.id),
=======
                                                    fromReview: false,
                                                    reportInput,
                                                    influencers: getCachedInfluencers(recipe),
                                                    influencerImageBase64: getCachedInfluencerImage(recipe),
>>>>>>> upstream/UI3
                                                },
                                            });
                                        }
                                    }}
                                    className="flex-1 py-2 rounded-lg bg-[color:var(--accent)] text-[color:var(--accent-contrast)] text-sm font-semibold hover:bg-[color:var(--accent-strong)] transition"
                                >
                                    리포트 보기
                                </button>
                                {isOwner && (
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/mainboard/recipes/${recipe.id}/edit`, { state: { recipe } })}
                                        className="flex-1 py-2 rounded-lg border border-[color:var(--border)] text-sm text-[color:var(--text)] hover:bg-[color:var(--surface-muted)] transition"
                                    >
                                        수정하기
                                    </button>
                                )}
                            </div>
                            {isOwner && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={deleteLoading}
                                    className="w-full py-2 rounded-lg border border-[color:var(--danger)] text-[color:var(--danger)] text-sm font-semibold hover:bg-[color:var(--danger-bg)] transition disabled:opacity-60"
                                >
                                    {deleteLoading ? '삭제 중...' : '삭제하기'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecipeReport;
