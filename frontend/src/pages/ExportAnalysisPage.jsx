import React, { useState, useEffect } from 'react';
import axiosInstance from '../axiosConfig';
import Plot from 'react-plotly.js';
import { HelpCircle, TrendingUp, BarChart3, DollarSign, Globe } from 'lucide-react';
import Skeleton from '../components/common/Skeleton';

const ExportAnalysisPage = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [filters, setFilters] = useState({
        country: 'US',
        item: '김치'
    });
    const [availableItems, setAvailableItems] = useState([]);
    const [error, setError] = useState(null);

    const countries = [
        { code: 'US', name: '미국' },
        { code: 'CN', name: '중국' },
        { code: 'JP', name: '일본' },
        { code: 'VN', name: '베트남' },
        { code: 'DE', name: '독일' }
    ];

    // Fetch available items on mount
    useEffect(() => {
        const fetchItems = async () => {
            try {
                // Base URL(/api) is already configured in axiosInstance
                // Request becomes: /api/analysis/items
                const response = await axiosInstance.get('/analysis/items');
                if (response.data && response.data.items && response.data.items.length > 0) {
                    setAvailableItems(response.data.items);
                }
            } catch (err) {
                console.error("Failed to fetch items:", err);
                // Fallback items if API fails
                setAvailableItems(['김치', '라면', '만두', '소주', '비빔밥']);
            }
        };
        fetchItems();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Base URL(/api) is already configured in axiosInstance
            // Request becomes: /api/analysis
            const response = await axiosInstance.get('/analysis', {
                params: filters
            });
            setData(response.data);
        } catch (error) {
            console.error('Failed to fetch analysis data', error);
            setError("데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (filters.item) {
            fetchData();
        }
    }, [filters]);

    const ScoreCard = ({ title, score, icon: Icon, description, max = 10 }) => (
        <div className="bg-[color:var(--surface)] p-6 rounded-2xl shadow-[0_10px_30px_var(--shadow)] border border-[color:var(--border)] relative group">
            <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-[color:var(--surface-muted)] rounded-xl">
                    <Icon className="text-[color:var(--accent)]" size={24} />
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-2xl font-bold text-[color:var(--text)]">{score}</span>
                    <span className="text-[color:var(--text-soft)] text-sm">/ {max}</span>
                    <div className="relative ml-2">
                        <HelpCircle size={16} className="text-[color:var(--text-soft)] cursor-help" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-[color:var(--text)] text-[color:var(--bg-1)] text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                            {description}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-[color:var(--text)]" />
                        </div>
                    </div>
                </div>
            </div>
            <h3 className="text-[color:var(--text-muted)] font-semibold text-sm">{title}</h3>
            <div className="mt-4 h-2 bg-[color:var(--surface-muted)] rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-strong)] transition-all duration-1000 ease-out"
                    style={{ width: `${(score / max) * 100}%` }}
                />
            </div>
        </div>
    );

    const SkeletonCard = () => (
        <div className="bg-[color:var(--surface)] p-6 rounded-2xl shadow-[0_10px_30px_var(--shadow)] border border-[color:var(--border)]">
            <div className="flex items-center justify-between mb-4">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <Skeleton className="w-16 h-8" />
            </div>
            <Skeleton className="w-24 h-4 mb-4" />
            <Skeleton className="w-full h-2 rounded-full" />
        </div>
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-[color:var(--text)] flex items-center gap-3">
                        <TrendingUp className="text-[color:var(--accent)]" size={32} />
                        국가별 K-Food 수출 잠재력 분석
                    </h1>
                    <p className="text-[color:var(--text-muted)] mt-2">
                        실시간 경제 지표와 검색 트렌드를 기반으로 최적의 수출 시장을 추천합니다.
                    </p>
                </div>

                <div className="flex gap-4 p-2 bg-[color:var(--surface-muted)] rounded-2xl border border-[color:var(--border)]">
                    <select
                        value={filters.country}
                        onChange={(e) => setFilters({ ...filters, country: e.target.value })}
                        className="bg-transparent text-sm font-semibold text-[color:var(--text)] outline-none px-3 py-2 cursor-pointer"
                    >
                        {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                    <div className="w-px bg-[color:var(--border)]" />
                    <select
                        value={filters.item}
                        onChange={(e) => setFilters({ ...filters, item: e.target.value })}
                        className="bg-transparent text-sm font-semibold text-[color:var(--text)] outline-none px-3 py-2 cursor-pointer"
                        disabled={availableItems.length === 0}
                    >
                        {availableItems.length === 0 ? (
                            <option value="">Loading items...</option>
                        ) : (
                            availableItems.map(i => <option key={i} value={i}>{i}</option>)
                        )}
                    </select>
                </div>
            </div>

            {error && (
                <div className="bg-red-500 text-white p-4 rounded-lg">
                    <p>{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {loading ? (
                    <>
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                    </>
                ) : (
                    <>
                        <ScoreCard
                            title="시장 매력도 (Market Health)"
                            score={data?.scores?.market_health || 0}
                            icon={Globe}
                            description="GDP 성장률, 산업 생산 지수, 현지 환율을 종합하여 시장의 경제적 생동감을 평가합니다."
                        />
                        <ScoreCard
                            title="K-Food 화제성 (K-Buzz)"
                            score={data?.scores?.k_buzz || 0}
                            max={100}
                            icon={BarChart3}
                            description="구글 트렌드 검색량을 기반으로 현지에서 K-Food에 대한 인지도와 관심도를 측정합니다."
                        />
                        <ScoreCard
                            title="가격 경쟁력 (Price Advantage)"
                            score={data?.scores?.price_advantage || 0}
                            icon={DollarSign}
                            description="수출 단가와 원/외환 환율 추이를 분석하여 가격 측면에서의 수출 유리함을 산출합니다."
                        />
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-[color:var(--surface)] p-6 rounded-2xl shadow-[0_10px_30px_var(--shadow)] border border-[color:var(--border)]">
                    <h3 className="text-lg font-bold text-[color:var(--text)] mb-6">수출 금액 추이</h3>
                    {loading ? (
                        <Skeleton className="w-full h-[400px]" />
                    ) : !data?.has_data ? (
                        <div className="h-[400px] flex items-center justify-center text-[color:var(--text-soft)] italic">
                            관련 데이터가 없습니다...
                        </div>
                    ) : (
                        <Plot
                            data={data?.charts?.export_trend?.data || []}
                            layout={{
                                ...data?.charts?.export_trend?.layout,
                                autosize: true,
                                paper_bgcolor: 'rgba(0,0,0,0)',
                                plot_bgcolor: 'rgba(0,0,0,0)',
                                font: { color: 'var(--text-muted)' },
                                margin: { l: 40, r: 20, t: 20, b: 40 }
                            }}
                            useResizeHandler={true}
                            style={{ width: '100%', height: '400px' }}
                            config={{ displayModeBar: false }}
                        />
                    )}
                </div>

                <div className="bg-[color:var(--surface)] p-6 rounded-2xl shadow-[0_10px_30px_var(--shadow)] border border-[color:var(--border)]">
                    <h3 className="text-lg font-bold text-[color:var(--text)] mb-6">수출액 vs 검색 트렌드 상관관계</h3>
                    {loading ? (
                        <Skeleton className="w-full h-[400px]" />
                    ) : !data?.has_data ? (
                        <div className="h-[400px] flex items-center justify-center text-[color:var(--text-soft)] italic">
                            관련 데이터가 없습니다...
                        </div>
                    ) : (
                        <Plot
                            data={data?.charts?.correlation?.data || []}
                            layout={{
                                ...data?.charts?.correlation?.layout,
                                autosize: true,
                                paper_bgcolor: 'rgba(0,0,0,0)',
                                plot_bgcolor: 'rgba(0,0,0,0)',
                                font: { color: 'var(--text-muted)' },
                                margin: { l: 40, r: 40, t: 20, b: 40 }
                            }}
                            useResizeHandler={true}
                            style={{ width: '100%', height: '400px' }}
                            config={{ displayModeBar: false }}
                        />
                    )}
                </div>
            </div>

            {!loading && data?.scores?.total_score && (
                <div className="bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-strong)] p-1 rounded-3xl">
                    <div className="bg-[color:var(--surface)] p-8 rounded-[1.4rem] flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-[color:var(--text)]">종합 수출 전략 인사이트</h2>
                            <p className="text-[color:var(--text-muted)]">
                                {filters.country} 시장에서의 {filters.item} 수출 잠재력 점수는
                                <span className="text-[color:var(--accent)] font-bold mx-1">{data.scores.total_score}점</span>
                                입니다.
                            </p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="text-5xl font-black text-[color:var(--accent)]">{data.scores.total_score}</div>
                            <div className="text-xs uppercase tracking-widest text-[color:var(--text-soft)] mt-2">Overall Score</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExportAnalysisPage;
