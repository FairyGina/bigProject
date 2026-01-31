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
    ingredientAutoAdd: '자동 추가',
    ingredientAutoLoading: '추출 중...',
    ingredientPlaceholder: '재료명 / 용량',
    ingredientAutoEmpty: '조리 단계를 먼저 입력해주세요.',
    ingredientAutoFail: '재료 자동 추출에 실패했습니다.',
    guideTitle: '레시피 생성 안내',
    guideBody: '생성시간은 선택사항에 따라 1~5분정도 소요됩니다.',
    createLabel: '레시피 생성',
    updateLabel: '레시피 수정',
    creatingLabel: '생성 중...',
    updatingLabel: '수정 중...',
    cancelLabel: '수정 취소',
    confirmLeave: '작성 중인 내용이 사라집니다. 이동할까요?',
    targetCountry: '미국',
    targetPersona: '20~30대 직장인, 간편식 선호',
    ingredientAutoHelpLabel: '자동 추가 안내',
    ingredientAutoHelpDesc: '입력한 조리법에서 재료를 자동으로 추출하여 추가시켜줍니다.',
    targetRecommendHelpLabel: 'AI 추천 안내',
    targetRecommendHelpDesc: '레시피 기본 정보(제목, 설명, 재료, 조리 단계)를 모두 입력한 후 입력된 것들을 바탕으로 타겟을 AI가 추천해줍니다.',
    targetSectionLabel: '리포트 타겟 설정',
    targetCountryLabel: '국가',
    targetPersonaLabel: '페르소나',
    priceRangeLabel: '가격대',
    targetRecommendLabel: 'AI 추천',
    targetRecommendLoading: '추천 중...',
    targetRecommendError: '타겟 추천에 실패했습니다.',
};

