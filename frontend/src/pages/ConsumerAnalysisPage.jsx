import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Plot from 'react-plotly.js';
import { Search, ShoppingBag, BarChart2, MessageSquare, AlertCircle, RefreshCw } from 'lucide-react';

const Skeleton = ({ className }) => (
    <div className={`animate-pulse bg-[color:var(--surface-muted)] rounded-lg ${className}`}></div>
);

const ConsumerAnalysisPage = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [itemId, setItemId] = useState('B00AF7XMYY'); // Default ASIN
    const [error, setError] = useState(null);

    const fetchAnalysis = async () => {
        if (!itemId) {
            setError("ASIN을 입력해주세요.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // Using the analysis-engine endpoint (port 8000 exposed via Docker or direct)
            // Assuming frontend can access it via localhost:8000 based on previous context 
            // or through the backend proxy if configured. 
            // For now, consistent with ExportAnalysisPage using localhost:8000
            const response = await axios.get('http://localhost:8000/analyze/consumer', {
                params: { item_id: itemId }
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
                        Consumer Voice Analysis
                    </span>
                </h1>
                <p className="text-[color:var(--text-muted)] text-lg">
                    아마존 리뷰 기반 소비자 경험(CX) 및 감성 분석 대시보드
                </p>
            </header>

            {/* Search / Filter Section */}
            <div className="max-w-7xl mx-auto mb-10">
                <div className="bg-[color:var(--surface)] p-6 rounded-2xl shadow-lg border border-[color:var(--border)]">
                    <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-semibold text-[color:var(--text-soft)] mb-2 flex items-center gap-2">
                                <ShoppingBag size={16} /> Target Product (ASIN)
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={itemId}
                                    onChange={(e) => setItemId(e.target.value)}
                                    placeholder="e.g., B00AF7XMYY"
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
                            분석 실행
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
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            <MetricCard label="NSS (감성지수)" value={data.metrics.nss} trend="Sentiment" color="text-pink-500" />
                            <MetricCard label="CAS (옹호지수)" value={data.metrics.cas} trend="Advocacy" color="text-indigo-500" />
                            <MetricCard label="PQI (품질지수)" value={data.metrics.pqi} trend="Quality" color="text-emerald-500" />
                            <MetricCard label="LFI (물류마찰)" value={data.metrics.lfi} trend="Logistics" color="text-orange-500" />
                            <MetricCard label="SPI (감각지수)" value={data.metrics.spi} trend="Sensory" color="text-rose-500" />
                            <MetricCard label="Value Score" value={data.metrics.value_score} trend="Perception" color="text-blue-500" />
                        </div>

                        {/* Row 1: NSS Gauge & Marketing Matrix */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <ChartCard title="Brand Health (NSS)" icon={<MessageSquare size={20} className="text-pink-500" />}>
                                <Plot
                                    data={data.charts.nss_gauge.data}
                                    layout={{ ...data.charts.nss_gauge.layout, autosize: true, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: 'var(--text-muted)' } }}
                                    useResizeHandler={true}
                                    style={{ width: '100%', height: '100%' }}
                                    config={{ displayModeBar: false }}
                                />
                            </ChartCard>
                            <ChartCard title="Marketing Matrix (Value vs Price)" icon={<BarChart2 size={20} className="text-blue-500" />}>
                                <Plot
                                    data={data.charts.marketing_matrix.data}
                                    layout={{ ...data.charts.marketing_matrix.layout, autosize: true, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: 'var(--text-muted)' } }}
                                    useResizeHandler={true}
                                    style={{ width: '100%', height: '100%' }}
                                    config={{ displayModeBar: false }}
                                />
                            </ChartCard>
                        </div>

                        {/* Row 2: Scatter & Radar */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <ChartCard title="Customer Loyalty (NSS vs CAS)" icon={<ActivityIcon size={20} className="text-purple-500" />}>
                                <Plot
                                    data={data.charts.nss_cas_scatter.data}
                                    layout={{ ...data.charts.nss_cas_scatter.layout, autosize: true, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: 'var(--text-muted)' } }}
                                    useResizeHandler={true}
                                    style={{ width: '100%', height: '100%' }}
                                    config={{ displayModeBar: false }}
                                />
                            </ChartCard>
                            <ChartCard title="Sensory Profile (Radar)" icon={<RefreshCw size={20} className="text-emerald-500" />}>
                                <Plot
                                    data={data.charts.sensory_radar.data}
                                    layout={{ ...data.charts.sensory_radar.layout, autosize: true, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: 'var(--text-muted)' } }}
                                    useResizeHandler={true}
                                    style={{ width: '100%', height: '100%' }}
                                    config={{ displayModeBar: false }}
                                />
                            </ChartCard>
                        </div>

                        {/* Row 3: Quality Issues Treemap */}
                        <div className="w-full">
                            <ChartCard title="Quality Issues Map" icon={<AlertCircle size={20} className="text-orange-500" />}>
                                <Plot
                                    data={data.charts.quality_treemap.data}
                                    layout={{ ...data.charts.quality_treemap.layout, autosize: true, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: 'var(--text-muted)' }, margin: { t: 30, l: 10, r: 10, b: 10 } }}
                                    useResizeHandler={true}
                                    style={{ width: '100%', height: '500px' }}
                                    config={{ displayModeBar: false }}
                                />
                            </ChartCard>
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

const ActivityIcon = ({ size, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
);

const NoDataPlaceholder = () => (
    <div className="h-[400px] flex flex-col items-center justify-center text-[color:var(--text-soft)] p-12 bg-[color:var(--surface-muted)]/30 rounded-xl border border-dashed border-[color:var(--border)]">
        <AlertCircle size={48} className="mb-4 opacity-50" />
        <p className="text-lg font-medium">분석할 데이터가 없습니다.</p>
        <p className="text-sm opacity-70">ASIN을 입력하고 분석을 시작해보세요.</p>
    </div>
);

export default ConsumerAnalysisPage;
