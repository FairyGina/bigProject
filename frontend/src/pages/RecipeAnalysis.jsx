import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

const RecipeAnalysis = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();
    const rawName = user?.userName || localStorage.getItem('userName') || '게스트';
    const maskedName = rawName.length <= 1 ? '*' : `${rawName.slice(0, -1)}*`;
    const userId = user?.userId || localStorage.getItem('userId') || null;

    const [recipe, setRecipe] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [influencers, setInfluencers] = useState([]);
    const [imageBase64, setImageBase64] = useState('');
    const [influencerLoading, setInfluencerLoading] = useState(false);
    const [publishLoading, setPublishLoading] = useState(false);

    const influencerMetaKey = (recipeId) => `recipeInfluencerMeta:${recipeId}`;
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
    const isInfluencerMetaMatch = (meta, currentRecipe) =>
        Boolean(meta) &&
        meta.title === (currentRecipe?.title ?? '') &&
        meta.summary === (currentRecipe?.summary ?? '');

    useEffect(() => {
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

    useEffect(() => {
        const seededInfluencers = location.state?.influencers;
        const seededImage = location.state?.influencerImageBase64;
        if (Array.isArray(seededInfluencers) && seededInfluencers.length) {
            setInfluencers(seededInfluencers);
        }
        if (seededImage) {
            setImageBase64(seededImage);
        }
    }, [location.state]);

    const report = recipe?.report || null;

    useEffect(() => {
        if (Array.isArray(recipe?.influencers) && recipe.influencers.length) {
            setInfluencers(recipe.influencers);
        }
        if (recipe?.influencerImageBase64) {
            setImageBase64(recipe.influencerImageBase64);
        }
    }, [recipe]);

    useEffect(() => {
        const fetchInfluencers = async () => {
            if (!recipe) {
                return;
            }
            if (Array.isArray(recipe?.influencers) && recipe.influencers.length) {
                setInfluencers(recipe.influencers);
            }
            if (recipe?.influencerImageBase64) {
                setImageBase64(recipe.influencerImageBase64);
            }
            if ((recipe?.influencers?.length || 0) > 0 && recipe?.influencerImageBase64) {
                return;
            }
            if (influencers.length && imageBase64) {
                return;
            }
            const cachedInfluencers =
                sessionStorage.getItem(`recipeInfluencers:${recipe.id}`) ||
                localStorage.getItem(`recipeInfluencers:${recipe.id}`);
            const cachedImage =
                sessionStorage.getItem(`recipeInfluencerImage:${recipe.id}`) ||
                localStorage.getItem(`recipeInfluencerImage:${recipe.id}`);
            const cachedMeta = readInfluencerMeta(recipe.id);
            if (cachedMeta && !isInfluencerMetaMatch(cachedMeta, recipe)) {
                sessionStorage.removeItem(`recipeInfluencers:${recipe.id}`);
                sessionStorage.removeItem(`recipeInfluencerImage:${recipe.id}`);
                sessionStorage.removeItem(influencerMetaKey(recipe.id));
                localStorage.removeItem(`recipeInfluencers:${recipe.id}`);
                localStorage.removeItem(`recipeInfluencerImage:${recipe.id}`);
                localStorage.removeItem(influencerMetaKey(recipe.id));
            }
            if (cachedInfluencers) {
                try {
                    const parsed = JSON.parse(cachedInfluencers);
                    if (Array.isArray(parsed)) {
                        setInfluencers(parsed);
                    }
                } catch (e) {
                    // ignore cache parse errors
                }
            }
            if (cachedImage && !imageBase64) {
                setImageBase64(cachedImage);
            }
            if (cachedInfluencers && cachedImage) {
                return;
            }
            setInfluencerLoading(true);
            try {
                const payload = {
                    recipe: recipe.title,
                    targetCountry: '미국',
                    targetPersona: '20~30대 직장인, 간편식 선호',
                    priceRange: 'USD 6~9',
                };
                const influencerRes = await axiosInstance.post('/api/influencers/recommend', payload);
                const recs = influencerRes.data?.recommendations ?? [];
                setInfluencers(recs);
                if (recs.length) {
                    const metaJson = JSON.stringify({
                        id: recipe.id,
                        title: recipe.title,
                        summary: recipe.summary,
                    });
                    try {
                        sessionStorage.setItem(influencerMetaKey(recipe.id), metaJson);
                        sessionStorage.setItem(`recipeInfluencers:${recipe.id}`, JSON.stringify(recs));
                    } catch (err) {
                        // ignore cache errors
                    }
                    try {
                        localStorage.setItem(influencerMetaKey(recipe.id), metaJson);
                        localStorage.setItem(`recipeInfluencers:${recipe.id}`, JSON.stringify(recs));
                    } catch (err) {
                        // ignore cache errors
                    }
                }

                const top = recs[0];
                if (top?.name && top?.imageUrl) {
                    const imageRes = await axiosInstance.post('/api/images/generate', {
                        recipe: recipe.title,
                        influencerName: top.name,
                        influencerImageUrl: top.imageUrl,
                        additionalStyle: 'clean studio, natural lighting',
                    });
                    setImageBase64(imageRes.data?.imageBase64 || '');
                    if (imageRes.data?.imageBase64) {
                        try {
                            sessionStorage.setItem(`recipeInfluencerImage:${recipe.id}`, imageRes.data.imageBase64);
                        } catch (err) {
                            // ignore cache errors
                        }
                        try {
                            localStorage.setItem(`recipeInfluencerImage:${recipe.id}`, imageRes.data.imageBase64);
                        } catch (err) {
                            // ignore cache errors
                        }
                    }
                }
            } catch (err) {
                console.error('Influencer generation failed', err);
            } finally {
                setInfluencerLoading(false);
            }
        };

        fetchInfluencers();
    }, [imageBase64, influencers.length, recipe]);

    const isOwner =
        (userId && recipe?.authorId === userId) ||
        (!userId && recipe?.authorName && recipe.authorName === rawName);

    const handlePublish = async () => {
        if (!recipe || recipe.status !== 'DRAFT') {
            return;
        }
        setPublishLoading(true);
        try {
            const res = await axiosInstance.put(`/api/recipes/${recipe.id}/publish`, {
                influencers,
                influencerImageBase64: imageBase64,
            });
            setRecipe(res.data);
            navigate(`/mainboard/recipes/${recipe.id}`);
        } catch (err) {
            console.error('Failed to publish recipe', err);
            setError('레시피 등록 확정에 실패했습니다.');
        } finally {
            setPublishLoading(false);
        }
    };

    const exec = report?.executiveSummary || {};
    const market = report?.marketSnapshot || {};
    const personaNeeds = market?.personaNeeds || {};
    const trendSignals = market?.trendSignals || {};
    const competition = market?.competition || {};
    const risk = report?.riskAssessment || {};
    const swot = report?.swot || {};
    const conceptIdeas = Array.isArray(report?.conceptIdeas) ? report.conceptIdeas : [];
    const kpis = Array.isArray(report?.kpis) ? report.kpis : [];
    const nextSteps = Array.isArray(report?.nextSteps) ? report.nextSteps : [];

    const escapeHtml = (value) =>
        String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

    const listHtml = (items) => {
        if (!items || items.length === 0) {
            return '<p class="muted">내용이 없습니다.</p>';
        }
        return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
    };

    const buildPrintableHtml = () => {
        return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(recipe?.title)} 리포트</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: "Pretendard","Noto Sans KR",Arial,sans-serif; margin: 32px; color: #1f2937; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    h2 { font-size: 18px; margin: 24px 0 8px; }
    h3 { font-size: 15px; margin: 16px 0 6px; }
    p { margin: 6px 0; line-height: 1.5; }
    ul { margin: 6px 0 6px 18px; }
    li { margin: 4px 0; }
    .muted { color: #6b7280; }
    .section { border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(recipe?.title)} 레시피 리포트</h1>
  <p class="muted">${escapeHtml(recipe?.description)}</p>

  <div class="section">
    <h2>요약본</h2>
    <p>${escapeHtml(recipe?.summary || '요약 결과가 없습니다.')}</p>
  </div>

  <div class="section">
    <h2>핵심 요약</h2>
    <p><strong>결론:</strong> ${escapeHtml(exec.decision || '-')}</p>
    <p><strong>시장 적합도:</strong> ${escapeHtml(exec.marketFitScore || '-')}점</p>
    <p><strong>성공 가능성:</strong> ${escapeHtml(exec.successProbability || '-')}</p>
    <p><strong>추천 전략:</strong> ${escapeHtml(exec.recommendation || '-')}</p>
    <h3>핵심 강점</h3>
    ${listHtml(exec.keyPros)}
    <h3>주요 리스크</h3>
    ${listHtml(exec.topRisks)}
  </div>

  <div class="section">
    <h2>시장 스냅샷</h2>
    <h3>타깃 페르소나 니즈</h3>
    <p>${escapeHtml(personaNeeds.needs || '-')}</p>
    <p>구매 요인: ${escapeHtml(personaNeeds.purchaseDrivers || '-')}</p>
    <p>장벽: ${escapeHtml(personaNeeds.barriers || '-')}</p>
    <h3>트렌드 시그널</h3>
    ${listHtml(trendSignals.trendNotes)}
    <p>가격대: ${escapeHtml(trendSignals.priceRangeNotes || '-')}</p>
    <p>채널: ${escapeHtml(trendSignals.channelSignals || '-')}</p>
    <h3>경쟁 구도</h3>
    <p>${escapeHtml(competition.localCompetitors || '-')}</p>
    <p>차별화: ${escapeHtml(competition.differentiation || '-')}</p>
  </div>

  <div class="section">
    <h2>리스크 & 대응</h2>
    <h3>리스크</h3>
    ${listHtml(risk.riskList)}
    <h3>완화 전략</h3>
    ${listHtml(risk.mitigations)}
  </div>

  <div class="section">
    <h2>SWOT</h2>
    <h3>Strengths</h3>
    ${listHtml(swot.strengths)}
    <h3>Weaknesses</h3>
    ${listHtml(swot.weaknesses)}
    <h3>Opportunities</h3>
    ${listHtml(swot.opportunities)}
    <h3>Threats</h3>
    ${listHtml(swot.threats)}
  </div>

  <div class="section">
    <h2>컨셉 아이디어</h2>
    ${conceptIdeas.length ? conceptIdeas.map((idea) => `
      <div>
        <p><strong>${escapeHtml(idea.name || '')}</strong></p>
        <p>SCAMPER: ${escapeHtml(idea.scamperFocus || '-')}</p>
        <p>포지셔닝: ${escapeHtml(idea.positioning || '-')}</p>
        <p>기대효과: ${escapeHtml(idea.expectedEffect || '-')}</p>
        <p>리스크: ${escapeHtml(idea.risks || '-')}</p>
      </div>
    `).join('') : '<p class="muted">내용이 없습니다.</p>'}
  </div>

  <div class="section">
    <h2>KPI 제안</h2>
    ${kpis.length ? kpis.map((kpi) => `
      <div>
        <p><strong>${escapeHtml(kpi.name || '')}</strong></p>
        <p>목표: ${escapeHtml(kpi.target || '-')}</p>
        <p>측정: ${escapeHtml(kpi.method || '-')}</p>
        <p>인사이트: ${escapeHtml(kpi.insight || '-')}</p>
      </div>
    `).join('') : '<p class="muted">내용이 없습니다.</p>'}
  </div>

  <div class="section">
    <h2>다음 단계</h2>
    ${listHtml(nextSteps)}
  </div>

  <div class="section">
    <h2>인플루언서 추천</h2>
    ${
        influencers.length
            ? influencers
                  .slice(0, 5)
                  .map(
                      (inf) => `
        <div>
          <p><strong>${escapeHtml(inf.name || '')}</strong> (${escapeHtml(inf.platform || '-')})</p>
          <p class="muted">${escapeHtml(inf.profileUrl || '')}</p>
          <p>${escapeHtml(inf.rationale || '-')}</p>
          ${inf.riskNotes ? `<p class="muted">주의: ${escapeHtml(inf.riskNotes)}</p>` : ''}
        </div>
      `
                  )
                  .join('')
            : '<p class="muted">추천 결과가 없습니다.</p>'
    }
  </div>

  <div class="section">
    <h2>인플루언서 이미지</h2>
    ${
        imageBase64
            ? `<img src="data:image/png;base64,${imageBase64}" alt="influencer" style="max-width:100%; border-radius:12px;"/>`
            : '<p class="muted">이미지 생성 결과가 없습니다.</p>'
    }
  </div>
</body>
</html>`;
    };

    const handlePdfDownload = () => {
        if (influencerLoading) {
            return;
        }
        const html = buildPrintableHtml();
        const win = window.open('', '_blank', 'width=900,height=1000');
        if (!win) {
            return;
        }
        win.document.write(html);
        win.document.close();
        win.focus();
        const waitForImages = () => {
            const images = Array.from(win.document.images || []);
            if (!images.length) {
                win.print();
                return;
            }
            let loaded = 0;
            const done = () => {
                loaded += 1;
                if (loaded === images.length) {
                    win.print();
                }
            };
            images.forEach((img) => {
                if (img.complete) {
                    done();
                } else {
                    img.onload = done;
                    img.onerror = done;
                }
            });
            setTimeout(() => {
                if (loaded < images.length) {
                    win.print();
                }
            }, 1500);
        };
        if (win.document.readyState === 'complete') {
            waitForImages();
        } else {
            win.onload = waitForImages;
        }
    };

    const renderList = (items) => {
        if (!items || items.length === 0) {
            return <p className="text-sm text-[color:var(--text-muted)]">내용이 없습니다.</p>;
        }
        return (
            <ul className="space-y-2 text-sm text-[color:var(--text)]">
                {items.map((item, idx) => (
                    <li key={`${idx}-${item}`} className="flex gap-2">
                        <span className="text-[color:var(--accent)]">•</span>
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
        );
    };

    if (loading) {
        return (
            <div className="rounded-[2.5rem] bg-[color:var(--surface)]/90 border border-[color:var(--border)] shadow-[0_30px_80px_var(--shadow)] p-10 backdrop-blur">
                <p className="text-[color:var(--text-muted)]">레포트를 불러오는 중입니다...</p>
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
                        <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--text-soft)] mb-2">Recipe Report</p>
                        <h2 className="text-2xl md:text-3xl font-semibold text-[color:var(--text)]">레시피 보고서</h2>
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

                {!report && (
                    <div className="mt-6 p-4 rounded-xl border border-[color:var(--danger)]/40 bg-[color:var(--danger-bg)] text-sm text-[color:var(--danger)]">
                        보고서 데이터가 없습니다.
                    </div>
                )}

                <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6">
                    <div className="space-y-6">
                        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_12px_30px_var(--shadow)] p-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-[color:var(--text)]">핵심 요약</h3>
                            </div>
                            <div className="mt-4 space-y-3 text-sm text-[color:var(--text)]">
                                <p><strong>결론:</strong> {exec.decision || '-'}</p>
                                <p><strong>시장 적합도:</strong> {exec.marketFitScore || '-'}점</p>
                                <p><strong>성공 가능성:</strong> {exec.successProbability || '-'}</p>
                                <p><strong>추천 전략:</strong> {exec.recommendation || '-'}</p>
                                <div>
                                    <p className="font-semibold text-[color:var(--text)] mb-2">핵심 강점</p>
                                    {renderList(exec.keyPros)}
                                </div>
                                <div>
                                    <p className="font-semibold text-[color:var(--text)] mb-2">주요 리스크</p>
                                    {renderList(exec.topRisks)}
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_12px_30px_var(--shadow)] p-6">
                            <h3 className="text-lg font-semibold text-[color:var(--text)] mb-4">시장 스냅샷</h3>
                            <div className="space-y-4 text-sm text-[color:var(--text)]">
                                <div>
                                    <p className="font-semibold text-[color:var(--text)]">타깃 페르소나 니즈</p>
                                    <p className="text-[color:var(--text-muted)]">{personaNeeds.needs || '-'}</p>
                                    <p className="mt-2">구매 요인: {personaNeeds.purchaseDrivers || '-'}</p>
                                    <p>장벽: {personaNeeds.barriers || '-'}</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-[color:var(--text)]">트렌드 시그널</p>
                                    {renderList(trendSignals.trendNotes)}
                                    <p className="mt-2">가격대: {trendSignals.priceRangeNotes || '-'}</p>
                                    <p>채널: {trendSignals.channelSignals || '-'}</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-[color:var(--text)]">경쟁 구도</p>
                                    <p className="text-[color:var(--text-muted)]">{competition.localCompetitors || '-'}</p>
                                    <p className="mt-2">차별화: {competition.differentiation || '-'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_12px_30px_var(--shadow)] p-6">
                                <h3 className="text-lg font-semibold text-[color:var(--text)] mb-3">리스크 & 대응</h3>
                                <p className="text-sm font-semibold text-[color:var(--text)] mb-2">리스크</p>
                                {renderList(risk.riskList)}
                                <p className="mt-4 text-sm font-semibold text-[color:var(--text)] mb-2">완화 전략</p>
                                {renderList(risk.mitigations)}
                            </div>
                            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_12px_30px_var(--shadow)] p-6">
                                <h3 className="text-lg font-semibold text-[color:var(--text)] mb-3">SWOT</h3>
                                <p className="text-sm font-semibold text-[color:var(--text)] mb-2">Strengths</p>
                                {renderList(swot.strengths)}
                                <p className="mt-3 text-sm font-semibold text-[color:var(--text)] mb-2">Weaknesses</p>
                                {renderList(swot.weaknesses)}
                                <p className="mt-3 text-sm font-semibold text-[color:var(--text)] mb-2">Opportunities</p>
                                {renderList(swot.opportunities)}
                                <p className="mt-3 text-sm font-semibold text-[color:var(--text)] mb-2">Threats</p>
                                {renderList(swot.threats)}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_12px_30px_var(--shadow)] p-6">
                            <h3 className="text-lg font-semibold text-[color:var(--text)] mb-4">컨셉 아이디어</h3>
                            <div className="space-y-4">
                                {conceptIdeas.length === 0 && (
                                    <p className="text-sm text-[color:var(--text-muted)]">내용이 없습니다.</p>
                                )}
                                {conceptIdeas.map((idea, idx) => (
                                    <div key={`${idea.name}-${idx}`} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
                                        <p className="text-sm font-semibold text-[color:var(--text)]">{idea.name || `아이디어 ${idx + 1}`}</p>
                                        <p className="text-sm text-[color:var(--text-muted)] mt-1">SCAMPER: {idea.scamperFocus || '-'}</p>
                                        <p className="text-sm text-[color:var(--text-muted)]">포지셔닝: {idea.positioning || '-'}</p>
                                        <p className="text-sm text-[color:var(--text-muted)]">기대효과: {idea.expectedEffect || '-'}</p>
                                        <p className="text-sm text-[color:var(--text-muted)]">리스크: {idea.risks || '-'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_12px_30px_var(--shadow)] p-6">
                            <h3 className="text-lg font-semibold text-[color:var(--text)] mb-4">KPI 제안</h3>
                            <div className="space-y-3">
                                {kpis.length === 0 && (
                                    <p className="text-sm text-[color:var(--text-muted)]">내용이 없습니다.</p>
                                )}
                                {kpis.map((kpi, idx) => (
                                    <div key={`${kpi.name}-${idx}`} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4 text-sm">
                                        <p className="font-semibold text-[color:var(--text)]">{kpi.name || `KPI ${idx + 1}`}</p>
                                        <p className="text-[color:var(--text-muted)]">목표: {kpi.target || '-'}</p>
                                        <p className="text-[color:var(--text-muted)]">측정: {kpi.method || '-'}</p>
                                        <p className="text-[color:var(--text-muted)]">인사이트: {kpi.insight || '-'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_12px_30px_var(--shadow)] p-6">
                            <h3 className="text-lg font-semibold text-[color:var(--text)] mb-3">다음 단계</h3>
                            {renderList(nextSteps)}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_12px_30px_var(--shadow)] p-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-[color:var(--text)]">요약본</h3>
                            </div>
                            <p className="mt-4 text-sm text-[color:var(--text-muted)] whitespace-pre-line">
                                {recipe.summary || '요약 결과가 없습니다.'}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_12px_30px_var(--shadow)] p-6">
                            <h3 className="text-lg font-semibold text-[color:var(--text)] mb-3">인플루언서 추천</h3>
                            {influencerLoading ? (
                                <p className="text-sm text-[color:var(--text-muted)]">인플루언서 추천 중...</p>
                            ) : influencers.length === 0 ? (
                                <p className="text-sm text-[color:var(--text-muted)]">추천 결과가 없습니다.</p>
                            ) : (
                                <div className="space-y-4">
                                    {influencers.slice(0, 3).map((inf, idx) => (
                                        <div key={`${inf.name}-${idx}`} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
                                            <p className="text-sm font-semibold text-[color:var(--text)]">{inf.name}</p>
                                            <p className="text-xs text-[color:var(--text-soft)]">{inf.platform || '-'} · {inf.profileUrl || '링크 없음'}</p>
                                            <p className="mt-2 text-xs text-[color:var(--text-muted)]">{inf.rationale || '-'}</p>
                                            {inf.riskNotes && (
                                                <p className="mt-2 text-xs text-[color:var(--danger)]">주의: {inf.riskNotes}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_12px_30px_var(--shadow)] p-6">
                            <h3 className="text-lg font-semibold text-[color:var(--text)] mb-3">인플루언서 이미지</h3>
                            <div className="min-h-[320px] rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] flex items-center justify-center overflow-hidden">
                                {imageBase64 ? (
                                    <img
                                        src={`data:image/png;base64,${imageBase64}`}
                                        alt="influencer"
                                        className="h-full w-full object-contain"
                                    />
                                ) : (
                                    <p className="text-sm text-[color:var(--text-muted)]">
                                        {influencerLoading ? '이미지 생성 중...' : '이미지 생성 결과가 없습니다.'}
                                    </p>
                                )}
                            </div>
                        </div>

                        {recipe.status === 'DRAFT' && isOwner && (
                            <button
                                type="button"
                                className="w-full py-2 rounded-xl bg-[color:var(--accent)] text-[color:var(--accent-contrast)] text-sm font-semibold hover:bg-[color:var(--accent-strong)] transition disabled:opacity-60 disabled:cursor-not-allowed"
                                onClick={handlePublish}
                                disabled={publishLoading || influencerLoading || !imageBase64 || influencers.length === 0}
                            >
                                {publishLoading ? '등록 중...' : '등록 확정'}
                            </button>
                        )}
                        {recipe.status === 'PUBLISHED' && (
                            <button
                                type="button"
                                className="w-full py-2 rounded-xl bg-[color:var(--accent)] text-[color:var(--accent-contrast)] text-sm font-semibold hover:bg-[color:var(--accent-strong)] transition disabled:opacity-60 disabled:cursor-not-allowed"
                                onClick={handlePdfDownload}
                                disabled={influencerLoading}
                            >
                                {influencerLoading ? 'PDF 준비 중...' : 'PDF 다운로드'}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                const fromReview = location.state?.fromReview;
                                if (fromReview) {
                                    navigate('/mainboard/create/manual', {
                                        state: {
                                            reviewRecipeId: recipe.id,
                                            influencers,
                                            influencerImageBase64: imageBase64,
                                        },
                                    });
                                } else {
                                    navigate(`/mainboard/recipes/${recipe.id}`);
                                }
                            }}
                            className="w-full py-2 rounded-xl border border-[color:var(--border)] text-sm text-[color:var(--text)] hover:bg-[color:var(--surface-muted)] transition"
                        >
                            요약으로 돌아가기
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecipeAnalysis;