const TARGET_COUNTRY_OPTIONS = [
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

const TARGET_PERSONA_OPTIONS = [
    '20~30대 직장인, 간편식 선호',
    '30~40대 맞벌이 가정, 건강 중시',
    '10대/20대 학생, 트렌디한 맛 선호',
    '40~50대 가족, 가성비 중시',
    '해외 한식 입문자, 한국 맛 경험',
    '건강/피트니스 관심층, 고단백/저당',
];

const PRICE_RANGE_OPTIONS = [
    'USD 3~5',
    'USD 6~9',
    'USD 10~15',
    'USD 15~20',
];

const REPORT_SECTION_ORDER = [
    'executiveSummary',
    'marketSnapshot',
    'riskAssessment',
    'swot',
    'conceptIdeas',
    'kpis',
    'nextSteps',
    'summary',
    'allergenNote',
    'influencer',
    'influencerImage',
    'globalMarketMap',
];

const REPORT_SECTION_LABELS = {
    executiveSummary: '핵심 요약',
    marketSnapshot: '시장 스냅샷',
    riskAssessment: '리스크 & 대응',
    swot: 'SWOT',
    conceptIdeas: '컨셉 아이디어',
    kpis: 'KPI 제안',
    nextSteps: '다음 단계',
    summary: '요약본',
    allergenNote: '알레르기 성분 노트',
    influencer: '인플루언서 추천',
    influencerImage: '인플루언서 이미지',
    globalMarketMap: 'Global Market Map',
};

const REQUIRED_REPORT_SECTIONS = new Set([
    'executiveSummary',
    'marketSnapshot',
    'riskAssessment',
    'conceptIdeas',
    'summary',
]);

const GENERATION_OPTIONS = [
    { value: 'recipe', label: '레시피', includeReport: false },
    { value: 'recipe_report', label: '레시피+리포트/요약', includeReport: true },
    { value: 'recipe_report_map', label: '레시피+리포트/요약+지도 평가 점수', includeReport: true },
    { value: 'recipe_report_influencer', label: '레시피+리포트/요약+인플루언서 추천', includeReport: true },
    { value: 'recipe_report_influencer_map', label: '레시피+리포트/요약+인플루언서 추천+지도 평가 점수', includeReport: true },
    { value: 'recipe_report_influencer_image', label: '레시피+리포트/요약+인플루언서 추천+이미지 생성', includeReport: true },
    { value: 'recipe_report_influencer_image_map', label: '레시피+리포트/요약+인플루언서 추천+이미지 생성+지도 평가 점수', includeReport: true },
];

const REPORT_PRESETS = {
    recipe: [],
    recipe_report: [
        'executiveSummary',
        'marketSnapshot',
        'riskAssessment',
        'swot',
        'conceptIdeas',
        'kpis',
        'nextSteps',
        'summary',
        'allergenNote',
    ],
    recipe_report_map: [
        'executiveSummary',
        'marketSnapshot',
        'riskAssessment',
        'swot',
        'conceptIdeas',
        'kpis',
        'nextSteps',
        'summary',
        'allergenNote',
        'globalMarketMap',
    ],
    recipe_report_influencer: [
        'executiveSummary',
        'marketSnapshot',
        'riskAssessment',
        'swot',
        'conceptIdeas',
        'kpis',
        'nextSteps',
        'summary',
        'allergenNote',
        'influencer',
    ],
    recipe_report_influencer_map: [
        'executiveSummary',
        'marketSnapshot',
        'riskAssessment',
        'swot',
        'conceptIdeas',
        'kpis',
        'nextSteps',
        'summary',
        'allergenNote',
        'influencer',
        'globalMarketMap',
    ],
    recipe_report_influencer_image: [
        'executiveSummary',
        'marketSnapshot',
        'riskAssessment',
        'swot',
        'conceptIdeas',
        'kpis',
        'nextSteps',
        'summary',
        'allergenNote',
        'influencer',
        'influencerImage',
    ],
    recipe_report_influencer_image_map: [
        'executiveSummary',
        'marketSnapshot',
        'riskAssessment',
        'swot',
        'conceptIdeas',
        'kpis',
        'nextSteps',
        'summary',
        'allergenNote',
        'influencer',
        'influencerImage',
        'globalMarketMap',
    ],
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
    const [targetCountry, setTargetCountry] = useState(TARGET_COUNTRY_OPTIONS[0].value);
    const [targetPersona, setTargetPersona] = useState(TARGET_PERSONA_OPTIONS[0]);
    const [priceRange, setPriceRange] = useState(PRICE_RANGE_OPTIONS[1]);
    const [generationOption, setGenerationOption] = useState(GENERATION_OPTIONS[0].value);
    const [selectedReportSections, setSelectedReportSections] = useState(REPORT_PRESETS[GENERATION_OPTIONS[0].value]);
    const [targetRecommendLoading, setTargetRecommendLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [publishLoading, setPublishLoading] = useState(false);
    const [autoIngredientLoading, setAutoIngredientLoading] = useState(false);
    const [error, setError] = useState('');
    const [initializing, setInitializing] = useState(true);
    const initialSnapshotRef = useRef('');
    const shouldBlockRef = useRef(true);
    const fileInputRef = useRef(null);
    const progressTimerRef = useRef(null);

    const buildSnapshot = (data) =>
        JSON.stringify({
            title: data.title || '',
            description: data.description || '',
            ingredients: data.ingredients || [],
            steps: data.steps || [],
            imageBase64: data.imageBase64 || '',
        });

    const inferGenerationOption = (sections) => {
        if (!Array.isArray(sections) || sections.length === 0) {
            return 'recipe_only';
        }
        const hasInfluencerImage = sections.includes('influencerImage');
        const hasInfluencer = sections.includes('influencer');
        const hasMap = sections.includes('globalMarketMap');
        if (hasInfluencerImage) {
            return hasMap ? 'recipe_report_influencer_image_map' : 'recipe_report_influencer_image';
        }
        if (hasInfluencer) {
            return hasMap ? 'recipe_report_influencer_map' : 'recipe_report_influencer';
        }
        if (hasMap) {
            return 'recipe_report_map';
        }
        return 'recipe_report';
    };

    const applyReportSelectionFromRecipe = (data) => {
        const sections = Array.isArray(data?.report?._sections) ? data.report._sections : [];
        const option = inferGenerationOption(sections);
        setGenerationOption(option);
        setSelectedReportSections(sections.length ? sections : REPORT_PRESETS[option] || []);
    };

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

    const targetMetaKey = (recipeId) => `recipeTargetMeta:${recipeId}`;
    const readTargetMeta = (recipeId) => {
        const cached =
            sessionStorage.getItem(targetMetaKey(recipeId)) ||
            localStorage.getItem(targetMetaKey(recipeId));
        if (!cached) {
            return null;
        }
        try {
            return JSON.parse(cached);
        } catch (err) {
            return null;
        }
    };

    const applyTargetMeta = (meta) => {
        if (!meta) {
            setTargetCountry(TARGET_COUNTRY_OPTIONS[0].value);
            setTargetPersona(TARGET_PERSONA_OPTIONS[0]);
            setPriceRange(PRICE_RANGE_OPTIONS[1]);
            return;
        }
        if (meta.targetCountry) {
            setTargetCountry(meta.targetCountry);
        }
        if (meta.targetPersona) {
            setTargetPersona(meta.targetPersona);
        }
        if (meta.priceRange) {
            setPriceRange(meta.priceRange);
        }
    };

    useEffect(() => {
        const loadRecipe = async () => {
            if (!id) {
                return;
            }
            try {
                setInitializing(true);
                const res = await axiosInstance.get(`/api/recipes/${id}`);
                const data = res.data || {};
                applyInitialState(data);
                applyReportSelectionFromRecipe(data);
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
                applyReportSelectionFromRecipe(initialRecipe);
                applyTargetMeta(readTargetMeta(initialRecipe.id));
            } else {
                loadRecipe().then(() => {
                    applyTargetMeta(readTargetMeta(id));
                });
            }
        } else if (reviewRecipeId) {
            const fetchReviewRecipe = async () => {
                try {
                    setInitializing(true);
                    const res = await axiosInstance.get(`/api/recipes/${reviewRecipeId}`);
                    const data = res.data || {};
                    setCreatedRecipe(data);
                    applyReportSelectionFromRecipe(data);
                    applyTargetMeta(readTargetMeta(reviewRecipeId));
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
            applyTargetMeta(null);
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

    const selectedOptionMeta = useMemo(
        () => GENERATION_OPTIONS.find((option) => option.value === generationOption),
        [generationOption]
    );
    const includesReport = Boolean(selectedOptionMeta?.includeReport);
    const influencerSelected = selectedReportSections.includes('influencer');

    useEffect(() => {
        if (!influencerSelected && selectedReportSections.includes('influencerImage')) {
            setSelectedReportSections((prev) => prev.filter((key) => key !== 'influencerImage'));
        }
    }, [influencerSelected, selectedReportSections]);

    const handleGenerationOptionChange = (value) => {
        setGenerationOption(value);
        setSelectedReportSections(REPORT_PRESETS[value] || []);
    };

    const toggleReportSection = (key) => {
        if (REQUIRED_REPORT_SECTIONS.has(key)) {
            return;
        }
        if (key === 'influencerImage' && !influencerSelected) {
            return;
        }
        setSelectedReportSections((prev) => (
            prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
        ));
    };

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

    useEffect(() => {
        return () => {
            if (progressTimerRef.current) {
                clearInterval(progressTimerRef.current);
                progressTimerRef.current = null;
            }
        };
    }, []);

    const startProgress = () => {
        setProgress(5);
        if (progressTimerRef.current) {
            clearInterval(progressTimerRef.current);
        }
        progressTimerRef.current = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 90) {
                    return prev;
                }
                return prev + 1;
            });
        }, 450);
    };

    const bumpProgress = (nextValue) => {
        setProgress((prev) => Math.max(prev, nextValue));
    };

    const endProgress = (success) => {
        if (progressTimerRef.current) {
            clearInterval(progressTimerRef.current);
            progressTimerRef.current = null;
        }
        if (success) {
            setProgress(100);
            setTimeout(() => setProgress(0), 500);
            return;
        }
        setProgress(0);
    };

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

    const applyAutoIngredients = (items) => {
        const incoming = (items || []).map((v) => v.trim()).filter(Boolean);
        if (!incoming.length) {
            setError(labels.ingredientAutoFail);
            return;
        }
        setHasUserEdits(true);
        setIngredients((prev) => {
            const existing = prev.map((v) => v.trim()).filter(Boolean);
            const seen = new Set(existing.map((v) => v.toLowerCase()));
            const merged = [...existing];
            incoming.forEach((item) => {
                const key = item.toLowerCase();
                if (!seen.has(key)) {
                    seen.add(key);
                    merged.push(item);
                }
            });
            return merged.length ? merged : [''];
        });
    };

    const handleAutoAddIngredients = async () => {
        setError('');
        const stepInputs = steps.map((v) => v.trim()).filter(Boolean);
        if (!stepInputs.length) {
            setError(labels.ingredientAutoEmpty);
            return;
        }
        setAutoIngredientLoading(true);
        try {
            try {
                await axiosInstance.get('/api/csrf');
            } catch (err) {
                // ignore csrf refresh failures
            }
            const res = await axiosInstance.post('/api/ingredients/extract', {
                steps: stepInputs,
            });
            applyAutoIngredients(res.data?.ingredients || []);
        } catch (err) {
            console.error('Failed to auto extract ingredients', err);
            setError(labels.ingredientAutoFail);
        } finally {
            setAutoIngredientLoading(false);
        }
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

    const HelpTooltip = ({ label, description }) => (
        <span className="relative inline-flex items-center group align-middle">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[color:var(--border)] text-[10px] font-semibold text-[color:var(--text-muted)] bg-[color:var(--surface)]">
                ?
            </span>
            <span className="sr-only">{label}</span>
            <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-64 -translate-x-1/2 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs text-[color:var(--text)] opacity-0 shadow-[0_12px_30px_var(--shadow)] transition group-hover:opacity-100">
                {description}
            </span>
        </span>
    );

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

    const safeSessionRemove = (key) => {
        try {
            sessionStorage.removeItem(key);
        } catch (err) {
            // ignore remove errors
        }
    };

    const safeCacheRemove = (key) => {
        try {
            localStorage.removeItem(key);
        } catch (err) {
            // ignore remove errors
        }
    };

    const influencerMetaKey = (recipeId) => `recipeInfluencerMeta:${recipeId}`;

    const buildInfluencerMeta = (recipe) => ({
        id: recipe?.id ?? null,
        title: recipe?.title ?? '',
        summary: recipe?.summary ?? '',
        createdAt: recipe?.createdAt ?? '',
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
        meta.summary === (recipe?.summary ?? '') &&
        meta.createdAt === (recipe?.createdAt ?? '');

    const clearInfluencerCache = (recipeId) => {
        safeSessionRemove(`recipeInfluencers:${recipeId}`);
        safeSessionRemove(`recipeInfluencerImage:${recipeId}`);
        safeSessionRemove(influencerMetaKey(recipeId));
        safeCacheRemove(`recipeInfluencers:${recipeId}`);
        safeCacheRemove(`recipeInfluencerImage:${recipeId}`);
        safeCacheRemove(influencerMetaKey(recipeId));
    };

    const pickInfluencerForImage = (items) => {
        if (!Array.isArray(items) || items.length === 0) {
            return null;
        }
        return items.find((item) => item?.name && item?.imageUrl) || items.find((item) => item?.name) || null;
    };

    const generateInfluencerAssets = async (recipe, options) => {
        const includeInfluencer = Boolean(options?.includeInfluencer);
        const includeImage = Boolean(options?.includeImage);
        if (!includeInfluencer) {
            setCreatedInfluencers([]);
            setCreatedInfluencerImage('');
            return { influencers: [], imageBase64: '' };
        }
        const cachedInfluencers =
            sessionStorage.getItem(`recipeInfluencers:${recipe.id}`) ||
            localStorage.getItem(`recipeInfluencers:${recipe.id}`);
        const cachedImage = includeImage
            ? (sessionStorage.getItem(`recipeInfluencerImage:${recipe.id}`) ||
                localStorage.getItem(`recipeInfluencerImage:${recipe.id}`))
            : '';
        const cachedMeta = readInfluencerMeta(recipe.id);
        if (cachedMeta && !isInfluencerMetaMatch(cachedMeta, recipe)) {
            clearInfluencerCache(recipe.id);
        }
        if (cachedInfluencers && (!includeImage || cachedImage)) {
            try {
                const parsed = JSON.parse(cachedInfluencers);
                if (Array.isArray(parsed)) {
                    setCreatedInfluencers(parsed);
                    if (includeImage) {
                        setCreatedInfluencerImage(cachedImage || '');
                    } else {
                        setCreatedInfluencerImage('');
                    }
                    return { influencers: parsed, imageBase64: includeImage ? cachedImage || '' : '' };
                }
            } catch (err) {
                // ignore cache parse errors
            }
            if (includeImage) {
                setCreatedInfluencerImage(cachedImage || '');
            } else {
                setCreatedInfluencerImage('');
            }
            return { influencers: [], imageBase64: includeImage ? cachedImage || '' : '' };
        }
        try {
            const payload = {
                recipe: recipe.title,
                targetCountry,
                targetPersona,
                priceRange,
            };
            const influencerRes = await axiosInstance.post('/api/influencers/recommend', payload);
            const recs = influencerRes.data?.recommendations ?? [];
            if (!recs.length) {
                setError(labels.influencerError);
                return null;
            }
            setCreatedInfluencers(recs);
            const influencersJson = JSON.stringify(recs);
            safeSessionSet(`recipeInfluencers:${recipe.id}`, influencersJson);
            safeCacheSet(`recipeInfluencers:${recipe.id}`, influencersJson);
            const metaJson = JSON.stringify(buildInfluencerMeta(recipe));
            safeSessionSet(influencerMetaKey(recipe.id), metaJson);
            safeCacheSet(influencerMetaKey(recipe.id), metaJson);

            if (!includeImage) {
                setCreatedInfluencerImage('');
                return { influencers: recs, imageBase64: '' };
            }

            const top = pickInfluencerForImage(recs);
            if (top?.name) {
                const imageRes = await axiosInstance.post('/api/images/generate', {
                    recipe: recipe.title,
                    influencerName: top.name,
                    influencerImageUrl: top.imageUrl || '',
                    additionalStyle: 'clean studio, natural lighting',
                });
                const imageBase64 = imageRes.data?.imageBase64 || '';
                if (imageBase64) {
                    setCreatedInfluencerImage(imageBase64);
                    safeSessionSet(`recipeInfluencerImage:${recipe.id}`, imageBase64);
                    safeCacheSet(`recipeInfluencerImage:${recipe.id}`, imageBase64);
                    return { influencers: recs, imageBase64 };
                }
                setCreatedInfluencerImage('');
                setError(imageRes.data?.note || labels.influencerError);
                return { influencers: recs, imageBase64: '' };
            }
            setCreatedInfluencerImage('');
            setError(labels.influencerError);
            return { influencers: recs, imageBase64: '' };
        } catch (err) {
            console.error('Influencer generation failed', err);
            setError(labels.influencerError);
            return null;
        }
    };

    const persistInfluencerAssets = async (recipeId, includeInfluencer, includeImage, assets) => {
        if (!recipeId || (!includeInfluencer && !includeImage)) {
            return;
        }
        try {
            await axiosInstance.put(`/api/recipes/${recipeId}/influencers`, {
                influencers: includeInfluencer ? assets?.influencers || [] : [],
                influencerImageBase64: includeImage ? assets?.imageBase64 || '' : '',
            });
        } catch (err) {
            console.error('Failed to persist influencer assets', err);
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
        const shouldGenerateReport = includesReport;
        const shouldRegenerateReport = shouldGenerateReport && (isEdit ? true : shouldRegenerate);
        const payload = {
            title: title.trim(),
            description: description.trim(),
            ingredients: ingredients.map((i) => i.trim()).filter(Boolean),
            steps: steps.map((s) => s.trim()).filter(Boolean),
            imageBase64: imageBase64 || '',
            targetCountry,
            targetPersona,
            priceRange,
            draft: true,
            regenerateReport: shouldRegenerateReport,
            reportSections: shouldGenerateReport ? selectedReportSections : [],
        };
        setLoading(true);
        startProgress();
        let success = false;
        try {
            try {
                await axiosInstance.get('/api/csrf');
            } catch (err) {
                // ignore csrf refresh failures
            }
            if (shouldRegenerate && recipeId) {
                clearInfluencerCache(recipeId);
                setCreatedInfluencers([]);
                setCreatedInfluencerImage('');
            }
            const res = isUpdate
                ? await axiosInstance.put(`/api/recipes/${recipeId}`, payload)
                : await axiosInstance.post('/api/recipes', payload);
            const created = res.data;
            bumpProgress(isUpdate ? 60 : 55);
            initialSnapshotRef.current = buildSnapshot(created || payload);
            shouldBlockRef.current = false;
            sessionStorage.removeItem('recipeEditDirty');

            if (shouldRegenerateReport) {
                const runInfluencer = selectedReportSections.includes('influencer');
                const runInfluencerImage = selectedReportSections.includes('influencerImage');
                if (runInfluencer || runInfluencerImage) {
                    bumpProgress(70);
                    const assets = await generateInfluencerAssets(created, {
                        includeInfluencer: runInfluencer,
                        includeImage: runInfluencerImage,
                    });
                    if (!assets) {
                        return;
                    }
                    bumpProgress(85);
                    await persistInfluencerAssets(created.id, runInfluencer, runInfluencerImage, assets);
                }
            }

            if (isCreateFlow) {
                setCreatedRecipe(created);
                const metaJson = JSON.stringify({ targetCountry, targetPersona, priceRange });
                safeSessionSet(targetMetaKey(created.id), metaJson);
                safeCacheSet(targetMetaKey(created.id), metaJson);
                setShowReview(true);
                setError('');
                success = true;
                return;
            }

            success = true;
            if (created?.id) {
                const metaJson = JSON.stringify({ targetCountry, targetPersona, priceRange });
                safeSessionSet(targetMetaKey(created.id), metaJson);
                safeCacheSet(targetMetaKey(created.id), metaJson);
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
            endProgress(success);
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

    const handlePublishDraft = async () => {
        if (!createdRecipe?.id || publishLoading) {
            return;
        }
        setPublishLoading(true);
        try {
            try {
                await axiosInstance.get('/api/csrf');
            } catch (err) {
                // ignore csrf refresh failures
            }
            await axiosInstance.put(`/api/recipes/${createdRecipe.id}/publish`, {
                influencers: includesReport ? createdInfluencers : [],
                influencerImageBase64: includesReport ? createdInfluencerImage : '',
            });
            navigate(`/mainboard/recipes/${createdRecipe.id}`);
        } catch (err) {
            console.error('Failed to publish recipe', err);
            setError('레시피 등록 확정에 실패했습니다.');
        } finally {
            setPublishLoading(false);
        }
    };

    const isReviewMode = showReview && createdRecipe;
    const isEditingMode = Boolean(id || createdRecipe?.id);
    const sectionLabel = isEdit ? '레시피 수정' : labels.sectionLabel;
    const pageTitle = isEdit ? '등록된 레시피 수정' : labels.pageTitle;

    const canRecommendTargets = useMemo(() => {
        if (!title.trim() || !description.trim()) {
            return false;
        }
        if (!ingredients.length || !steps.length) {
            return false;
        }
        const allIngredientsFilled = ingredients.every((item) => item.trim());
        const allStepsFilled = steps.every((item) => item.trim());
        return allIngredientsFilled && allStepsFilled;
    }, [description, ingredients, steps, title]);

    const handleRecommendTargets = async () => {
        if (!canRecommendTargets || targetRecommendLoading) {
            return;
        }
        setError('');
        setTargetRecommendLoading(true);
        try {
            const res = await axiosInstance.post('/api/recipes/recommend-targets', {
                title,
                description,
                ingredients: ingredients.map((i) => i.trim()).filter(Boolean),
                steps: steps.map((s) => s.trim()).filter(Boolean),
            });
            const data = res.data || {};
            if (data.targetCountry) {
                setTargetCountry(data.targetCountry);
            }
            if (data.targetPersona) {
                setTargetPersona(data.targetPersona);
            }
            if (data.priceRange) {
                setPriceRange(data.priceRange);
            }
        } catch (err) {
            console.error('Failed to recommend targets', err);
            setError(labels.targetRecommendError);
        } finally {
            setTargetRecommendLoading(false);
        }
    };

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
                                {includesReport && (
                                    <h3 className="text-lg font-semibold text-[color:var(--text)]">레시피 요약</h3>
                                )}
                                <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4 space-y-3">
                                    {includesReport && (
                                        <div className="text-sm text-[color:var(--text-muted)] leading-7">
                                            {createdRecipe?.summary?.trim() ? (
                                                <ul className="space-y-2 list-disc list-inside">
                                                    {createdRecipe.summary
                                                        .split(/\s*-\s+/)
                                                        .map((chunk) => chunk.trim())
                                                        .filter(Boolean)
                                                        .flatMap((chunk) => chunk.split(/\n+/))
                                                        .map((item, idx) => (
                                                            <li key={`${idx}-${item.slice(0, 8)}`}>{item}</li>
                                                        ))}
                                                </ul>
                                            ) : (
                                                '요약 결과가 없습니다.'
                                            )}
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        {includesReport ? (
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
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handlePublishDraft}
                                                disabled={publishLoading}
                                                className="flex-1 py-2 rounded-lg bg-[color:var(--accent)] text-[color:var(--accent-contrast)] text-sm font-semibold hover:bg-[color:var(--accent-strong)] transition disabled:opacity-60"
                                            >
                                                {publishLoading ? '등록 중...' : '등록 확정'}
                                            </button>
                                        )}
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

                            <div className="flex flex-col gap-6">
                                <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_12px_30px_var(--shadow)] p-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-[color:var(--text)]">{labels.targetSectionLabel}</h3>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={handleRecommendTargets}
                                                disabled={!canRecommendTargets || targetRecommendLoading}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-xs text-[color:var(--text)] disabled:opacity-60"
                                            >
                                                {targetRecommendLoading ? labels.targetRecommendLoading : labels.targetRecommendLabel}
                                            </button>
                                            <HelpTooltip
                                                label={labels.targetRecommendHelpLabel}
                                                description={labels.targetRecommendHelpDesc}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-[color:var(--text-muted)] mb-2">
                                                {labels.targetCountryLabel}
                                            </label>
                                            <select
                                                value={targetCountry}
                                                onChange={(e) => {
                                                    setHasUserEdits(true);
                                                    setTargetCountry(e.target.value);
                                                }}
                                                className="w-full p-3 rounded-xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                                            >
                                                {TARGET_COUNTRY_OPTIONS.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-[color:var(--text-muted)] mb-2">
                                                {labels.targetPersonaLabel}
                                            </label>
                                            <select
                                                value={targetPersona}
                                                onChange={(e) => {
                                                    setHasUserEdits(true);
                                                    setTargetPersona(e.target.value);
                                                }}
                                                className="w-full p-3 rounded-xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                                            >
                                                {TARGET_PERSONA_OPTIONS.map((opt) => (
                                                    <option key={opt} value={opt}>
                                                        {opt}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-[color:var(--text-muted)] mb-2">
                                                {labels.priceRangeLabel}
                                            </label>
                                            <select
                                                value={priceRange}
                                                onChange={(e) => {
                                                    setHasUserEdits(true);
                                                    setPriceRange(e.target.value);
                                                }}
                                                className="w-full p-3 rounded-xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                                            >
                                                {PRICE_RANGE_OPTIONS.map((opt) => (
                                                    <option key={opt} value={opt}>
                                                        {opt}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_12px_30px_var(--shadow)] p-6 space-y-5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-[color:var(--text)]">{labels.ingredientsLabel}</h3>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={handleAutoAddIngredients}
                                                disabled={autoIngredientLoading || !steps.some((step) => step.trim())}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-xs text-[color:var(--text)] disabled:opacity-60"
                                            >
                                                {autoIngredientLoading ? labels.ingredientAutoLoading : labels.ingredientAutoAdd}
                                            </button>
                                            <HelpTooltip
                                                label={labels.ingredientAutoHelpLabel}
                                                description={labels.ingredientAutoHelpDesc}
                                            />
                                            <button
                                                type="button"
                                                onClick={addIngredient}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-xs text-[color:var(--text)]"
                                            >
                                                <Plus size={14} />
                                                {labels.ingredientAdd}
                                            </button>
                                        </div>
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
                                </div>

                                <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_12px_30px_var(--shadow)] p-6 space-y-4">
                                    <div className="space-y-2">
                                        <label className="block text-xs font-semibold text-[color:var(--text-muted)]">
                                            생성 옵션
                                        </label>
                                        <select
                                            value={generationOption}
                                            onChange={(e) => handleGenerationOptionChange(e.target.value)}
                                            disabled={loading}
                                            className="w-full p-3 rounded-xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                                        >
                                            {GENERATION_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {includesReport && (
                                        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4 space-y-3">
                                            <p className="text-sm font-semibold text-[color:var(--text)]">리포트 생성 항목</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {REPORT_SECTION_ORDER.map((key) => {
                                                    const label = REPORT_SECTION_LABELS[key];
                                                    if (!label) {
                                                        return null;
                                                    }
                                                    const isRequired = REQUIRED_REPORT_SECTIONS.has(key);
                                                    const isChecked = isRequired || selectedReportSections.includes(key);
                                                    const isDisabled = isRequired || (key === 'influencerImage' && !influencerSelected);
                                                    return (
                                                        <label
                                                            key={key}
                                                            className={`flex items-center gap-2 text-sm ${
                                                                isDisabled ? 'text-[color:var(--text-soft)]' : 'text-[color:var(--text)]'
                                                            }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                disabled={isDisabled || loading}
                                                                onChange={() => toggleReportSection(key)}
                                                                className="h-4 w-4 rounded border-[color:var(--border)]"
                                                            />
                                                            <span>{label}</span>
                                                            {isRequired && (
                                                                <span className="ml-auto text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-soft)]">
                                                                    필수
                                                                </span>
                                                            )}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                            {!influencerSelected && (
                                                <p className="text-xs text-[color:var(--text-soft)]">
                                                    인플루언서 추천을 체크해야 이미지 생성 항목을 선택할 수 있습니다.
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {!isEdit && (
                                        <div className="space-y-2 text-sm text-[color:var(--text-muted)]">
                                            <p className="font-semibold text-[color:var(--text)]">{labels.guideTitle}</p>
                                            <p>{labels.guideBody}</p>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={handleSubmit}
                                            disabled={loading}
                                            className="flex-1 py-3 rounded-xl bg-[color:var(--accent)] text-[color:var(--accent-contrast)] font-semibold hover:bg-[color:var(--accent-strong)] transition shadow-[0_10px_30px_var(--shadow)] disabled:opacity-60"
                                        >
                                            {loading ? (isEditingMode ? labels.updatingLabel : labels.creatingLabel) : isEditingMode ? labels.updateLabel : labels.createLabel}
                                        </button>
                                        <div
                                            className={`flex items-center gap-2 text-xs text-[color:var(--text-muted)] ${
                                                loading ? 'ml-2 w-[72px] opacity-100' : 'ml-0 w-0 opacity-0'
                                            } overflow-hidden pointer-events-none`}
                                        >
                                            <span className="h-4 w-4 rounded-full border-2 border-[color:var(--border)] border-t-[color:var(--accent)] animate-spin" />
                                            <span className="min-w-[4ch] text-right tabular-nums">{progress}%</span>
                                        </div>
                                    </div>
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
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserCreateRecipe;
