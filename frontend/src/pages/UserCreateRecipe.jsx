import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useBeforeUnload } from 'react-router';
import axiosInstance from '../axiosConfig';

const labels = {
    guest: '게스트',
    loadError: '레시피 정보를 불러오지 못했습니다.',
    imageTypeError: '이미지 파일은 JPG, PNG, WEBP 형식만 업로드할 수 있습니다.',
    imageReadError: '이미지 미리보기를 불러오지 못했습니다.',
    imageProcessing: '이미지를 처리하는 중입니다. 잠시만 기다려주세요.',
    titleRequired: '레시피 제목을 입력해주세요.',
    influencerError: '인플루언서 추천 또는 이미지 생성에 실패했습니다. 다시 시도해주세요.',
    createError: '레시피 생성에 실패했습니다.',
    updateError: '레시피 수정에 실패했습니다.',
    sectionLabel: '레시피 직접 등록하기',
    pageTitle: '레시피 직접 등록',
    basicInfo: '레시피 기본 정보',
    titlePlaceholder: '레시피 제목',
    descriptionPlaceholder: '레시피 소개',
    imageLabel: '레시피 이미지',
    uploadHint: '업로드 가능 형식: JPG, PNG, WEBP',
    imagePreview: '이미지 미리보기',
    imageClear: '이미지 제거',
    stepsLabel: '조리 단계',
    stepAdd: '단계 추가',
    stepPlaceholderPrefix: '단계',
    ingredientsLabel: '재료',
    ingredientAdd: '재료 추가',
    ingredientPlaceholder: '재료명 / 용량',
    guideTitle: '레시피 생성 안내',
    guideBody: '생성까지 2~3분정도 소요됩니다.',
    createLabel: '레시피 생성',
    updateLabel: '레시피 수정',
    creatingLabel: '생성 중...',
    updatingLabel: '수정 중...',
    cancelLabel: '수정 취소',
    confirmLeave: '작성 중인 내용이 사라집니다. 이동할까요?',
    targetCountry: '미국',
    targetPersona: '20~30대 직장인, 간편식 선호',
};

