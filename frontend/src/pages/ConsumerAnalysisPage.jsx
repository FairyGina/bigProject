import React, { useState, useEffect } from 'react';
import axiosInstance from '../axiosConfig';
import Plot from 'react-plotly.js';
import { Search, BarChart2, MessageSquare, AlertCircle, RefreshCw, ThumbsUp, Target, Lightbulb, AlertTriangle, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';

const Skeleton = ({ className }) => (
    <div className={`animate-pulse bg-[color:var(--surface-muted)] rounded-lg ${className}`}></div>
);

const ConsumerAnalysisPage = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [searchTerm, setSearchTerm] = useState('Kimchi');
    const [error, setError] = useState(null);
    const [showMetrics, setShowMetrics] = useState(false);
    const [showDetailCharts, setShowDetailCharts] = useState(false);

    const fetchAnalysis = async () => {
        if (!searchTerm) {
            setError("검색어(키워드)를 입력해주세요.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const response = await axiosInstance.get('/analysis/consumer', {
                params: { item_name: searchTerm }
            });

            if (response.data && response.data.has_data) {
                setData(response.data);
            } else {
                setData(null);
                setError(response.data.message || "데이터를 찾을 수 없습니다.");
            }
        } catch (err) {
            console.error("Analysis Error:", err);
            setError("분석 데이터를 불러오는 중 오류가 발생했습니다. (서버 연결 확인 필요)");
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalysis();
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchAnalysis();
    };

    return (
        <div className="min-h-screen bg-[color:var(--background)] p-8 font-sans text-[color:var(--text)]">
            {/* Header */}
            <header className="max-w-7xl mx-auto mb-8">
                <h1 className="text-3xl font-extrabold tracking-tight mb-2 flex items-center gap-3">
                    <span className="bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
                        시장 인사이트 & 소비자 보이스
                    </span>
                </h1>
                <p className="text-[color:var(--text-muted)] text-lg">
                    사용자 감성 분석 및 핵심 구매 결정 요인 (Key Value Drivers)
                </p>
            </header>

            {/* Search Section */}
            <div className="max-w-7xl mx-auto mb-10">
                <div className="bg-[color:var(--surface)] p-6 rounded-2xl shadow-lg border border-[color:var(--border)]">
                    <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-semibold text-[color:var(--text-soft)] mb-2 flex items-center gap-2">
                                <Search size={16} /> 카테고리 / 키워드
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="e.g., Gochujang, Kimchi, Ramen (키워드 검색)"
                                    className="w-full pl-4 pr-4 py-3 bg-[color:var(--background)] border border-[color:var(--border)] rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all text-[color:var(--text)] outline-none"
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full md:w-auto px-8 py-3.5 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl shadow-lg hover:shadow-pink-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />}
                            INSIGHT 분석
                        </button>
                    </form>
                    {error && (
                        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500">
                            <AlertCircle size={20} />
                            <span>{error}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Dashboard Content */}
            <div className="max-w-7xl mx-auto space-y-8">
                {loading ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Skeleton className="h-[200px]" />
                            <Skeleton className="h-[200px]" />
                            <Skeleton className="h-[200px]" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <Skeleton className="h-[400px]" />
                            <Skeleton className="h-[400px]" />
                        </div>
                    </div>
                ) : !data ? (
                    <NoDataPlaceholder />
                ) : (
                    <>
                        {/* =============================================
                            Section 1: 전략 인사이트 카드 (최상단)
                            ============================================= */}
                        {data.insights && (data.insights.critical_issue || data.insights.winning_point || data.insights.niche_opportunity) && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* 🚨 Critical Issue */}
                                {data.insights.critical_issue && (
                                    <InsightCard
                                        type="critical"
                                        icon={<AlertTriangle size={22} />}
                                        label="🚨 Critical Issue"
                                        title={data.insights.critical_issue.title}
                                        description={data.insights.critical_issue.description}
                                        evidence={data.insights.critical_issue.data_evidence}
                                        action={data.insights.critical_issue.action_item}
                                        terms={data.insights.critical_issue.top_terms}
                                    />
                                )}
                                {/* 👍 Winning Point */}
                                {data.insights.winning_point && (
                                    <InsightCard
                                        type="winning"
                                        icon={<ThumbsUp size={22} />}
                                        label="👍 Winning Point"
                                        title={data.insights.winning_point.title}
                                        description={data.insights.winning_point.description}
                                        evidence={data.insights.winning_point.data_evidence}
                                        action={data.insights.winning_point.marketing_msg}
                                        terms={data.insights.winning_point.top_terms}
                                    />
                                )}
                                {/* 💡 Niche Opportunity */}
                                {data.insights.niche_opportunity && (
                                    <InsightCard
                                        type="niche"
                                        icon={<Lightbulb size={22} />}
                                        label="💡 Niche Opportunity"
                                        title={data.insights.niche_opportunity.title}
                                        description={data.insights.niche_opportunity.description}
                                        evidence={data.insights.niche_opportunity.data_evidence}
                                        terms={data.insights.niche_opportunity.top_terms}
                                    />
                                )}
                            </div>
                        )}

                        {/* =============================================
                            Section 2: 핵심 지표 (접을 수 있음)
                            ============================================= */}
                        <div className="bg-[color:var(--surface)] rounded-2xl shadow-lg border border-[color:var(--border)] overflow-hidden">
                            <button
                                onClick={() => setShowMetrics(!showMetrics)}
                                className="w-full px-6 py-4 flex items-center justify-between hover:bg-[color:var(--surface-muted)] transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                                        <BarChart2 size={20} className="text-indigo-500" />
                                    </div>
                                    <span className="text-lg font-bold text-[color:var(--text)]">핵심 지표 요약</span>
                                    <span className="text-xs px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-500 font-medium">
                                        리뷰 {data.metrics.total_reviews}건
                                    </span>
                                </div>
                                {showMetrics ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                            {showMetrics && (
                                <div className="px-6 pb-6">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                                        <MetricCard label="총 리뷰 수" value={data.metrics.total_reviews} trend="분석 데이터셋" color="text-gray-500" />
                                        <MetricCard label="평점 경쟁력 (Impact)" value={data.metrics.impact_score > 0 ? `+${data.metrics.impact_score}` : data.metrics.impact_score} trend="기준점(3.0) 대비" color="text-yellow-500" />
                                        <MetricCard label="감성 점수 (vs 평균)" value={data.metrics.sentiment_z_score} trend="+: 긍정 우위 / -: 부정 우위" color="text-pink-500" />
                                        <MetricCard label="열성 고객 비율" value={`${(data.metrics.satisfaction_index * 20).toFixed(1)}%`} trend="5점 리뷰 비중" color="text-indigo-500" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* =============================================
                            Section 3: 인사이트 차트 (Sentiment Gap + Keyword-Rating)
                            ============================================= */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <ChartCard title="감성 차이 분석 (Sentiment Gap)" icon={<BarChart2 size={20} className="text-emerald-500" />}>
                                <Plot
                                    data={data.charts.sentiment_gap?.data || []}
                                    layout={{ ...data.charts.sentiment_gap?.layout, autosize: true, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: 'var(--text-muted)' } }}
                                    useResizeHandler={true}
                                    style={{ width: '100%', height: '100%' }}
                                    config={{ displayModeBar: false }}
                                />
                            </ChartCard>
                            <ChartCard title="키워드-별점 상관관계" icon={<TrendingUp size={20} className="text-amber-500" />}>
                                <Plot
                                    data={data.charts.keyword_rating_corr?.data || []}
                                    layout={{ ...data.charts.keyword_rating_corr?.layout, autosize: true, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: 'var(--text-muted)' } }}
                                    useResizeHandler={true}
                                    style={{ width: '100%', height: '100%' }}
                                    config={{ displayModeBar: false }}
                                />
                            </ChartCard>
                        </div>

                        {/* =============================================
                            Section 4: 기존 분석 차트 (접을 수 있음)
                            ============================================= */}
                        <div className="bg-[color:var(--surface)] rounded-2xl shadow-lg border border-[color:var(--border)] overflow-hidden">
                            <button
                                onClick={() => setShowDetailCharts(!showDetailCharts)}
                                className="w-full px-6 py-4 flex items-center justify-between hover:bg-[color:var(--surface-muted)] transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500/10 rounded-lg">
                                        <Target size={20} className="text-purple-500" />
                                    </div>
                                    <span className="text-lg font-bold text-[color:var(--text)]">상세 분석 차트</span>
                                    <span className="text-xs px-2 py-1 rounded-full bg-purple-500/10 text-purple-500 font-medium">
                                        3개 차트
                                    </span>
                                </div>
                                {showDetailCharts ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                            {showDetailCharts && (
                                <div className="px-6 pb-6 space-y-8 pt-2">
                                    {/* Impact Diverging Bar */}
                                    <ChartCard title="키워드별 감성 영향도 (Impact Score)" icon={<BarChart2 size={20} className="text-indigo-500" />}>
                                        <Plot
                                            data={data.charts.impact_diverging_bar?.data || []}
                                            layout={{ ...data.charts.impact_diverging_bar?.layout, autosize: true, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: 'var(--text-muted)' } }}
                                            useResizeHandler={true}
                                            style={{ width: '100%', height: '100%' }}
                                            config={{ displayModeBar: false }}
                                        />
                                    </ChartCard>

                                    {/* Positivity Bar & Value Radar */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <ChartCard title="키워드별 만족도 지수 (Index: 1.0 기준)" icon={<ThumbsUp size={20} className="text-green-500" />}>
                                            <Plot
                                                data={data.charts.positivity_bar?.data || []}
                                                layout={{ ...data.charts.positivity_bar?.layout, autosize: true, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: 'var(--text-muted)' } }}
                                                useResizeHandler={true}
                                                style={{ width: '100%', height: '100%' }}
                                                config={{ displayModeBar: false }}
                                            />
                                        </ChartCard>
                                        <ChartCard title="핵심 구매 결정 요인 (Value Drivers)" icon={<Target size={20} className="text-purple-500" />}>
                                            <Plot
                                                data={data.charts.value_radar?.data || []}
                                                layout={{ ...data.charts.value_radar?.layout, autosize: true, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: 'var(--text-muted)' } }}
                                                useResizeHandler={true}
                                                style={{ width: '100%', height: '100%' }}
                                                config={{ displayModeBar: false }}
                                            />
                                        </ChartCard>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* =============================================
                            Section 5: 키워드별 원문 리뷰 Drill-down
                            ============================================= */}
                        <div className="bg-[color:var(--surface)] p-6 rounded-2xl shadow-lg border border-[color:var(--border)] max-h-[500px] overflow-y-auto">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-[color:var(--surface-muted)] rounded-lg">
                                    <MessageSquare size={20} className="text-blue-500" />
                                </div>
                                <h3 className="text-lg font-bold text-[color:var(--text)]">키워드별 원문 리뷰 (Drill-down)</h3>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* 긍정 키워드 섹션 */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-green-500/30">
                                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                        <span className="font-bold text-green-400 text-sm">긍정 키워드</span>
                                        <span className="text-xs text-[color:var(--text-muted)]">({data.diverging_summary?.positive_keywords?.length || 0}개)</span>
                                    </div>
                                    <div className="space-y-3">
                                        {data.diverging_summary?.positive_keywords?.length > 0 ? (
                                            data.diverging_summary.positive_keywords.map((kw, idx) => (
                                                <div key={idx} className="p-3 bg-green-500/5 rounded-lg border border-green-500/20">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-semibold text-[color:var(--text)] text-sm">{kw.keyword}</span>
                                                        <div className="flex gap-2 text-xs">
                                                            <span className="px-2 py-1 rounded bg-green-500/20 text-green-400">
                                                                +{kw.impact_score}
                                                            </span>
                                                            <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400">
                                                                긍정: {kw.positivity_rate}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        {kw.sample_reviews?.slice(0, 2).map((review, rIdx) => (
                                                            <p key={rIdx} className="text-xs text-[color:var(--text-muted)] line-clamp-2 italic">
                                                                "{review.slice(0, 150)}{review.length > 150 ? '...' : ''}"
                                                            </p>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-[color:var(--text-muted)] p-3">해당하는 긍정 키워드가 없습니다.</p>
                                        )}
                                    </div>
                                </div>
                                {/* 부정 키워드 섹션 */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-red-500/30">
                                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                        <span className="font-bold text-red-400 text-sm">부정 키워드</span>
                                        <span className="text-xs text-[color:var(--text-muted)]">({data.diverging_summary?.negative_keywords?.length || 0}개)</span>
                                    </div>
                                    <div className="space-y-3">
                                        {data.diverging_summary?.negative_keywords?.length > 0 ? (
                                            data.diverging_summary.negative_keywords.map((kw, idx) => (
                                                <div key={idx} className="p-3 bg-red-500/5 rounded-lg border border-red-500/20">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-semibold text-[color:var(--text)] text-sm">{kw.keyword}</span>
                                                        <div className="flex gap-2 text-xs">
                                                            <span className="px-2 py-1 rounded bg-red-500/20 text-red-400">
                                                                {kw.impact_score}
                                                            </span>
                                                            <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400">
                                                                긍정: {kw.positivity_rate}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        {kw.sample_reviews?.slice(0, 2).map((review, rIdx) => (
                                                            <p key={rIdx} className="text-xs text-[color:var(--text-muted)] line-clamp-2 italic">
                                                                "{review.slice(0, 150)}{review.length > 150 ? '...' : ''}"
                                                            </p>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-[color:var(--text-muted)] p-3">해당하는 부정 키워드가 없습니다.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* [Added] Business Strategy Insights Section */}
                            {data.charts?.sentiment_analysis && (
                                <div className="mt-8 pt-8 border-t border-[color:var(--border)]">
                                    <h2 className="text-xl font-bold text-[color:var(--text)] mb-6 flex items-center gap-3">
                                        <span className="p-2 bg-blue-500/10 rounded-lg text-blue-400">📊</span>
                                        Business Strategy Insights
                                    </h2>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Chart 1: Review Reliability */}
                                        <div className="bg-[color:var(--surface)] p-6 rounded-2xl border border-[color:var(--border)] shadow-sm">
                                            <h3 className="text-lg font-bold text-[color:var(--text)] mb-4">평점 vs 실제 감성 점수 (진정성 분석)</h3>
                                            <div className="h-[400px]">
                                                <Plot
                                                    data={data.charts.sentiment_analysis?.data || []}
                                                    layout={{ ...data.charts.sentiment_analysis?.layout, autosize: true, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: 'var(--text-muted)' } }}
                                                    style={{ width: '100%', height: '100%' }}
                                                    config={{ responsive: true, displayModeBar: false }}
                                                />
                                            </div>
                                            <p className="mt-4 text-xs text-[color:var(--text-muted)] italic">별점과 실제 리뷰 텍스트의 감성 일치도를 분석하여 허수 리뷰나 불만족 요인을 파악합니다.</p>
                                        </div>

                                        {/* Chart 2: Churn Drivers */}
                                        <div className="bg-[color:var(--surface)] p-6 rounded-2xl border border-[color:var(--border)] shadow-sm">
                                            <h3 className="text-lg font-bold text-[color:var(--text)] mb-4">이슈별 재구매 의도 변화 (이탈 요인 분석)</h3>
                                            <div className="h-[400px]">
                                                <Plot
                                                    data={data.charts.repurchase_drivers?.data || []}
                                                    layout={{ ...data.charts.repurchase_drivers?.layout, autosize: true, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: 'var(--text-muted)' } }}
                                                    style={{ width: '100%', height: '100%' }}
                                                    config={{ responsive: true, displayModeBar: false }}
                                                />
                                            </div>
                                            <p className="mt-4 text-xs text-[color:var(--text-muted)] italic">어떤 품질/배송/가격 이슈가 고객의 재구매 심리에 가장 큰 타격을 주는지 확인합니다.</p>
                                        </div>

                                        {/* Chart 3: Rating Impact */}
                                        <div className="bg-[color:var(--surface)] p-6 rounded-2xl border border-[color:var(--border)] shadow-sm">
                                            <h3 className="text-lg font-bold text-[color:var(--text)] mb-4">주요 이슈 유형별 평균 평점 (리스크 요인)</h3>
                                            <div className="h-[400px]">
                                                <Plot
                                                    data={data.charts.issue_impact?.data || []}
                                                    layout={{ ...data.charts.issue_impact?.layout, autosize: true, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: 'var(--text-muted)' } }}
                                                    style={{ width: '100%', height: '100%' }}
                                                    config={{ responsive: true, displayModeBar: false }}
                                                />
                                            </div>
                                            <p className="mt-4 text-xs text-[color:var(--text-muted)] italic">평균 별점을 깎아먹는 핵심 불만 유형을 시각화하여 우선순위 개선안을 도출합니다.</p>
                                        </div>

                                        {/* Chart 4: Texture Keywords */}
                                        <div className="bg-[color:var(--surface)] p-6 rounded-2xl border border-[color:var(--border)] shadow-sm">
                                            <h3 className="text-lg font-bold text-[color:var(--text)] mb-4">고객 선호 식감 키워드 Top 10</h3>
                                            <div className="h-[400px]">
                                                <Plot
                                                    data={data.charts.texture_keywords?.data || []}
                                                    layout={{ ...data.charts.texture_keywords?.layout, autosize: true, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: 'var(--text-muted)' } }}
                                                    style={{ width: '100%', height: '100%' }}
                                                    config={{ responsive: true, displayModeBar: false }}
                                                />
                                            </div>
                                            <p className="mt-4 text-xs text-[color:var(--text-muted)] italic">고객들이 긍정적으로 언급하는 식감 표현을 수집하여 제품 마케팅 포인트로 활용합니다.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                )}
                    </div>
            </div>
            );
};

            // =============================================
            // Insight Card Component
            // =============================================
            const InsightCard = ({type, icon, label, title, description, evidence, action, terms}) => {
    const styles = {
                critical: {
                bg: 'bg-red-500/5',
            border: 'border-red-500/20',
            iconBg: 'bg-red-500/10',
            iconColor: 'text-red-500',
            labelColor: 'text-red-500',
            termBg: 'bg-red-500/10',
            termText: 'text-red-400',
        },
            winning: {
                bg: 'bg-emerald-500/5',
            border: 'border-emerald-500/20',
            iconBg: 'bg-emerald-500/10',
            iconColor: 'text-emerald-500',
            labelColor: 'text-emerald-500',
            termBg: 'bg-emerald-500/10',
            termText: 'text-emerald-400',
        },
            niche: {
                bg: 'bg-amber-500/5',
            border: 'border-amber-500/20',
            iconBg: 'bg-amber-500/10',
            iconColor: 'text-amber-500',
            labelColor: 'text-amber-500',
            termBg: 'bg-amber-500/10',
            termText: 'text-amber-400',
        },
    };

            const s = styles[type] || styles.niche;

            return (
            <div className={`${s.bg} p-5 rounded-2xl border ${s.border} flex flex-col h-full`}>
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 ${s.iconBg} rounded-xl ${s.iconColor}`}>{icon}</div>
                    <span className={`text-xs font-bold uppercase tracking-wider ${s.labelColor}`}>{label}</span>
                </div>
                {/* Title */}
                <h3 className="text-base font-bold text-[color:var(--text)] mb-2 leading-snug">{title}</h3>
                {/* Description */}
                <p className="text-sm text-[color:var(--text-muted)] mb-3 leading-relaxed">{description}</p>
                {/* Evidence */}
                <div className="bg-[color:var(--background)] p-3 rounded-lg mb-3">
                    <p className="text-xs text-[color:var(--text-soft)] font-medium">📊 데이터 근거</p>
                    <p className="text-xs text-[color:var(--text-muted)] mt-1">{evidence}</p>
                </div>
                {/* Action Item */}
                {action && (
                    <div className="bg-[color:var(--background)] p-3 rounded-lg mb-3">
                        <p className="text-xs text-[color:var(--text-soft)] font-medium">💡 액션 아이템</p>
                        <p className="text-xs text-[color:var(--text-muted)] mt-1">{action}</p>
                    </div>
                )}
                {/* Related Terms */}
                {terms && terms.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
                        {terms.slice(0, 5).map((t, i) => (
                            <span key={i} className={`text-[10px] px-2 py-1 rounded-full ${s.termBg} ${s.termText} font-medium`}>
                                {t.term || t.keyword} {t.count ? `(${t.count})` : t.mentions ? `(${t.mentions})` : ''}
                            </span>
                        ))}
                    </div>
                )}
            </div>
            );
};

            // Helper Components
            const MetricCard = ({label, value, trend, color}) => (
            <div className="bg-[color:var(--background)] p-4 rounded-xl border border-[color:var(--border)] shadow-sm">
                <p className="text-xs text-[color:var(--text-muted)] font-medium uppercase tracking-wider">{label}</p>
                <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
                <p className="text-[10px] text-[color:var(--text-soft)] mt-1">{trend}</p>
            </div>
            );

            const ChartCard = ({title, icon, children}) => (
            <div className="bg-[color:var(--surface)] p-6 rounded-2xl shadow-lg border border-[color:var(--border)] flex flex-col h-[450px]">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-[color:var(--surface-muted)] rounded-lg">
                        {icon}
                    </div>
                    <h3 className="text-lg font-bold text-[color:var(--text)]">{title}</h3>
                </div>
                <div className="flex-1 min-h-0 relative">
                    {children}
                </div>
            </div>
            );

const NoDataPlaceholder = () => (
            <div className="h-[400px] flex flex-col items-center justify-center text-[color:var(--text-soft)] p-12 bg-[color:var(--surface-muted)]/30 rounded-xl border border-dashed border-[color:var(--border)]">
                <AlertCircle size={48} className="mb-4 opacity-50" />
                <p className="text-lg font-medium">분석할 키워드를 입력하세요.</p>
                <p className="text-sm opacity-70">예: Gochujang, Kimchi, Ramen</p>
            </div>
            );

            export default ConsumerAnalysisPage;
