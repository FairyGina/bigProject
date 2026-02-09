import React, { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import axiosInstance from '../axiosConfig';

const RemoteMeetingPage = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeReport, setActiveReport] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [connected, setConnected] = useState(false);
    const clientRef = useRef(null);
    const subscriptionRef = useRef(null);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                setLoading(true);
                const res = await axiosInstance.get('/report/list');
                const all = res.data || [];
                setReports(all.filter((item) => (item.reportType || 'AI') === 'FINAL_EVALUATION'));
            } catch (err) {
                console.error('최종 보고서 목록을 불러오지 못했습니다.', err);
                setError('최종 보고서 목록을 불러오지 못했습니다.');
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, []);

    useEffect(() => {
        const connectSocket = async () => {
            if (!activeReport?.reportId) {
                return;
            }
            try {
                const history = await axiosInstance.get(`/chat/report/${activeReport.reportId}/messages`);
                setMessages(history.data || []);
            } catch (err) {
                console.error('채팅 내역을 불러오지 못했습니다.', err);
            }

            const token = localStorage.getItem('accessToken');
            const client = new Client({
                webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
                reconnectDelay: 4000,
                connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
                onConnect: () => {
                    setConnected(true);
                    if (subscriptionRef.current) {
                        subscriptionRef.current.unsubscribe();
                    }
                    subscriptionRef.current = client.subscribe(`/topic/report/${activeReport.reportId}`, (message) => {
                        const payload = JSON.parse(message.body);
                        setMessages((prev) => [...prev, payload]);
                    });
                },
                onDisconnect: () => setConnected(false),
                onStompError: () => setConnected(false),
            });
            client.activate();
            clientRef.current = client;
        };

        connectSocket();

        return () => {
            if (subscriptionRef.current) {
                subscriptionRef.current.unsubscribe();
                subscriptionRef.current = null;
            }
            if (clientRef.current) {
                clientRef.current.deactivate();
                clientRef.current = null;
            }
            setConnected(false);
        };
    }, [activeReport?.reportId]);

    const selectReport = (report) => {
        setActiveReport(report);
    };

    const sendMessage = () => {
        if (!input.trim() || !activeReport?.reportId || !clientRef.current) {
            return;
        }
        clientRef.current.publish({
            destination: '/app/chat.send',
            body: JSON.stringify({
                reportId: activeReport.reportId,
                content: input.trim(),
            }),
        });
        setInput('');
    };

    return (
        <div className="rounded-[2.5rem] bg-[color:var(--surface)]/90 border border-[color:var(--border)] shadow-[0_30px_80px_var(--shadow)] p-8 md:p-10 backdrop-blur space-y-8">
            <div className="flex flex-col gap-2">
                <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--text-soft)]">최종 레시피 선정</p>
                <h2 className="text-2xl md:text-3xl font-semibold text-[color:var(--text)]">비대면 회의</h2>
                <p className="text-sm text-[color:var(--text-muted)]">최종 보고서를 기준으로 출시 여부를 논의합니다.</p>
            </div>

            <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-[color:var(--text)]">최종 보고서 목록</h3>
                    <span className="text-xs font-semibold text-[color:var(--text-soft)]">{reports.length}건</span>
                </div>
                {loading && <p className="text-sm text-[color:var(--text-muted)]">불러오는 중...</p>}
                {error && <p className="text-sm text-[color:var(--danger)]">{error}</p>}
                {!loading && !error && reports.length === 0 && (
                    <p className="text-sm text-[color:var(--text-muted)]">등록된 최종 보고서가 없습니다.</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reports.map((report) => {
                        const selected = activeReport?.reportId === report.reportId;
                        return (
                            <button
                                key={report.reportId}
                                type="button"
                                onClick={() => selectReport(report)}
                                className={`relative rounded-2xl border text-left overflow-hidden shadow-[0_10px_25px_var(--shadow)] transition ${selected
                                        ? 'border-[color:var(--accent)] bg-[color:var(--surface-muted)] ring-2 ring-[color:var(--accent)]/40'
                                        : 'border-[color:var(--border)] bg-[color:var(--surface-muted)] hover:border-[color:var(--accent)]/60'
                                    }`}
                            >
                                <div className="absolute top-3 right-3 z-10 text-[10px] px-2 py-1 rounded-full bg-[color:var(--surface)] text-[color:var(--text-soft)]">
                                    최종
                                </div>
                                <div className="h-28 bg-[color:var(--surface)] flex items-center justify-center text-sm text-[color:var(--text-soft)] overflow-hidden">
                                    {report.recipeImageBase64 ? (
                                        <img src={report.recipeImageBase64} alt={report.recipeTitle} className="h-full w-full object-cover" />
                                    ) : (
                                        '이미지 영역'
                                    )}
                                </div>
                                <div className="px-4 py-3">
                                    <p className="text-sm font-semibold text-[color:var(--text)]">{report.recipeTitle}</p>
                                    <p className="mt-2 text-xs text-[color:var(--text-muted)] line-clamp-3">
                                        {(report.summary ? report.summary.split('||')[0].trim() : '비교 보고서 정보가 없습니다.')}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </section>

            {activeReport && (
                <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-soft)]">채팅 회의</p>
                            <h3 className="text-lg font-semibold text-[color:var(--text)]">{activeReport.recipeTitle}</h3>
                        </div>
                        <span className="text-xs text-[color:var(--text-muted)]">{connected ? '연결됨' : '연결 중...'}</span>
                    </div>

                    <div className="h-72 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4 text-sm text-[color:var(--text)] overflow-y-auto space-y-3">
                        {messages.length === 0 && (
                            <p className="text-sm text-[color:var(--text-muted)]">메시지가 없습니다.</p>
                        )}
                        {messages.map((msg) => (
                            <div key={msg.messageId || `${msg.userId}-${msg.createdAt}`} className="flex flex-col gap-1">
                                <div className="text-xs text-[color:var(--text-soft)]">
                                    {msg.userName || msg.userId || '익명'} · {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('ko-KR') : ''}
                                </div>
                                <div className="rounded-xl bg-[color:var(--surface)] border border-[color:var(--border)] px-3 py-2">
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    sendMessage();
                                }
                            }}
                            placeholder="메시지를 입력하세요"
                            className="flex-1 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none"
                        />
                        <button
                            type="button"
                            onClick={sendMessage}
                            className="px-4 py-3 rounded-xl bg-[color:var(--accent)] text-[color:var(--accent-contrast)] text-sm font-semibold"
                        >
                            전송
                        </button>
                    </div>
                </section>
            )}
        </div>
    );
};

export default RemoteMeetingPage;
