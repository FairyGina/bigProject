import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Plot from 'react-plotly.js';
import { Search, BarChart2, MessageSquare, AlertCircle, RefreshCw, ThumbsUp, Target } from 'lucide-react';

const Skeleton = ({ className }) => (
    <div className={`animate-pulse bg-[color:var(--surface-muted)] rounded-lg ${className}`}></div>
);

const ConsumerAnalysisPage = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [searchTerm, setSearchTerm] = useState('Gochujang'); // Default search term
    const [error, setError] = useState(null);

    const fetchAnalysis = async () => {
        if (!searchTerm) {
            setError("검색어(키워드)를 입력해주세요.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // Using item_name query param for keyword search
            const response = await axios.get('http://localhost:8000/analyze/consumer', {
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

    // Initial fetch on mount
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

            {/* Search / Filter Section */}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <Skeleton className="h-[400px]" />
                        <Skeleton className="h-[400px]" />
                        <Skeleton className="h-[400px] md:col-span-2" />
                    </div>
                ) : !data ? (
                    <NoDataPlaceholder />
                ) : (
                    <>
                        {/* Metrics Summary Row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <MetricCard label="총 리뷰 수" value={data.metrics.total_reviews} trend="분석 완료" color="text-gray-500" />
                            <MetricCard label="Impact Score" value={data.metrics.impact_score > 0 ? `+${data.metrics.impact_score}` : data.metrics.impact_score} trend="평점 기준 대비" color="text-yellow-500" />
                            <MetricCard label="상대적 감성 (Z-Score)" value={data.metrics.sentiment_z_score} trend="전체 평균 대비" color="text-pink-500" />
                            <MetricCard label="만족도 지수 (Index)" value={data.metrics.satisfaction_index} trend="5점 리뷰 확률 배수" color="text-indigo-500" />
                        </div>

                        {/* Row 1: Impact Diverging Bar (신규) */}
                        <div className="grid grid-cols-1 gap-8">
                            <ChartCard title="키워드별 감성 영향도 (Impact Score)" icon={<BarChart2 size={20} className="text-indigo-500" />}>
                                <Plot
                                    data={data.charts.impact_diverging_bar?.data || []}
                                    layout={{ ...data.charts.impact_diverging_bar?.layout, autosize: true, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: 'var(--text-muted)' } }}
                                    useResizeHandler={true}
                                    style={{ width: '100%', height: '100%' }}
                                    config={{ displayModeBar: false }}
                                />
                            </ChartCard>
                        </div>

                        {/* Row 2: Positivity Bar & Value Radar */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <ChartCard title="키워드별 만족도 확률 지수 (Index: 1.0 기준)" icon={<ThumbsUp size={20} className="text-green-500" />}>
                                <Plot
                                    data={data.charts.positivity_bar?.data || []}
                                    layout={{ ...data.charts.positivity_bar?.layout, autosize: true, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: 'var(--text-muted)' } }}
                                    useResizeHandler={true}
                                    style={{ width: '100%', height: '100%' }}
                                    config={{ displayModeBar: false }}
                                />
                            </ChartCard>
                            <ChartCard title="핵심 구매 결정 요인" icon={<Target size={20} className="text-purple-500" />}>
                                <Plot
                                    data={data.charts.value_radar?.data || []}
                                    layout={{ ...data.charts.value_radar?.layout, autosize: true, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: 'var(--text-muted)' } }}
                                    useResizeHandler={true}
                                    style={{ width: '100%', height: '100%' }}
                                    config={{ displayModeBar: false }}
                                />
                            </ChartCard>
                        </div>

                        {/* Row 3: Drill-down Only (NSS Removed) */}
                        <div className="grid grid-cols-1 gap-8">


                            {/* Drill-down: 키워드별 원문 리뷰 (신규) */}
                            <div className="bg-[color:var(--surface)] p-6 rounded-2xl shadow-lg border border-[color:var(--border)] h-[400px] overflow-y-auto">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-[color:var(--surface-muted)] rounded-lg">
                                        <MessageSquare size={20} className="text-blue-500" />
                                    </div>
                                    <h3 className="text-lg font-bold text-[color:var(--text)]">키워드별 원문 리뷰 (Drill-down)</h3>
                                </div>
                                <div className="space-y-4">
                                    {data.keywords_analysis?.slice(0, 5).map((kw, idx) => (
                                        <div key={idx} className="p-3 bg-[color:var(--background)] rounded-lg border border-[color:var(--border)]">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-semibold text-[color:var(--text)]">{kw.keyword}</span>
                                                <div className="flex gap-2 text-xs">
                                                    <span className={`px-2 py-1 rounded ${kw.impact_score >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                        영향도: {kw.impact_score > 0 ? '+' : ''}{kw.impact_score}
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
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// Helper Components
const MetricCard = ({ label, value, trend, color }) => (
    <div className="bg-[color:var(--surface)] p-4 rounded-xl border border-[color:var(--border)] shadow-sm">
        <p className="text-xs text-[color:var(--text-muted)] font-medium uppercase tracking-wider">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
        <p className="text-[10px] text-[color:var(--text-soft)] mt-1">{trend}</p>
    </div>
);

const ChartCard = ({ title, icon, children }) => (
    <div className="bg-[color:var(--surface)] p-6 rounded-2xl shadow-lg border border-[color:var(--border)] flex flex-col h-[400px]">
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