const UserCreateRecipe = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const rawName = user?.userName || localStorage.getItem('userName') || labels.guest;
    const maskedName = rawName.length <= 1 ? '*' : `${rawName.slice(0, -1)}*`;

    const initialRecipe = useMemo(() => location.state?.recipe || null, [location.state]);
    const reviewRecipeId = location.state?.reviewRecipeId;
    const isEdit = Boolean(id);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [ingredients, setIngredients] = useState(['']);
    const [steps, setSteps] = useState(['']);
    const [imageBase64, setImageBase64] = useState('');
    const [imagePreviewUrl, setImagePreviewUrl] = useState('');
    const [createdRecipe, setCreatedRecipe] = useState(null);
    const [createdInfluencers, setCreatedInfluencers] = useState([]);
    const [createdInfluencerImage, setCreatedInfluencerImage] = useState('');
    const [showReview, setShowReview] = useState(false);
    const [hasUserEdits, setHasUserEdits] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [initializing, setInitializing] = useState(true);
    const initialSnapshotRef = useRef('');
    const shouldBlockRef = useRef(true);
    const fileInputRef = useRef(null);

    const buildSnapshot = (data) =>
        JSON.stringify({
            title: data.title || '',
            description: data.description || '',
            ingredients: data.ingredients || [],
            steps: data.steps || [],
            imageBase64: data.imageBase64 || '',
        });

    const applyInitialState = (data) => {
        setTitle(data.title || '');
        setDescription(data.description || '');
        setIngredients(data.ingredients?.length ? data.ingredients : ['']);
        setSteps(data.steps?.length ? data.steps : ['']);
        setImageBase64(data.imageBase64 || '');
        setImagePreviewUrl(data.imageBase64 || '');
        initialSnapshotRef.current = buildSnapshot(data);
        shouldBlockRef.current = true;
        setHasUserEdits(false);
        setInitializing(false);
    };

    useEffect(() => {
        const loadRecipe = async () => {
            if (!id) {
                return;
            }
            try {
                setInitializing(true);
                const res = await axiosInstance.get(`/api/recipes/${id}`);
                applyInitialState(res.data || {});
            } catch (err) {
                console.error('Failed to load recipe', err);
                setError(labels.loadError);
                setInitializing(false);
            }
        };

        setError('');
        if (isEdit) {
            if (initialRecipe && String(initialRecipe.id) === String(id)) {
                applyInitialState(initialRecipe);
            } else {
                loadRecipe();
            }
        } else if (reviewRecipeId) {
            const fetchReviewRecipe = async () => {
                try {
                    setInitializing(true);
                    const res = await axiosInstance.get(`/api/recipes/${reviewRecipeId}`);
                    setCreatedRecipe(res.data);
                    setCreatedInfluencers(location.state?.influencers || []);
                    setCreatedInfluencerImage(location.state?.influencerImageBase64 || '');
                    setShowReview(true);
                    setInitializing(false);
                } catch (err) {
                    console.error('Failed to load review recipe', err);
                    setError(labels.loadError);
                    setShowReview(false);
                    setInitializing(false);
                    applyInitialState({});
                }
            };
            fetchReviewRecipe();
        } else {
            setCreatedRecipe(null);
            setCreatedInfluencers([]);
            setCreatedInfluencerImage('');
            setShowReview(false);
            applyInitialState({});
        }
    }, [id, initialRecipe, isEdit, reviewRecipeId, location.state]);

    const isDirty = useMemo(() => {
        if (initializing) {
            return false;
        }
        const currentSnapshot = buildSnapshot({
            title,
            description,
            ingredients,
            steps,
            imageBase64,
        });
        return currentSnapshot !== initialSnapshotRef.current;
    }, [description, imageBase64, ingredients, initializing, steps, title]);

    useEffect(() => {
        if (isDirty && hasUserEdits && shouldBlockRef.current) {
            sessionStorage.setItem('recipeEditDirty', '1');
        } else {
            sessionStorage.removeItem('recipeEditDirty');
        }
    }, [hasUserEdits, isDirty]);

    useEffect(() => {
        return () => {
            sessionStorage.removeItem('recipeEditDirty');
        };
    }, []);

    useBeforeUnload(
        React.useCallback(
            (event) => {
                if (isDirty && hasUserEdits) {
                    event.preventDefault();
                    event.returnValue = '';
                }
            },
            [hasUserEdits, isDirty]
        )
    );

    const handleIngredientChange = (idx, value) => {
        setHasUserEdits(true);
        setIngredients((prev) => prev.map((item, i) => (i === idx ? value : item)));
    };

    const handleStepChange = (idx, value) => {
        setHasUserEdits(true);
        setSteps((prev) => prev.map((item, i) => (i === idx ? value : item)));
    };

    const addIngredient = () => {
        setHasUserEdits(true);
        setIngredients((prev) => [...prev, '']);
    };
    const addStep = () => {
        setHasUserEdits(true);
        setSteps((prev) => [...prev, '']);
    };

    const removeIngredient = (idx) => {
        setHasUserEdits(true);
        setIngredients((prev) => prev.filter((_, i) => i !== idx));
    };

    const removeStep = (idx) => {
        setHasUserEdits(true);
        setSteps((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleImageChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setError(labels.imageTypeError);
            event.target.value = '';
            return;
        }
        setHasUserEdits(true);
        if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(imagePreviewUrl);
        }
        const previewUrl = URL.createObjectURL(file);
        setImagePreviewUrl(previewUrl);
        const reader = new FileReader();
        reader.onload = () => {
            setImageBase64(reader.result?.toString() || '');
        };
        reader.onerror = () => {
            setError(labels.imageReadError);
            setImageBase64('');
            setImagePreviewUrl('');
        };
        reader.readAsDataURL(file);
    };

    const clearImage = () => {
        setHasUserEdits(true);
        if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(imagePreviewUrl);
        }
        setImageBase64('');
        setImagePreviewUrl('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const safeCacheSet = (key, value) => {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (err) {
            return false;
        }
    };

    const safeSessionSet = (key, value) => {
        try {
            sessionStorage.setItem(key, value);
            return true;
        } catch (err) {
            return false;
        }
    };

    const safeCacheRemove = (key) => {
        try {
            localStorage.removeItem(key);
        } catch (err) {
            // ignore remove errors
        }
    };

    const safeSessionRemove = (key) => {
        try {
            sessionStorage.removeItem(key);
        } catch (err) {
            // ignore remove errors
        }
    };

    const influencerMetaKey = (recipeId) => `recipeInfluencerMeta:${recipeId}`;

    const buildInfluencerMeta = (recipe) => ({
        id: recipe?.id ?? null,
        title: recipe?.title ?? '',
        summary: recipe?.summary ?? '',
    });

    const readInfluencerMeta = (recipeId) => {
        const cached =
            sessionStorage.getItem(influencerMetaKey(recipeId)) ||
            localStorage.getItem(influencerMetaKey(recipeId));
        if (!cached) {
            return null;
        }
        try {
            return JSON.parse(cached);
        } catch (err) {
            return null;
        }
    };

    const isInfluencerMetaMatch = (meta, recipe) =>
        Boolean(meta) &&
        meta.title === (recipe?.title ?? '') &&
        meta.summary === (recipe?.summary ?? '');

    const clearInfluencerCache = (recipeId) => {
        safeSessionRemove(`recipeInfluencers:${recipeId}`);
        safeSessionRemove(`recipeInfluencerImage:${recipeId}`);
        safeSessionRemove(influencerMetaKey(recipeId));
        safeCacheRemove(`recipeInfluencers:${recipeId}`);
        safeCacheRemove(`recipeInfluencerImage:${recipeId}`);
        safeCacheRemove(influencerMetaKey(recipeId));
    };

    const generateInfluencerAssets = async (recipe) => {
        const cachedInfluencers =
            sessionStorage.getItem(`recipeInfluencers:${recipe.id}`) ||
            localStorage.getItem(`recipeInfluencers:${recipe.id}`);
        const cachedImage =
            sessionStorage.getItem(`recipeInfluencerImage:${recipe.id}`) ||
            localStorage.getItem(`recipeInfluencerImage:${recipe.id}`);
        const cachedMeta = readInfluencerMeta(recipe.id);
        if (cachedMeta && !isInfluencerMetaMatch(cachedMeta, recipe)) {
            clearInfluencerCache(recipe.id);
        }
        if (cachedInfluencers && cachedImage) {
            try {
                const parsed = JSON.parse(cachedInfluencers);
                if (Array.isArray(parsed)) {
                    setCreatedInfluencers(parsed);
                }
            } catch (err) {
                // ignore cache parse errors
            }
            setCreatedInfluencerImage(cachedImage);
            return true;
        }
        try {
            const payload = {
                recipe: recipe.title,
                targetCountry: labels.targetCountry,
                targetPersona: labels.targetPersona,
                priceRange: 'USD 6~9',
            };
            const influencerRes = await axiosInstance.post('/api/influencers/recommend', payload);
            const recs = influencerRes.data?.recommendations ?? [];
            if (!recs.length) {
                setError(labels.influencerError);
                return false;
            }
            setCreatedInfluencers(recs);
            const influencersJson = JSON.stringify(recs);
            safeSessionSet(`recipeInfluencers:${recipe.id}`, influencersJson);
            safeCacheSet(`recipeInfluencers:${recipe.id}`, influencersJson);
            const metaJson = JSON.stringify(buildInfluencerMeta(recipe));
            safeSessionSet(influencerMetaKey(recipe.id), metaJson);
            safeCacheSet(influencerMetaKey(recipe.id), metaJson);

            const top = recs[0];
            if (top?.name && top?.imageUrl) {
                const imageRes = await axiosInstance.post('/api/images/generate', {
                    recipe: recipe.title,
                    influencerName: top.name,
                    influencerImageUrl: top.imageUrl,
                    additionalStyle: 'clean studio, natural lighting',
                });
                if (imageRes.data?.imageBase64) {
                    setCreatedInfluencerImage(imageRes.data.imageBase64);
                    safeSessionSet(`recipeInfluencerImage:${recipe.id}`, imageRes.data.imageBase64);
                    safeCacheSet(`recipeInfluencerImage:${recipe.id}`, imageRes.data.imageBase64);
                } else {
                    setError(labels.influencerError);
                    return false;
                }
            } else {
                setError(labels.influencerError);
                return false;
            }
            return true;
        } catch (err) {
            console.error('Influencer generation failed', err);
            setError(labels.influencerError);
            return false;
        }
    };

    const handleSubmit = async () => {
        setError('');
        if (!title.trim()) {
            setError(labels.titleRequired);
            return;
        }
        if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:') && !imageBase64) {
            setError(labels.imageProcessing);
            return;
        }
        const recipeId = id || initialRecipe?.id || createdRecipe?.id;
        const isUpdate = Boolean(recipeId);
        const isCreateFlow = !id;
        const shouldRegenerate = isCreateFlow && (isDirty || !createdRecipe);
        const payload = {
            title: title.trim(),
            description: description.trim(),
            ingredients: ingredients.map((i) => i.trim()).filter(Boolean),
            steps: steps.map((s) => s.trim()).filter(Boolean),
            imageBase64: imageBase64 || '',
            targetCountry: labels.targetCountry,
            targetPersona: labels.targetPersona,
            priceRange: 'USD 6~9',
            draft: true,
            regenerateReport: shouldRegenerate,
        };
        setLoading(true);
        try {
            if (shouldRegenerate && recipeId) {
                clearInfluencerCache(recipeId);
                setCreatedInfluencers([]);
                setCreatedInfluencerImage('');
            }
            const res = isUpdate
                ? await axiosInstance.put(`/api/recipes/${recipeId}`, payload)
                : await axiosInstance.post('/api/recipes', payload);
            const created = res.data;
            initialSnapshotRef.current = buildSnapshot(created || payload);
            shouldBlockRef.current = false;
            sessionStorage.removeItem('recipeEditDirty');

            if (isCreateFlow && shouldRegenerate) {
                const influencerOk = await generateInfluencerAssets(created);
                if (!influencerOk) {
                    return;
                }
            }

            if (isCreateFlow) {
                setCreatedRecipe(created);
                setShowReview(true);
                setError('');
                return;
            }

            navigate(`/mainboard/recipes/${created.id}`);
        } catch (err) {
            console.error('Failed to create recipe', err);
            if (isUpdate) {
                setError(err.response?.data?.message || labels.updateError);
            } else {
                setError(err.response?.data?.message || labels.createError);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleReviewEdit = () => {
        if (!createdRecipe) {
            return;
        }
        setShowReview(false);
        applyInitialState(createdRecipe);
    };

    const isReviewMode = showReview && createdRecipe;
    const isEditingMode = Boolean(id || createdRecipe?.id);
    const sectionLabel = isEdit ? '레시피 수정' : labels.sectionLabel;
    const pageTitle = isEdit ? '등록된 레시피 수정' : labels.pageTitle;

    return (
        <div className="relative">
            <div className="pointer-events-none absolute -top-16 -right-6 h-64 w-64 rounded-full bg-[color:var(--bg-3)] blur-3xl opacity-70" />
            <div className="pointer-events-none absolute bottom-6 left-16 h-52 w-52 rounded-full bg-[color:var(--surface-muted)] blur-3xl opacity-60" />

            <div className="rounded-[2.5rem] bg-[color:var(--surface)]/90 border border-[color:var(--border)] shadow-[0_30px_80px_var(--shadow)] p-8 md:p-10 backdrop-blur">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--text-soft)] mb-2">{sectionLabel}</p>
                        <h2 className="text-2xl md:text-3xl font-semibold text-[color:var(--text)]">{pageTitle}</h2>
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

                {error && (
                    <div className="mt-6 p-3 rounded-xl border border-[color:var(--danger)]/40 bg-[color:var(--danger-bg)] text-sm text-[color:var(--danger)]">
                        {error}
                    </div>
                )}

                <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {isReviewMode ? (
                        <>
                            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_12px_30px_var(--shadow)] p-6 space-y-4">
                                <h3 className="text-lg font-semibold text-[color:var(--text)]">레시피 정보</h3>
                                <div className="relative h-[200px] rounded-2xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] overflow-hidden flex items-center justify-center text-[color:var(--text-soft)] text-sm">
                                    {createdRecipe?.imageBase64 ? (
                                        <img src={createdRecipe.imageBase64} alt="recipe" className="h-full w-full object-cover" />
                                    ) : (
                                        '레시피 이미지 영역'
                                    )}
                                </div>

                                <div className="space-y-4 text-sm text-[color:var(--text)]">
                                    <div>
                                        <p className="font-semibold text-[color:var(--text)]">설명</p>
                                        <p className="text-[color:var(--text-muted)] mt-1">{createdRecipe?.description || '설명이 없습니다.'}</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-[color:var(--text)]">재료</p>
                                        {createdRecipe?.ingredients?.length ? (
                                            <ul className="mt-2 space-y-2 text-sm text-[color:var(--text)]">
                                                {createdRecipe.ingredients.map((item, idx) => (
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
                                        {createdRecipe?.steps?.length ? (
                                            <ol className="mt-2 space-y-2 list-decimal list-inside text-[color:var(--text)]">
                                                {createdRecipe.steps.map((step, idx) => (
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
                                <h3 className="text-lg font-semibold text-[color:var(--text)]">레시피 요약</h3>
                                <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
                                    <p className="text-sm font-semibold text-[color:var(--text)] mb-2">요약</p>
                                    <p className="text-sm text-[color:var(--text-muted)] whitespace-pre-line">
                                        {createdRecipe?.summary || '요약 결과가 없습니다.'}
                                    </p>
                                </div>

                                <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4 space-y-3">
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                navigate(`/mainboard/recipes/${createdRecipe.id}/report`, {
                                                    state: {
                                                        fromReview: true,
                                                        influencers: createdInfluencers,
                                                        influencerImageBase64: createdInfluencerImage,
                                                    },
                                                })
                                            }
                                            className="flex-1 py-2 rounded-lg bg-[color:var(--accent)] text-[color:var(--accent-contrast)] text-sm font-semibold hover:bg-[color:var(--accent-strong)] transition"
                                        >
                                            리포트 보기
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleReviewEdit}
                                            className="flex-1 py-2 rounded-lg border border-[color:var(--border)] text-sm text-[color:var(--text)] hover:bg-[color:var(--surface-muted)] transition"
                                        >
                                            수정하기
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_12px_30px_var(--shadow)] p-6 space-y-5">
                                <div>
                                    <h3 className="text-lg font-semibold text-[color:var(--text)] mb-4">{labels.basicInfo}</h3>
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                    placeholder={labels.titlePlaceholder}
                                    value={title}
                                    onChange={(e) => {
                                        setHasUserEdits(true);
                                        setTitle(e.target.value);
                                    }}
                                    className="w-full p-3 rounded-xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                                />
                                <textarea
                                    rows="4"
                                    placeholder={labels.descriptionPlaceholder}
                                    value={description}
                                    onChange={(e) => {
                                        setHasUserEdits(true);
                                        setDescription(e.target.value);
                                    }}
                                    className="w-full p-3 rounded-xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                                />
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-semibold text-[color:var(--text-muted)] mb-3">{labels.imageLabel}</h4>
                                    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4 space-y-3">
                                        <div className="flex flex-col gap-3">
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                onChange={handleImageChange}
                                                ref={fileInputRef}
                                                className="text-sm text-[color:var(--text)]"
                                            />
                                            <p className="text-xs text-[color:var(--text-soft)]">
                                                {labels.uploadHint}
                                            </p>
                                        </div>
                                        <div className="relative h-[180px] rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] overflow-hidden flex items-center justify-center text-[color:var(--text-soft)] text-sm">
                                            {imagePreviewUrl || imageBase64 ? (
                                                <img src={imagePreviewUrl || imageBase64} alt="recipe" className="h-full w-full object-cover" />
                                            ) : (
                                                labels.imagePreview
                                            )}
                                        </div>
                                        {(imagePreviewUrl || imageBase64) && (
                                            <button
                                                type="button"
                                                onClick={clearImage}
                                                className="text-xs text-[color:var(--danger)] underline underline-offset-4"
                                            >
                                                {labels.imageClear}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-semibold text-[color:var(--text-muted)]">{labels.stepsLabel}</h4>
                                        <button
                                            type="button"
                                            onClick={addStep}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-xs text-[color:var(--text)]"
                                        >
                                            <Plus size={14} />
                                            {labels.stepAdd}
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {steps.map((step, idx) => (
                                            <div key={`step-${idx}`} className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    placeholder={`${labels.stepPlaceholderPrefix} ${idx + 1}`}
                                                    value={step}
                                                    onChange={(e) => handleStepChange(idx, e.target.value)}
                                                    className="flex-1 p-3 rounded-xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                                                />
                                                {steps.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeStep(idx)}
                                                        className="p-2 rounded-lg border border-[color:var(--border)] text-[color:var(--text-muted)] hover:text-[color:var(--danger)]"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_12px_30px_var(--shadow)] p-6 space-y-5">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-[color:var(--text)]">{labels.ingredientsLabel}</h3>
                                    <button
                                        type="button"
                                        onClick={addIngredient}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-xs text-[color:var(--text)]"
                                    >
                                        <Plus size={14} />
                                        {labels.ingredientAdd}
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {ingredients.map((item, idx) => (
                                        <div key={`ingredient-${idx}`} className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                placeholder={labels.ingredientPlaceholder}
                                                value={item}
                                                onChange={(e) => handleIngredientChange(idx, e.target.value)}
                                                className="flex-1 p-3 rounded-xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                                            />
                                            {ingredients.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeIngredient(idx)}
                                                    className="p-2 rounded-lg border border-[color:var(--border)] text-[color:var(--text-muted)] hover:text-[color:var(--danger)]"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {!isEdit && (
                                    <div className="space-y-2 text-sm text-[color:var(--text-muted)]">
                                        <p className="font-semibold text-[color:var(--text)]">{labels.guideTitle}</p>
                                        <p>{labels.guideBody}</p>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="w-full py-3 rounded-xl bg-[color:var(--accent)] text-[color:var(--accent-contrast)] font-semibold hover:bg-[color:var(--accent-strong)] transition shadow-[0_10px_30px_var(--shadow)] disabled:opacity-60"
                                >
                                    {loading ? (isEditingMode ? labels.updatingLabel : labels.creatingLabel) : isEditingMode ? labels.updateLabel : labels.createLabel}
                                </button>
                                {isEdit && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (isDirty && shouldBlockRef.current) {
                                                const confirmed = window.confirm(labels.confirmLeave);
                                                if (!confirmed) {
                                                    return;
                                                }
                                            }
                                            sessionStorage.removeItem('recipeEditDirty');
                                            navigate(`/mainboard/recipes/${id}`);
                                        }}
                                        className="w-full py-3 rounded-xl border border-[color:var(--border)] text-[color:var(--text)] font-semibold hover:bg-[color:var(--surface-muted)] transition"
                                    >
                                        {labels.cancelLabel}
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserCreateRecipe;
