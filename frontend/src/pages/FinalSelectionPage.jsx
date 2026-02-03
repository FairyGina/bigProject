import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../axiosConfig';

const FinalSelectionPage = () => {
    const navigate = useNavigate();
    const [reports, setReports] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(() => new Set());
    const [analyzing, setAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                setLoading(true);
                const res = await axiosInstance.get('/api/report/list');
                setReports(res.data || []);
            } catch (err) {
                console.error('보고서 목록을 불러오지 못했습니다.', err);
                setError('보고서 목록을 불러오지 못했습니다.');
            } finally {
                setLoading(false);
            }
        };

        fetchReports();
    }, []);

    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filteredReports = useMemo(() => {
        if (!normalizedSearch) {
            return reports;
        }
        return reports.filter((report) => (report.recipeTitle || '').toLowerCase().includes(normalizedSearch));
    }, [normalizedSearch, reports]);

    const publicReportsAll = useMemo(
        () => reports.filter((report) => (report.reportOpenYn || report.openYn) === 'Y'),
        [reports],
    );
    const publicReports = useMemo(
        () => filteredReports.filter((report) => (report.reportOpenYn || report.openYn) === 'Y'),
        [filteredReports],
    );
    const aiReports = useMemo(
        () => publicReports.filter((report) => (report.reportType || 'AI') === 'AI'),
        [publicReports],
    );
    const finalReports = useMemo(
        () => publicReports.filter((report) => (report.reportType || 'AI') === 'FINAL_EVALUATION'),
        [publicReports],
    );
    const aiReportsAll = useMemo(
        () => publicReportsAll.filter((report) => (report.reportType || 'AI') === 'AI'),
        [publicReportsAll],
    );
    const finalReportsAll = useMemo(
        () => publicReportsAll.filter((report) => (report.reportType || 'AI') === 'FINAL_EVALUATION'),
        [publicReportsAll],
    );

    const handleAnalyze = async () => {
        if (analyzing) {
            return;
        }
        setAnalyzing(true);
        setProgress(5);
        const timer = setInterval(() => {
            setProgress((prev) => (prev >= 90 ? prev : prev + 3));
        }, 450);
        try {
            const reportIds = Array.from(selectedIds);
            const res = await axiosInstance.post('/api/report/final-evaluation', { reportIds });
            setProgress(100);
            clearInterval(timer);
            navigate('/mainboard/final-selection/result', {
                state: {
                    result: res.data,
                    selectedReports: reports.filter((report) => reportIds.includes(report.reportId)),
                },
            });
        } catch (err) {
            console.error('최종 평가 보고서 생성에 실패했습니다.', err);
            setError('최종 평가 보고서 생성에 실패했습니다.');
            clearInterval(timer);
            setProgress(0);
            setAnalyzing(false);
            return;
        }
        setAnalyzing(false);
    };

    const openFinalReport = async (report) => {
        if (!report?.reportId) {
            return;
        }
        try {
            const res = await axiosInstance.get(`/api/report/${report.reportId}`);
            navigate('/mainboard/final-selection/result', {
                state: {
                    result: res.data,
                    selectedReports: [],
                },
            });
        } catch (err) {
            console.error('최종 보고서를 불러오지 못했습니다.', err);
            setError('최종 보고서를 불러오지 못했습니다.');
        }
    };

    return (
        <div className="relative">
            <div className="pointer-events-none absolute -top-16 -right-6 h-64 w-64 rounded-full bg-[color:var(--bg-3)] blur-3xl opacity-70" />
            <div className="pointer-events-none absolute bottom-6 left-16 h-52 w-52 rounded-full bg-[color:var(--surface-muted)] blur-3xl opacity-60" />

            <div className="rounded-[2.5rem] bg-[color:var(--surface)]/90 border border-[color:var(--border)] shadow-[0_30px_80px_var(--shadow)] p-8 md:p-10 backdrop-blur">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--text-soft)] mb-2">최종 레시피 선정</p>
                        <h2 className="text-2xl md:text-3xl font-semibold text-[color:var(--text)]">레시피 리포트 목록</h2>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectMode((prev) => !prev);
                            setSelectedIds(new Set());
                        }}
                        className={`self-start md:self-auto px-4 py-2 rounded-xl text-sm font-semibold transition shadow-[0_10px_25px_var(--shadow)] ${
                            selectMode
                                ? 'bg-[color:var(--accent)] text-[color:var(--accent-contrast)]'
                                : 'bg-[color:var(--surface)] border-2 border-[color:var(--accent)] text-[color:var(--text)] hover:bg-[color:var(--surface-muted)]'
                        }`}
                    >
                        보고서 선택하기
                    </button>
                </div>

                <div className="mt-6">
                    <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--text-soft)] mb-2">
                        리포트 검색
                    </label>
                    <div className="flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 shadow-[0_10px_25px_var(--shadow)]">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="레시피 이름으로 리포트를 검색합니다"
                            className="w-full bg-transparent text-sm text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="text-xs font-semibold text-[color:var(--text-soft)] hover:text-[color:var(--text)] transition"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
                {selectMode && (
                    <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-3 text-sm text-[color:var(--text)] flex items-center justify-between gap-3">
                        <span>AI로 최종 평가할 보고서를 선택하세요.</span>
                        <span className="text-xs font-semibold text-[color:var(--text-soft)]">
                            선택 {selectedIds.size}건
                        </span>
                    </div>
                )}

                <div className="mt-8">
                    {loading && <span className="text-sm text-[color:var(--text-muted)]">리포트를 불러오는 중입니다.</span>}
                </div>

                {error && (
                    <div className="mt-4 text-sm text-[color:var(--danger)]">{error}</div>
                )}

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {aiReports.map((report) => {
                            const key = report.reportId;
                            const isSelected = selectedIds.has(key);
                            return (
                                <div
                                    key={key}
                                    className="relative rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_12px_30px_var(--shadow)] overflow-hidden text-left cursor-pointer"
                                    onClick={() => {
                                        if ((report.reportType || 'AI') !== 'AI') {
                                            return;
                                        }
                                        if (selectMode) {
                                            setSelectedIds((prev) => {
                                                const next = new Set(prev);
                                                if (next.has(key)) {
                                                    next.delete(key);
                                                } else {
                                                    next.add(key);
                                                }
                                                return next;
                                            });
                                            return;
                                        }
                                        navigate(`/mainboard/recipes/${report.recipeId}/report`);
                                    }}
                                >
                                    {selectMode && (
                                        <div className="absolute top-3 right-3 z-10">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => {}}
                                                className="h-4 w-4 accent-[color:var(--accent)]"
                                            />
                                        </div>
                                    )}
                                    <div className="h-32 bg-[color:var(--surface-muted)] flex items-center justify-center text-sm text-[color:var(--text-soft)] overflow-hidden">
                                        {report.recipeImageBase64 ? (
                                            <img src={report.recipeImageBase64} alt={report.recipeTitle} className="h-full w-full object-cover" />
                                        ) : (
                                            '이미지 영역'
                                        )}
                                    </div>
                                    <div className="px-4 py-3">
                                        <p className="text-sm font-semibold text-[color:var(--text)]">{report.recipeTitle}</p>
                                        <p className="mt-2 text-xs text-[color:var(--text-muted)] line-clamp-3">
                                            {report.summary || '요약 정보가 없습니다.'}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                </div>

                {!loading && aiReportsAll.length === 0 && (
                    <p className="mt-6 text-sm text-[color:var(--text-muted)]">등록된 AI 리포트가 없습니다.</p>
                )}

                {!loading && aiReportsAll.length > 0 && aiReports.length === 0 && (
                    <p className="mt-6 text-sm text-[color:var(--text-muted)]">일치하는 AI 리포트가 없습니다.</p>
                )}

                {selectMode && (
                    <div className="mt-8 flex justify-end">
                        <button
                            type="button"
                            disabled={selectedIds.size === 0}
                            onClick={handleAnalyze}
                            className="px-6 py-3 rounded-2xl bg-[color:var(--accent)] text-[color:var(--accent-contrast)] font-semibold shadow-[0_10px_30px_var(--shadow)] disabled:opacity-60 flex items-center gap-2"
                        >
                            {analyzing ? (
                                <>
                                    <span className="h-4 w-4 rounded-full border-2 border-[color:var(--accent-contrast)]/50 border-t-[color:var(--accent-contrast)] animate-spin" />
                                    <span>평가중..</span>
                                    <span className="text-xs tabular-nums">{progress}%</span>
                                </>
                            ) : (
                                'AI분석하기'
                            )}
                        </button>
                    </div>
                )}

                <div className="mt-10 border-t border-[color:var(--border)] pt-8">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-[color:var(--text)]">최종 보고서 목록</h3>
                        <span className="text-xs font-semibold text-[color:var(--text-soft)]">
                            {finalReportsAll.length}건
                        </span>
                    </div>

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {finalReports.map((report) => (
                                <div
                                    key={`final-${report.reportId}`}
                                    className="relative rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_12px_30px_var(--shadow)] overflow-hidden text-left cursor-pointer"
                                    onClick={() => openFinalReport(report)}
                                >
                                    <div className="absolute top-3 right-3 z-10 text-[10px] px-2 py-1 rounded-full bg-[color:var(--surface-muted)] text-[color:var(--text-soft)]">
                                        최종
                                    </div>
                                    <div className="h-32 bg-[color:var(--surface-muted)] flex items-center justify-center text-sm text-[color:var(--text-soft)] overflow-hidden">
                                        {report.recipeImageBase64 ? (
                                            <img src={report.recipeImageBase64} alt={report.recipeTitle} className="h-full w-full object-cover" />
                                        ) : (
                                            '이미지 영역'
                                        )}
                                    </div>
                                    <div className="px-4 py-3">
                                        <p className="text-sm font-semibold text-[color:var(--text)]">{report.recipeTitle}</p>
                                        <p className="mt-2 text-xs text-[color:var(--text-muted)] line-clamp-3">
                                            {(report.summary ? report.summary.split('||')[0].trim() : '비교 보고서 정보가 없습니다.') }
                                        </p>
                                    </div>
                                </div>
                            ))}
                    </div>

                    {!loading && finalReportsAll.length === 0 && (
                        <p className="mt-6 text-sm text-[color:var(--text-muted)]">등록된 최종 보고서가 없습니다.</p>
                    )}

                    {!loading && finalReportsAll.length > 0 && finalReports.length === 0 && (
                        <p className="mt-6 text-sm text-[color:var(--text-muted)]">일치하는 최종 보고서가 없습니다.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FinalSelectionPage;

