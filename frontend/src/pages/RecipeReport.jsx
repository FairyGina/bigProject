import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

const TARGET_COUNTRY_OPTIONS = [
    { value: 'US', label: '미국' },
    { value: 'KR', label: '한국' },
    { value: 'JP', label: '일본' },
    { value: 'CN', label: '중국' },
    { value: 'UK', label: '영국' },
    { value: 'FR', label: '프랑스' },
    { value: 'DE', label: '독일' },
    { value: 'CA', label: '캐나다' },
    { value: 'AU', label: '호주' },
    { value: 'IN', label: '인도' },
];

const TARGET_PERSONA_OPTIONS = [
    '20~30대 직장인, 간편식 선호',
    '30~40대 가족 중심',
    '20~30대 건강식 관심',
    '40~50대 전통식 선호',
];

const PRICE_RANGE_OPTIONS = ['USD 6~9', 'USD 10~15', 'USD 15~20', 'USD 20+'];

const REPORT_SECTION_OPTIONS = [
    { key: 'executiveSummary', label: '핵심 요약', required: true },
    { key: 'marketSnapshot', label: '시장 스냅샷', required: true },
    { key: 'riskAssessment', label: '리스크 & 대응', required: true },
    { key: 'swot', label: 'SWOT' },
    { key: 'conceptIdeas', label: '컨셉 아이디어', required: true },
    { key: 'kpis', label: 'KPI 제안' },
    { key: 'nextSteps', label: '다음 단계' },
    { key: 'summary', label: '요약본', required: true },
    { key: 'allergenNote', label: '알레르기 성분 노트' },
    { key: 'influencer', label: '인플루언서 추천' },
    { key: 'influencerImage', label: '인플루언서 이미지' },
    { key: 'globalMarketMap', label: 'Global Market Map' },
];

const GENERATION_OPTIONS = [
    { value: 'recipe_report', label: '리포트/요약', includeReport: true },
    { value: 'recipe_report_map', label: '리포트/요약+지도 평가 점수', includeReport: true },
    { value: 'recipe_report_influencer', label: '리포트/요약+인플루언서 추천', includeReport: true },
    { value: 'recipe_report_influencer_map', label: '리포트/요약+인플루언서 추천+지도 평가 점수', includeReport: true },
    { value: 'recipe_report_influencer_image', label: '리포트/요약+인플루언서 추천+이미지 생성', includeReport: true },
    { value: 'recipe_report_influencer_image_map', label: '리포트/요약+인플루언서 추천+이미지 생성+지도 평가 점수', includeReport: true },
];

