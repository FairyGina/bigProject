import React from 'react';
import { useAuth } from '../context/AuthContext';

const notices = [
    { id: 1, title: '글 내용', author: '작성자', date: '26.01.01' },
    { id: 2, title: '글 내용', author: '작성자', date: '26.01.01' },
    { id: 3, title: '글 내용', author: '작성자', date: '26.01.01' },
    { id: 4, title: '글 내용', author: '작성자', date: '26.01.01' },
    { id: 5, title: '글 내용', author: '작성자', date: '26.01.01' },
    { id: 6, title: '글 내용', author: '작성자', date: '26.01.01' },
    { id: 7, title: '글 내용', author: '작성자', date: '26.01.01' },
];

const NoticeBoard = () => {
    const { user } = useAuth();
    const rawName = user?.userName || localStorage.getItem('userName') || '김에이블러';
    const maskedName = rawName.length <= 1 ? '*' : `${rawName.slice(0, -1)}*`;

    return (
        <div className="relative">
            <div className="pointer-events-none absolute -top-16 -right-6 h-64 w-64 rounded-full bg-[color:var(--bg-3)] blur-3xl opacity-70" />
            <div className="pointer-events-none absolute bottom-6 left-16 h-52 w-52 rounded-full bg-[color:var(--surface-muted)] blur-3xl opacity-60" />

            <div className="rounded-[2.5rem] bg-[color:var(--surface)]/90 border border-[color:var(--border)] shadow-[0_30px_80px_var(--shadow)] p-8 md:p-10 backdrop-blur">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--text-soft)] mb-2">공지사항</p>
                        <h2 className="text-2xl md:text-3xl font-semibold text-[color:var(--text)]">홈페이지 공지사항</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-sm font-semibold text-[color:var(--text)]">{maskedName}</p>
                            <p className="text-xs text-[color:var(--text-soft)]">공지 관리</p>
                        </div>
                        <div
                            className="h-10 w-10 rounded-full shadow-[0_10px_20px_var(--shadow)]"
                            style={{ background: 'linear-gradient(135deg, var(--avatar-1), var(--avatar-2))' }}
                        />
                    </div>
                </div>

                <div className="mt-8 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_12px_30px_var(--shadow)] overflow-hidden">
                    <div className="grid grid-cols-[48px_1fr_140px] gap-2 px-4 py-3 text-sm font-semibold text-[color:var(--text)] bg-[color:var(--surface-muted)]">
                        <span>번호</span>
                        <span>제목</span>
                        <span className="text-right">작성자 | 날짜</span>
                    </div>
                    <div className="divide-y divide-[color:var(--border)]">
                        {notices.map((notice) => (
                            <div key={notice.id} className="grid grid-cols-[48px_1fr_140px] gap-2 px-4 py-3 text-sm text-[color:var(--text)]">
                                <span>{notice.id}</span>
                                <span>{notice.title}</span>
                                <span className="text-right text-[color:var(--text-muted)]">
                                    {notice.author} | {notice.date}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                    <div className="flex gap-2">
                        {['<', '1', '2', '3', '4', '5', '>'].map((label) => (
                            <button
                                key={label}
                                type="button"
                                className="w-8 h-8 rounded-md border border-[color:var(--border)] text-sm text-[color:var(--text)] hover:bg-[color:var(--surface-muted)] transition"
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        className="px-4 py-2 rounded-xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-sm text-[color:var(--text)] hover:bg-[color:var(--surface)] transition"
                    >
                        글 작성
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NoticeBoard;
