import React, { useState, useEffect } from 'react';
import axiosInstance from '../axiosConfig';
import Plot from 'react-plotly.js';
import { Search, Globe, ChevronDown, TrendingUp, Activity, BarChart2, AlertCircle, LayoutDashboard } from 'lucide-react';

// Skeleton Component
const Skeleton = ({ className }) => (
    <div className={`animate-pulse bg-[color:var(--surface-muted)] rounded-lg ${className}`}></div>
);

const ExportAnalysisPage = () => {
    const [activeTab, setActiveTab] = useState('analyze'); // 'analyze' or 'dashboard'
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [dashboardData, setDashboardData] = useState(null);
    const [filters, setFilters] = useState({
        country: 'US',
        item: '김치'
    });
    const [availableItems, setAvailableItems] = useState([]);
    const [error, setError] = useState(null);

    // Initial Data Fetch
    useEffect(() => {
        const fetchItems = async () => {
            try {
                const response = await axiosInstance.get('/analysis/items');
                if (response.data && response.data.items && response.data.items.length > 0) {
                    setAvailableItems(response.data.items);
                }
            } catch (err) {
                console.error("Failed to fetch items:", err);
                setAvailableItems(['김치', '라면', '만두', '소주', '비빔밥']);
            }
        };
        fetchItems();
        fetchAnalysis(); // Load initial analysis
    }, []);

    // Fetch Dashboard Data only when tab is clicked
    useEffect(() => {
        if (activeTab === 'dashboard' && !dashboardData) {
            fetchDashboard();
        }
    }, [activeTab]);

    const fetchAnalysis = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axiosInstance.get('/analysis', {
                params: { country: filters.country, item: filters.item }
            });
            setData(response.data);
        } catch (err) {
            console.error("Analysis Error:", err);
            setError("데이터를 불러오는 중 오류가 발생했습니다.");
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    const fetchDashboard = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get('/analysis/dashboard');
            setDashboardData(response.data);
        } catch (err) {
            console.error("Dashboard Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleAnalyze = () => {
        fetchAnalysis();
    };

    return (
        <div className="min-h-screen bg-[color:var(--background)] p-8 font-sans text-[color:var(--text)]">
            {/* Header Section */}
            <header className="max-w-7xl mx-auto mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                            Global K-Food Assistant
                        </h1>
                        <p className="text-[color:var(--text-muted)] text-lg">
                            데이터 기반 수출 전략 수립을 위한 다차원 시각화 대시보드
                        </p>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <div className="max-w-7xl mx-auto mb-8 flex space-x-4 border-b border-[color:var(--border)]">
                <button
                    onClick={() => setActiveTab('analyze')}
                    className={`pb-4 px-4 font-bold text-lg flex items-center gap-2 transition-colors ${activeTab === 'analyze'
                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                        : 'text-[color:var(--text-muted)] hover:text-[color:var(--text)]'
                        }`}
                >
                    <Search size={20} /> 개별 품목 분석
                </button>
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`pb-4 px-4 font-bold text-lg flex items-center gap-2 transition-colors ${activeTab === 'dashboard'
                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                        : 'text-[color:var(--text-muted)] hover:text-[color:var(--text)]'
                        }`}
                >
                    <LayoutDashboard size={20} /> 시장 전체 개요
                </button>
            </div>

            {/* Content Area */}
            {activeTab === 'analyze' ? (
                <>
                    {/* Filter Section */}
                    <div className="max-w-7xl mx-auto mb-10">
                        <div className="bg-[color:var(--surface)] p-6 rounded-2xl shadow-[0_4px_20px_var(--shadow)] border border-[color:var(--border)] flex flex-col md:flex-row gap-4 items-end md:items-center">
                            <div className="flex-1 w-full">
                                <label className="block text-sm font-semibold text-[color:var(--text-soft)] mb-2 flex items-center gap-2">
                                    <Globe size={16} /> 타겟 국가
                                </label>
                                <div className="relative">
                                    <select
                                        className="w-full pl-4 pr-10 py-3 bg-[color:var(--background)] border border-[color:var(--border)] rounded-xl appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-[color:var(--text)] outline-none"
                                        value={filters.country}
                                        onChange={(e) => handleFilterChange('country', e.target.value)}
                                    >
                                        <option value="US">미국 (United States)</option>
                                        <option value="CN">중국 (China)</option>
                                        <option value="JP">일본 (Japan)</option>
                                        <option value="VN">베트남 (Vietnam)</option>
                                        <option value="DE">독일 (Germany)</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[color:var(--text-muted)] pointer-events-none" size={18} />
                                </div>
                            </div>

                            <div className="flex-1 w-full">
                                <label className="block text-sm font-semibold text-[color:var(--text-soft)] mb-2 flex items-center gap-2">
                                    <Search size={16} /> 분석 품목
                                </label>
                                <div className="relative">
                                    <select
                                        className="w-full pl-4 pr-10 py-3 bg-[color:var(--background)] border border-[color:var(--border)] rounded-xl appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-[color:var(--text)] outline-none"
                                        value={filters.item}
                                        onChange={(e) => handleFilterChange('item', e.target.value)}
                                    >
                                        {availableItems.map((item) => (
                                            <option key={item} value={item}>{item}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[color:var(--text-muted)] pointer-events-none" size={18} />
                                </div>
                            </div>

                            <button
                                onClick={handleAnalyze}
                                className="w-full md:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
                            >
                                <Activity size={18} />
                                전략 분석 실행
                            </button>
                        </div>
                    </div>

                    <div className="max-w-7xl mx-auto space-y-8">
                        {/* 1. Trend Stack (Full Width) */}
                        <div className="bg-[color:var(--surface)] p-6 rounded-2xl shadow-[0_10px_30px_var(--shadow)] border border-[color:var(--border)]">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
                                        <TrendingUp size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-[color:var(--text)]">Trend Stacking</h3>
                                        <p className="text-sm text-[color:var(--text-muted)]">환율 및 경제 지표와 수출 실적의 상관관계 분석</p>
                                    </div>
                                </div>
                            </div>

                            {loading ? (
                                <Skeleton className="w-full h-[500px]" />
                            ) : !data?.has_data ? (
                                <NoDataPlaceholder />
                            ) : (
                                <Plot
                                    data={data.charts.trend_stack.data}
                                    layout={{
                                        ...data.charts.trend_stack.layout,
                                        autosize: true,
                                        paper_bgcolor: 'rgba(0,0,0,0)',
                                        plot_bgcolor: 'rgba(0,0,0,0)',
                                        font: { color: 'var(--text-muted)' },
                                        margin: { l: 40, r: 20, t: 30, b: 40 }
                                    }}
                                    useResizeHandler={true}
                                    style={{ width: '100%', height: '500px' }}
                                    config={{ displayModeBar: false }}
                                />
                            )}
                        </div>

                        {/* 2 & 3. Split View: Signal Map & Growth Matrix */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Signal Map */}
                            <div className="bg-[color:var(--surface)] p-6 rounded-2xl shadow-[0_10px_30px_var(--shadow)] border border-[color:var(--border)]">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg text-rose-600">
                                        <Activity size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-[color:var(--text)]">Signal Map</h3>
                                        <p className="text-sm text-[color:var(--text-muted)]">검색 관심도(선행)와 수출 실적(후행) 시차 분석</p>
                                    </div>
                                </div>

                                {loading ? (
                                    <Skeleton className="w-full h-[400px]" />
                                ) : !data?.has_data ? (
                                    <NoDataPlaceholder />
                                ) : (
                                    <Plot
                                        data={data.charts.signal_map.data}
                                        layout={{
                                            ...data.charts.signal_map.layout,
                                            autosize: true,
                                            paper_bgcolor: 'rgba(0,0,0,0)',
                                            plot_bgcolor: 'rgba(0,0,0,0)',
                                            font: { color: 'var(--text-muted)' },
                                            margin: { l: 40, r: 40, t: 30, b: 40 },
                                            legend: { ...data.charts.signal_map.layout.legend, font: { color: 'var(--text)' } }
                                        }}
                                        useResizeHandler={true}
                                        style={{ width: '100%', height: '400px' }}
                                        config={{ displayModeBar: false }}
                                    />
                                )}
                            </div>

                            {/* Growth Matrix */}
                            <div className="bg-[color:var(--surface)] p-6 rounded-2xl shadow-[0_10px_30px_var(--shadow)] border border-[color:var(--border)]">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600">
                                        <BarChart2 size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-[color:var(--text)]">Growth Matrix</h3>
                                        <p className="text-sm text-[color:var(--text-muted)]">품목별 성장의 질 (양적 성장 vs 질적 성장) 비교</p>
                                    </div>
                                </div>

                                {loading ? (
                                    <Skeleton className="w-full h-[400px]" />
                                ) : !data?.has_data ? (
                                    <NoDataPlaceholder />
                                ) : (
                                    <Plot
                                        data={data.charts.growth_matrix.data}
                                        layout={{
                                            ...data.charts.growth_matrix.layout,
                                            autosize: true,
                                            paper_bgcolor: 'rgba(0,0,0,0)',
                                            plot_bgcolor: 'rgba(0,0,0,0)',
                                            font: { color: 'var(--text-muted)' },
                                            margin: { l: 40, r: 20, t: 30, b: 40 }
                                        }}
                                        useResizeHandler={true}
                                        style={{ width: '100%', height: '400px' }}
                                        config={{ displayModeBar: false }}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="max-w-7xl mx-auto space-y-8">
                    {/* Dashboard Overview Charts */}
                    {loading && !dashboardData ? (
                        <div className="space-y-4">
                            <Skeleton className="w-full h-[400px]" />
                            <Skeleton className="w-full h-[400px]" />
                        </div>
                    ) : dashboardData?.has_data ? (
                        <>
                            {/* Row 1: Trends */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-[color:var(--surface)] p-6 rounded-2xl shadow-[0_10px_30px_var(--shadow)] border border-[color:var(--border)]">
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><TrendingUp size={20} className="text-indigo-500" /> 1. Top 5 국가 수출 추세</h3>
                                    <Plot
                                        data={dashboardData.charts.top_countries.data}
                                        layout={{ ...dashboardData.charts.top_countries.layout, autosize: true, width: undefined, height: undefined }}
                                        useResizeHandler={true} style={{ width: '100%', height: '400px' }} config={{ displayModeBar: false }}
                                    />
                                </div>
                                <div className="bg-[color:var(--surface)] p-6 rounded-2xl shadow-[0_10px_30px_var(--shadow)] border border-[color:var(--border)]">
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><BarChart2 size={20} className="text-purple-500" /> 2. Top 5 품목 수출 추세</h3>
                                    <Plot
                                        data={dashboardData.charts.top_items.data}
                                        layout={{ ...dashboardData.charts.top_items.layout, autosize: true, width: undefined, height: undefined }}
                                        useResizeHandler={true} style={{ width: '100%', height: '400px' }} config={{ displayModeBar: false }}
                                    />
                                </div>
                            </div>

                            {/* Row 2: Profitability & Positioning */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-[color:var(--surface)] p-6 rounded-2xl shadow-[0_10px_30px_var(--shadow)] border border-[color:var(--border)]">
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Activity size={20} className="text-emerald-500" /> 3. 국가별 평균 단가 (수익성)</h3>
                                    <Plot
                                        data={dashboardData.charts.profitability.data}
                                        layout={{ ...dashboardData.charts.profitability.layout, autosize: true, width: undefined, height: undefined }}
                                        useResizeHandler={true} style={{ width: '100%', height: '400px' }} config={{ displayModeBar: false }}
                                    />
                                </div>
                                <div className="bg-[color:var(--surface)] p-6 rounded-2xl shadow-[0_10px_30px_var(--shadow)] border border-[color:var(--border)]">
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Globe size={20} className="text-blue-500" /> 4. 시장 포지셔닝 (Volume vs Value)</h3>
                                    <Plot
                                        data={dashboardData.charts.positioning.data}
                                        layout={{ ...dashboardData.charts.positioning.layout, autosize: true, width: undefined, height: undefined }}
                                        useResizeHandler={true} style={{ width: '100%', height: '400px' }} config={{ displayModeBar: false }}
                                    />
                                </div>
                            </div>

                            {/* Row 3: Seasonality */}
                            <div className="bg-[color:var(--surface)] p-6 rounded-2xl shadow-[0_10px_30px_var(--shadow)] border border-[color:var(--border)]">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Search size={20} className="text-rose-500" /> 5. 품목별 계절성 (Heatmap)</h3>
                                <Plot
                                    data={dashboardData.charts.seasonality.data}
                                    layout={{ ...dashboardData.charts.seasonality.layout, autosize: true, width: undefined, height: undefined }}
                                    useResizeHandler={true} style={{ width: '100%', height: '400px' }} config={{ displayModeBar: false }}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="text-center p-12 text-[color:var(--text-muted)]">데이터를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.</div>
                    )}
                </div>
            )}
        </div>
    );
};

const NoDataPlaceholder = () => (
    <div className="h-full flex flex-col items-center justify-center text-[color:var(--text-soft)] p-12 bg-[color:var(--surface-muted)]/30 rounded-xl border border-dashed border-[color:var(--border)]">
        <AlertCircle size={48} className="mb-4 opacity-50" />
        <p className="text-lg font-medium">관련 데이터가 없습니다.</p>
        <p className="text-sm opacity-70">다른 품목이나 국가를 선택해주세요.</p>
    </div>
);

export default ExportAnalysisPage;