const REPORT_PRESETS = {
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

const RecipeReport = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams();
    const rawName = user?.userName || localStorage.getItem('userName') || '게스트';
    const maskedName = rawName.length <= 1 ? '*' : `${rawName.slice(0, -1)}*`;
    const userId = user?.userId || localStorage.getItem('userId') || null;

    const [recipe, setRecipe] = useState(null);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [listLoading, setListLoading] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [targetCountry, setTargetCountry] = useState(TARGET_COUNTRY_OPTIONS[0].value);
    const [targetPersona, setTargetPersona] = useState(TARGET_PERSONA_OPTIONS[0]);
    const [priceRange, setPriceRange] = useState(PRICE_RANGE_OPTIONS[0]);
    const [generationOption, setGenerationOption] = useState('recipe_report');
    const [reportSections, setReportSections] = useState(() => REPORT_PRESETS.recipe_report);
    const [reportOpenYn, setReportOpenYn] = useState('N');
    const [recipeOpenYn, setRecipeOpenYn] = useState('N');
    const [targetRecommendLoading, setTargetRecommendLoading] = useState(false);

    const selectedGeneration = useMemo(
        () => GENERATION_OPTIONS.find((option) => option.value === generationOption),
        [generationOption]
    );
    const includesReport = Boolean(selectedGeneration?.includeReport);

    const isOwner =
        (userId && (recipe?.user_id === userId || recipe?.userId === userId)) ||
        (!userId && (recipe?.user_name === rawName || recipe?.userName === rawName));

    const canRecommendTargets = useMemo(() => {
        if (!recipe) return false;
        const hasTitle = Boolean(recipe.title && recipe.title.trim());
        const hasDesc = Boolean(recipe.description && recipe.description.trim());
        const hasIngredients = Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0;
        const hasSteps = Array.isArray(recipe.steps) && recipe.steps.length > 0;
        return hasTitle && hasDesc && hasIngredients && hasSteps;
    }, [recipe]);

    const loadRecipe = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const res = await axiosInstance.get(`/api/recipes/${id}`);
            setRecipe(res.data || null);
            setRecipeOpenYn(res.data?.openYn || 'N');
        } catch (err) {
            console.error('레시피를 불러오지 못했습니다.', err);
            setError('레시피 정보를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const loadReports = async () => {
        if (!id) return;
        try {
            setListLoading(true);
            const res = await axiosInstance.get(`/api/recipes/${id}/reports`);
            setReports(res.data || []);
        } catch (err) {
            console.error('보고서 목록을 불러오지 못했습니다.', err);
            setError('리포트 목록을 불러오지 못했습니다.');
        } finally {
            setListLoading(false);
        }
    };

    useEffect(() => {
        loadRecipe();
        loadReports();
    }, [id]);

    useEffect(() => {
        if (!reportSections.includes('influencer') && reportSections.includes('influencerImage')) {
            setReportSections((prev) => prev.filter((key) => key !== 'influencerImage'));
        }
    }, [reportSections]);

    const handleGenerationOptionChange = (value) => {
        setGenerationOption(value);
        setReportSections(REPORT_PRESETS[value] || []);
    };

    const toggleSection = (key) => {
        const isRequired = REPORT_SECTION_OPTIONS.find((item) => item.key === key)?.required;
        if (isRequired) return;
        if (key === 'influencerImage' && !reportSections.includes('influencer')) {
            return;
        }
        setReportSections((prev) =>
            prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
        );
    };

    const handleCreateReport = async () => {
        if (!id || createLoading) return;
        if (!includesReport) {
            setError('리포트 생성 옵션을 먼저 선택해주세요.');
            return;
        }
        setCreateLoading(true);
        setError('');
        try {
            const payload = {
                targetCountry,
                targetPersona,
                priceRange,
                reportSections,
                openYn: reportOpenYn,
            };
            const res = await axiosInstance.post(`/api/recipes/${id}/reports`, payload);
            if (res.data?.reportId) {
                if (res.data?.recipeOpenYn) {
                    setRecipeOpenYn(res.data.recipeOpenYn);
                }
                await loadReports();
                const nextReportId = res.data.reportId;
                const needsInfluencer =
                    reportSections.includes('influencer') || reportSections.includes('influencerImage');
                if (needsInfluencer) {
                    const recRes = await axiosInstance.post('/api/influencers/recommend', {
                        recipe: recipe?.title || '',
                        targetCountry,
                        targetPersona,
                        priceRange,
                    });
                    const recs = recRes.data?.recommendations ?? [];
                    const trimmedRecs = recs.slice(0, 3);
                    let imageBase64 = '';
                    if (reportSections.includes('influencerImage') && trimmedRecs.length) {
                        const top =
                            trimmedRecs.find((item) => item?.name && item?.imageUrl) ||
                            trimmedRecs.find((item) => item?.name);
                        if (top?.name) {
                            const imageRes = await axiosInstance.post('/api/images/generate', {
                                recipe: recipe?.title || '',
                                influencerName: top.name,
                                influencerImageUrl: top.imageUrl || '',
                                additionalStyle: 'clean studio, natural lighting',
                            });
                            imageBase64 = imageRes.data?.imageBase64 || '';
                        }
                    }
                    await axiosInstance.put(`/api/reports/${nextReportId}/influencers`, {
                        influencers: trimmedRecs,
                        influencerImageBase64: imageBase64,
                    });
                }
                setCreateOpen(false);
                navigate(`/mainboard/reports/${nextReportId}`);
            }
        } catch (err) {
            console.error('보고서 생성에 실패했습니다.', err);
            setError('리포트 생성에 실패했습니다.');
        } finally {
            setCreateLoading(false);
        }
    };

    const handleRecommendTargets = async () => {
        if (!canRecommendTargets || targetRecommendLoading) return;
        setTargetRecommendLoading(true);
        setError('');
        try {
            await axiosInstance.get('/api/csrf');
            const res = await axiosInstance.post('/api/recipes/recommend-targets', {
                title: recipe?.title || '',
                description: recipe?.description || '',
                ingredients: recipe?.ingredients || [],
                steps: recipe?.steps || [],
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
            console.error('추천 대상 생성에 실패했습니다.', err);
            setError('타겟 추천에 실패했습니다.');
        } finally {
            setTargetRecommendLoading(false);
        }
    };

    const handleRecipeOpenYnToggle = async () => {
        if (!id) return;
        const next = recipeOpenYn === 'Y' ? 'N' : 'Y';
        try {
            const res = await axiosInstance.put(`/api/recipes/${id}/visibility`, { openYn: next });
            setRecipeOpenYn(res.data?.openYn || next);
        } catch (err) {
            console.error('레시피 공개 여부 변경에 실패했습니다.', err);
            setError('레시피 공개 여부 변경에 실패했습니다.');
        }
    };

    const handleReportOpenYnToggle = async (reportId, current) => {
        if (!reportId) return;
        const next = current === 'Y' ? 'N' : 'Y';
        try {
            const res = await axiosInstance.put(`/api/reports/${reportId}/visibility`, { openYn: next });
            const nextOpenYn = res.data?.reportOpenYn || next;
            setReports((prev) =>
                prev.map((item) => (item.id === reportId ? { ...item, openYn: nextOpenYn } : item))
            );
            if (res.data?.recipeOpenYn) {
                setRecipeOpenYn(res.data.recipeOpenYn);
            }
        } catch (err) {
            console.error('보고서 공개 여부 변경에 실패했습니다.', err);
            setError('리포트 공개 여부 변경에 실패했습니다.');
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

    return (
        <div className="relative">
            <div className="pointer-events-none absolute -top-16 -right-6 h-64 w-64 rounded-full bg-[color:var(--bg-3)] blur-3xl opacity-70" />
            <div className="pointer-events-none absolute bottom-6 left-16 h-52 w-52 rounded-full bg-[color:var(--surface-muted)] blur-3xl opacity-60" />

            <div className="rounded-[2.5rem] bg-[color:var(--surface)]/90 border border-[color:var(--border)] shadow-[0_30px_80px_var(--shadow)] p-8 md:p-10 backdrop-blur">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--text-soft)] mb-2">Recipe Detail</p>
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

                {error && (
                    <div className="mt-4 text-sm text-[color:var(--danger)]">{error}</div>
                )}

                <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
                    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_12px_30px_var(--shadow)] p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-[color:var(--text)]">레시피 정보</h3>
                            {isOwner && (
                                <button
                                    type="button"
                                    onClick={handleRecipeOpenYnToggle}
                                    className="text-xs font-semibold text-[color:var(--accent)]"
                                >
                                    {recipeOpenYn === 'Y' ? '🔓 공개' : '🔒 비공개'}
                                </button>
                            )}
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
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-[color:var(--text)]">레시피 보고서</h3>
                            {isOwner && (
                                <button
                                    type="button"
                                    onClick={() => setCreateOpen((prev) => !prev)}
                                    className="h-8 w-8 rounded-full border border-[color:var(--border)] text-[color:var(--text)] flex items-center justify-center"
                                >
                                    +
                                </button>
                            )}
                        </div>

                        {listLoading && (
                            <p className="text-sm text-[color:var(--text-muted)]">리포트 목록을 불러오는 중입니다...</p>
                        )}

                        {!listLoading && reports.length === 0 && (
                            <p className="text-sm text-[color:var(--text-muted)]">등록된 리포트가 없습니다.</p>
                        )}

                        <div className="space-y-3">
                            {reports.map((report) => (
                                <div
                                    key={report.id}
                                    className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4 flex items-center justify-between"
                                >
                                    <div>
                                        <p className="text-sm font-semibold text-[color:var(--text)]">리포트 #{report.id}</p>
                                        <p className="text-xs text-[color:var(--text-muted)]">{report.summary || '요약 없음'}</p>
                                        <p className="text-xs text-[color:var(--text-soft)]">{new Date(report.createdAt).toLocaleString()}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isOwner && (
                                            <button
                                                type="button"
                                                onClick={() => handleReportOpenYnToggle(report.id, report.openYn)}
                                                className="text-xs font-semibold text-[color:var(--accent)]"
                                            >
                                                {report.openYn === 'Y' ? '🔓 공개' : '🔒 비공개'}
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/mainboard/reports/${report.id}`)}
                                            className="px-3 py-1 rounded-lg bg-[color:var(--accent)] text-[color:var(--accent-contrast)] text-xs font-semibold"
                                        >
                                            보기
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {createOpen && isOwner && (
                            <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 space-y-4">

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold text-[color:var(--text)]">리포트 타겟 설정</p>
                                        <button
                                            type="button"
                                            disabled={!canRecommendTargets || targetRecommendLoading}
                                            onClick={handleRecommendTargets}
                                            className="px-3 py-1 rounded-lg border border-[color:var(--border)] text-xs text-[color:var(--text)] disabled:opacity-50"
                                        >
                                            {targetRecommendLoading ? '추천 중...' : 'AI 추천'}
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-[color:var(--text-soft)]">국가</label>
                                        <select
                                            value={targetCountry}
                                            onChange={(e) => setTargetCountry(e.target.value)}
                                            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm"
                                        >
                                            {TARGET_COUNTRY_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-[color:var(--text-soft)]">페르소나</label>
                                        <select
                                            value={targetPersona}
                                            onChange={(e) => setTargetPersona(e.target.value)}
                                            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm"
                                        >
                                            {TARGET_PERSONA_OPTIONS.map((option) => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-[color:var(--text-soft)]">가격대</label>
                                        <select
                                            value={priceRange}
                                            onChange={(e) => setPriceRange(e.target.value)}
                                            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm"
                                        >
                                            {PRICE_RANGE_OPTIONS.map((option) => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs text-[color:var(--text-soft)]">생성 옵션</label>
                                    <select
                                        value={generationOption}
                                        onChange={(e) => handleGenerationOptionChange(e.target.value)}
                                        className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm"
                                    >
                                        {GENERATION_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold text-[color:var(--text)]">리포트 생성 항목</p>
                                        <span className="text-xs text-[color:var(--text-soft)]">필수 항목은 해제할 수 없습니다.</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {REPORT_SECTION_OPTIONS.map((item) => {
                                            const checked = reportSections.includes(item.key);
                                            const isRequired = item.required;
                                            const disabled = isRequired || (item.key === 'influencerImage' && !reportSections.includes('influencer'));
                                            return (
                                                <label key={item.key} className="flex items-center gap-2 text-xs text-[color:var(--text)]">
                                                    <input
                                                        type="checkbox"
                                                        className="h-3 w-3"
                                                        checked={checked}
                                                        disabled={disabled}
                                                        onChange={() => toggleSection(item.key)}
                                                    />
                                                    <span>{item.label}{isRequired ? ' (필수)' : ''}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-[color:var(--text)]">리포트 공개 여부</p>
                                    <button
                                        type="button"
                                        onClick={() => setReportOpenYn((prev) => (prev === 'Y' ? 'N' : 'Y'))}
                                        className="text-xs font-semibold text-[color:var(--accent)]"
                                    >
                                        {reportOpenYn === 'Y' ? '🔓 공개' : '🔒 비공개'}
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleCreateReport}
                                    disabled={createLoading}
                                    className="w-full py-2 rounded-xl bg-[color:var(--accent)] text-[color:var(--accent-contrast)] text-sm font-semibold hover:bg-[color:var(--accent-strong)] transition disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {createLoading ? '생성 중...' : '보고서 생성'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecipeReport;