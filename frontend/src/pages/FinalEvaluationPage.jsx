import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axiosInstance from '../axiosConfig';

const PALETTE = [
    '#8a8075',
    '#4f7c8a',
    '#8a4f5f',
    '#5f7a4f',
    '#8a6f4f',
    '#4f5f8a',
    '#7a4f8a',
];

const buildRadarPoints = (values, radius, center) => {
    const angleStep = (Math.PI * 2) / values.length;
    return values
        .map((value, index) => {
            const angle = -Math.PI / 2 + angleStep * index;
            const r = (value / 100) * radius;
            const x = center + r * Math.cos(angle);
            const y = center + r * Math.sin(angle);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');
};

const buildLinePath = (values, xScale, yScale) => {
    let path = '';
    let started = false;
    values.forEach((value, index) => {
        if (!Number.isFinite(value)) {
            started = false;
            return;
        }
        const x = xScale(index);
        const y = yScale(value);
        if (!started) {
            path += `M ${x} ${y}`;
            started = true;
        } else {
            path += ` L ${x} ${y}`;
        }
    });
    return path;
};

const normalizeReportContent = (value) => {
    if (typeof value === 'string') {
        return value.trim();
    }
    if (value == null) {
        return '';
    }
    if (Array.isArray(value)) {
        return value
            .map((item) => normalizeReportContent(item))
            .filter(Boolean)
            .join('\n');
    }
    if (typeof value === 'object') {
        if (typeof value.content === 'string') {
            return value.content.trim();
        }
        if (typeof value.text === 'string') {
            return value.text.trim();
        }
        if (typeof value.report === 'string') {
            return value.report.trim();
        }
        if (value.report && typeof value.report.content === 'string') {
            return value.report.content.trim();
        }
        try {
            return JSON.stringify(value, null, 2);
        } catch (err) {
            return String(value);
        }
    }
    return String(value);
};

const BarChart = ({ title, categories, series }) => {
    const width = 520;
    const height = 220;
    const padding = { top: 18, right: 16, bottom: 42, left: 40 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const allValues = series.flatMap((line) =>
        line.values.filter((value) => Number.isFinite(value))
    );
    const rawMin = allValues.length ? Math.min(...allValues) : 0;
    const rawMax = allValues.length ? Math.max(...allValues) : 100;
    const pad = Math.max(2, Math.round((rawMax - rawMin) * 0.08));
    const minY = Math.max(0, rawMin - pad);
    const maxY = Math.min(100, rawMax + pad);
    const yRange = Math.max(1, maxY - minY);
    const yScale = (value) =>
        padding.top + plotHeight - ((value - minY) / yRange) * plotHeight;
    const xScale = (index) => {
        if (categories.length <= 1) {
            return padding.left + plotWidth / 2;
        }
        return padding.left + (index / (categories.length - 1)) * plotWidth;
    };
    const yTicks = Array.from({ length: 5 }, (_, i) =>
        Math.round(minY + (yRange / 4) * i)
    );
    const groupWidth = categories.length ? plotWidth / categories.length : plotWidth;
    const barGap = 6;
    const barWidth = Math.max(
        6,
        Math.min(22, (groupWidth - barGap * 2) / Math.max(1, series.length))
    );

    return (
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
            <div className="flex flex-col gap-2 mb-3">
                <p className="text-sm font-semibold text-[color:var(--text)]">{title}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[color:var(--text-muted)]">
                    {series.map((line) => (
                        <div key={`${line.key}-legend`} className="flex items-center gap-1.5">
                            <span
                                className="inline-block h-2 w-2 rounded-full"
                                style={{ background: line.color }}
                            />
                            <span className="truncate max-w-[140px]">{line.name}</span>
                        </div>
                    ))}
                </div>
            </div>
            {categories.length === 0 ? (
                <p className="text-xs text-[color:var(--text-muted)]">국가별 점수 데이터가 없습니다.</p>
            ) : (
                <div className="w-full">
                    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                        {yTicks.map((tick) => {
                            const y = yScale(tick);
                            return (
                                <g key={tick}>
                                    <line
                                        x1={padding.left}
                                        y1={y}
                                        x2={width - padding.right}
                                        y2={y}
                                        stroke="rgba(0,0,0,0.08)"
                                    />
                                    <text
                                        x={padding.left - 8}
                                        y={y}
                                        textAnchor="end"
                                        dominantBaseline="middle"
                                        fontSize="10"
                                        fill="var(--text-muted)"
                                    >
                                        {tick}
                                    </text>
                                </g>
                            );
                        })}
                        {categories.map((label, index) => {
                            const x = xScale(index);
                            return (
                                <g key={label}>
                                    <line
                                        x1={x}
                                        y1={padding.top}
                                        x2={x}
                                        y2={height - padding.bottom}
                                        stroke="rgba(0,0,0,0.05)"
                                    />
                                    <text
                                        x={x}
                                        y={height - padding.bottom + 18}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fontSize="10"
                                        fill="var(--text-muted)"
                                    >
                                        {label}
                                    </text>
                                </g>
                            );
                        })}
                        {series.map((line, lineIndex) => (
                            <g key={line.key}>
                                {line.values.map((value, index) => {
                                    if (!Number.isFinite(value)) {
                                        return null;
                                    }
                                    const groupStart = padding.left + index * groupWidth + barGap;
                                    const x = groupStart + lineIndex * barWidth;
                                    const y = yScale(value);
                                    const h = padding.top + plotHeight - y;
                                    return (
                                        <rect
                                            key={`${line.key}-${index}`}
                                            x={x}
                                            y={y}
                                            width={barWidth}
                                            height={h}
                                            rx="3"
                                            fill={line.color}
                                            opacity="0.9"
                                        />
                                    );
                                })}
                            </g>
                        ))}
                    </svg>
                </div>
            )}
        </div>
    );
};

const FinalEvaluationPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const result = location.state?.result;
    const selectedReports = location.state?.selectedReports || [];
    const [scoreData, setScoreData] = useState([]);
    const [scoreLoading, setScoreLoading] = useState(false);
    const [detailResult, setDetailResult] = useState(null);

    const summaryParts = useMemo(() => {
        if (typeof result?.summary !== 'string') {
            return [];
        }
        return result.summary.split('||');
    }, [result]);

    const summaryDisplay = summaryParts[0]?.trim() || '';
    const summaryMeta = summaryParts[1] || '';

    useEffect(() => {
        if (!result) {
            return;
        }
        const payload = typeof result?.content === 'string' ? result.content : result;
        console.log('[FinalEvaluation] 보고서 내용 미리보기:', String(payload).slice(0, 4000));
        console.log('[FinalEvaluation] 내용 길이:', result?.content?.length ?? 0);
        console.log('[FinalEvaluation] 내용 타입:', typeof result?.content, Object.keys(result || {}));
    }, [result]);

    useEffect(() => {
        const fetchDetail = async () => {
            if (!result?.reportId) {
                return;
            }
            if (typeof result?.content === 'string' && result.content.trim().length > 0) {
                return;
            }
            try {
                const res = await axiosInstance.get(`/api/report/${result.reportId}`);
                setDetailResult(res.data || null);
            } catch (err) {
                console.error('최종 보고서 상세를 불러오지 못했습니다.', err);
            }
        };
        fetchDetail();
    }, [result]);

    const reportIdsFromSummary = useMemo(() => {
        if (!summaryMeta) {
            return [];
        }
        const match = summaryMeta.match(/reports=([^;\s]+)/);
        if (!match || !match[1]) {
            return [];
        }
        return match[1]
            .split(',')
            .map((v) => Number(v.trim()))
            .filter((v) => Number.isFinite(v) && v > 0);
    }, [summaryMeta]);

    const recipeIdsFromSummary = useMemo(() => {
        if (!summaryMeta) {
            return [];
        }
        const match = summaryMeta.match(/recipes=([^;\s]+)/);
        if (!match || !match[1]) {
            return [];
        }
        return match[1]
            .split(',')
            .map((v) => Number(v.trim()))
            .filter((v) => Number.isFinite(v) && v > 0);
    }, [summaryMeta]);

    const reportIds = useMemo(() => {
        if (selectedReports.length > 0) {
            return selectedReports.map((report) => report.reportId).filter(Boolean);
        }
        return reportIdsFromSummary;
    }, [selectedReports, reportIdsFromSummary]);

    const recipeIds = useMemo(() => {
        if (selectedReports.length > 0) {
            return selectedReports.map((report) => report.recipeId).filter(Boolean);
        }
        return recipeIdsFromSummary;
    }, [selectedReports, recipeIdsFromSummary]);

    useEffect(() => {
        const fetchScores = async () => {
            if (!reportIds.length && !recipeIds.length) {
                return;
            }
            try {
                setScoreLoading(true);
                const buildScoreData = (results) =>
                    results
                        .map((result, index) => {
                            if (!result || result.status !== 'fulfilled') {
                                return null;
                            }
                            const res = result.value;
                        const data = res.data || {};
                        const evaluations = data.report?.evaluationResults || [];
                        const totalCount = evaluations.length || 1;
                        const sums = evaluations.reduce(
                            (acc, item) => {
                                acc.total += Number(item.totalScore || 0);
                                acc.taste += Number(item.tasteScore || 0);
                                acc.price += Number(item.priceScore || 0);
                                acc.health += Number(item.healthScore || 0);
                                return acc;
                            },
                            { total: 0, taste: 0, price: 0, health: 0 }
                        );
                        return {
                            recipeId: data.recipeId || data.id,
                            title: data.recipeTitle || data.title || selectedReports[index]?.recipeTitle || `레시피 ${index + 1}`,
                            scores: [
                                Math.round(sums.total / totalCount),
                                Math.round(sums.taste / totalCount),
                                Math.round(sums.price / totalCount),
                                Math.round(sums.health / totalCount),
                            ],
                            countryScores: Array.isArray(data.report?.evaluationResults)
                                ? data.report.evaluationResults
                                    .map((item) => ({
                                        country: item?.country,
                                        totalScore: Number(item?.totalScore),
                                        tasteScore: Number(item?.tasteScore),
                                        priceScore: Number(item?.priceScore),
                                        healthScore: Number(item?.healthScore),
                                    }))
                                    .filter((item) => item.country)
                                : [],
                        };
                    })
                        .filter(Boolean);

                const hasEvaluation = (scoreItems) =>
                    scoreItems.some(
                        (item) =>
                            item.scores.some((value) => value > 0) ||
                            (item.countryScores && item.countryScores.length > 0)
                    );

                if (reportIds.length) {
                    const results = await Promise.allSettled(
                        reportIds.map((id) => axiosInstance.get(`/api/report/${id}`))
                    );
                    const mapped = buildScoreData(results);
                    setScoreData(mapped);
                    if (!hasEvaluation(mapped) && recipeIds.length) {
                        const fallback = await Promise.allSettled(
                            recipeIds.map((id) => axiosInstance.get(`/api/recipes/${id}`))
                        );
                        setScoreData(buildScoreData(fallback));
                    }
                } else if (recipeIds.length) {
                    const results = await Promise.allSettled(
                        recipeIds.map((id) => axiosInstance.get(`/api/recipes/${id}`))
                    );
                    setScoreData(buildScoreData(results));
                }
            } catch (err) {
                console.error('평가 점수 정보를 불러오지 못했습니다.', err);
            } finally {
                setScoreLoading(false);
            }
        };

        fetchScores();
    }, [reportIds, recipeIds, selectedReports]);

    if (!result) {
        return (
            <div className="rounded-[2.5rem] bg-[color:var(--surface)]/90 border border-[color:var(--border)] shadow-[0_30px_80px_var(--shadow)] p-8 md:p-10 backdrop-blur">
                <p className="text-sm text-[color:var(--text-muted)]">최종 평가 결과가 없습니다.</p>
                <button
                    type="button"
                    onClick={() => navigate('/mainboard/final-selection')}
                    className="mt-6 px-4 py-2 rounded-xl border border-[color:var(--border)] text-sm font-semibold text-[color:var(--text)] hover:bg-[color:var(--surface-muted)] transition"
                >
                    목록으로 돌아가기
                </button>
            </div>
        );
    }

    const contentText = useMemo(() => {
        const candidates = [
            result?.content,
            detailResult?.content,
            result?.report,
            detailResult?.report,
            result,
            detailResult,
        ];
        for (const candidate of candidates) {
            const normalized = normalizeReportContent(candidate);
            if (normalized) {
                return normalized;
            }
        }
        return '';
    }, [result, detailResult]);
    const selectedFromSummary = summaryDisplay && summaryDisplay.includes(':')
        ? summaryDisplay.split(':').slice(1).join(':').split('·').map((v) => v.trim()).filter(Boolean)
        : [];
    const chips = selectedReports.length > 0
        ? selectedReports.map((report) => report.recipeTitle).filter(Boolean)
        : selectedFromSummary;

    const hasScores = scoreData.some((item) => item.scores.some((value) => value > 0));
    const axisLabels = ['총점', '맛', '가격', '건강'];
    const countryLabels = useMemo(() => {
        const seen = new Set();
        const ordered = [];
        scoreData.forEach((item) => {
            (item.countryScores || []).forEach((entry) => {
                const label = String(entry.country || '').trim();
                if (!label || seen.has(label)) {
                    return;
                }
                seen.add(label);
                ordered.push(label);
            });
        });
        return ordered;
    }, [scoreData]);
    const buildSeries = (metric) =>
        scoreData.map((item, index) => {
            const byCountry = new Map(
                (item.countryScores || []).map((entry) => [String(entry.country || '').trim(), entry])
            );
            return {
                key: item.recipeId || item.title,
                name: item.title,
                color: PALETTE[index % PALETTE.length],
                values: countryLabels.map((label) => {
                    const entry = byCountry.get(label);
                    const value = entry ? Number(entry[metric]) : null;
                    return Number.isFinite(value) ? value : null;
                }),
            };
        });
    const totalSeries = buildSeries('totalScore');
    const tasteSeries = buildSeries('tasteScore');
    const priceSeries = buildSeries('priceScore');
    const healthSeries = buildSeries('healthScore');
    const reportLines = useMemo(() => contentText.split('\n'), [contentText]);
    const highlightTokens = useMemo(
        () => [
            '최종 추천 레시피',
            '선택 이유',
            '비교 요약',
            '리스크 및 보완 제안',
            '다음 실행 단계',
            '- 장점',
            '- 리스크',
            '- 시장성',
            '- 차별성',
        ],
        []
    );
    const renderReportLine = (line, index) => {
        if (line === '') {
            return (
                <span key={`report-line-${index}`}>
                    {'\n'}
                </span>
            );
        }
        const segments = [];
        let cursor = 0;
        while (cursor < line.length) {
            let nextIndex = -1;
            let nextToken = null;
            for (const token of highlightTokens) {
                const found = line.indexOf(token, cursor);
                if (found !== -1 && (nextIndex === -1 || found < nextIndex)) {
                    nextIndex = found;
                    nextToken = token;
                }
            }
            if (nextIndex === -1 || nextToken === null) {
                segments.push({ text: line.slice(cursor), bold: false });
                break;
            }
            if (nextIndex > cursor) {
                segments.push({ text: line.slice(cursor, nextIndex), bold: false });
            }
            segments.push({ text: nextToken, bold: true });
            cursor = nextIndex + nextToken.length;
        }
        return (
            <span key={`report-line-${index}`}>
                {segments.map((seg, partIndex) =>
                    seg.bold ? (
                        <strong key={`report-part-${index}-${partIndex}`}>{seg.text}</strong>
                    ) : (
                        <span key={`report-part-${index}-${partIndex}`}>{seg.text}</span>
                    )
                )}
                {'\n'}
            </span>
        );
    };

    return (
        <div className="relative">
            <div className="pointer-events-none absolute -top-16 -right-6 h-64 w-64 rounded-full bg-[color:var(--bg-3)] blur-3xl opacity-70" />
            <div className="pointer-events-none absolute bottom-6 left-16 h-52 w-52 rounded-full bg-[color:var(--surface-muted)] blur-3xl opacity-60" />

            <div className="rounded-[2.5rem] bg-[color:var(--surface)]/90 border border-[color:var(--border)] shadow-[0_30px_80px_var(--shadow)] p-8 md:p-10 backdrop-blur space-y-6">
                <div className="flex flex-col gap-2">
                    <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--text-soft)]">최종 평가 보고서</p>
                    <h2 className="text-2xl md:text-3xl font-semibold text-[color:var(--text)]">AI 비교 분석 결과</h2>
                </div>

                {chips.length > 0 && (
                    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
                        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-soft)] mb-3">
                            비교한 보고서 목록
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {chips.map((title) => (
                                <span
                                    key={title}
                                    className="px-3 py-1 rounded-full bg-[color:var(--surface)] border border-[color:var(--border)] text-xs text-[color:var(--text)]"
                                >
                                    {title}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-6">
                    <div className="space-y-6">
                        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-semibold text-[color:var(--text)]">AI 심사위원 평가 점수</p>
                                {scoreLoading && <span className="text-xs text-[color:var(--text-muted)]">불러오는 중...</span>}
                            </div>
                            {!hasScores && !scoreLoading && (
                                <p className="text-sm text-[color:var(--text-muted)]">평가 점수 데이터가 없습니다.</p>
                            )}
                            {hasScores && (
                                <div className="space-y-4">
                                    <div className="flex justify-center">
                                        <svg width="320" height="320" viewBox="0 0 320 320">
                                            <circle cx="160" cy="160" r="120" fill="none" stroke="rgba(0,0,0,0.08)" />
                                            <circle cx="160" cy="160" r="90" fill="none" stroke="rgba(0,0,0,0.06)" />
                                            <circle cx="160" cy="160" r="60" fill="none" stroke="rgba(0,0,0,0.05)" />
                                            <circle cx="160" cy="160" r="30" fill="none" stroke="rgba(0,0,0,0.04)" />
                                            {axisLabels.map((label, index) => {
                                                const angle = -Math.PI / 2 + (Math.PI * 2 * index) / axisLabels.length;
                                                const x = 160 + 120 * Math.cos(angle);
                                                const y = 160 + 120 * Math.sin(angle);
                                                return (
                                                    <g key={label}>
                                                        <line x1="160" y1="160" x2={x} y2={y} stroke="rgba(0,0,0,0.12)" />
                                                        <text
                                                            x={160 + 140 * Math.cos(angle)}
                                                            y={160 + 140 * Math.sin(angle)}
                                                            textAnchor="middle"
                                                            dominantBaseline="middle"
                                                            fontSize="12"
                                                            fill="var(--text-muted)"
                                                        >
                                                            {label}
                                                        </text>
                                                    </g>
                                                );
                                            })}
                                            {scoreData.map((item, index) => (
                                                <polygon
                                                    key={item.recipeId || item.title}
                                                    points={buildRadarPoints(item.scores, 120, 160)}
                                                    fill={`${PALETTE[index % PALETTE.length]}33`}
                                                    stroke={PALETTE[index % PALETTE.length]}
                                                    strokeWidth="2"
                                                />
                                            ))}
                                        </svg>
                                    </div>
                                    <div className="space-y-3">
                                        {scoreData.map((item, index) => (
                                            <div
                                                key={item.recipeId || item.title}
                                                className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-3"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="inline-block h-2.5 w-2.5 rounded-full"
                                                        style={{ background: PALETTE[index % PALETTE.length] }}
                                                    />
                                                    <span className="text-sm font-semibold text-[color:var(--text)]">{item.title}</span>
                                                </div>
                                                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[color:var(--text-muted)]">
                                                    <span>총점 {item.scores[0]}</span>
                                                    <span>맛 {item.scores[1]}</span>
                                                    <span>가격 {item.scores[2]}</span>
                                                    <span>건강 {item.scores[3]}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <BarChart title="국가별 총점 비교" categories={countryLabels} series={totalSeries} />
                            <BarChart title="국가별 맛 점수" categories={countryLabels} series={tasteSeries} />
                            <BarChart title="국가별 가격 점수" categories={countryLabels} series={priceSeries} />
                            <BarChart title="국가별 건강 점수" categories={countryLabels} series={healthSeries} />
                        </div>
                    </div>

                    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 h-full">
                        <div className="whitespace-pre-wrap text-sm text-[color:var(--text)] leading-relaxed">
                            {contentText
                                ? reportLines.map(renderReportLine)
                                : '보고서 내용을 불러오지 못했습니다.'}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={() => navigate('/mainboard/final-selection')}
                        className="px-4 py-2 rounded-xl border border-[color:var(--border)] text-sm font-semibold text-[color:var(--text)] hover:bg-[color:var(--surface-muted)] transition"
                    >
                        목록으로 돌아가기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FinalEvaluationPage;
