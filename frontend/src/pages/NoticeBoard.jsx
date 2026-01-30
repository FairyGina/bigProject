
import React from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

const initialNotices = [];

const maskName = (name) => {
    if (!name) {
        return '*';
    }
    return name.length <= 1 ? '*' : `${name.slice(0, -1)}*`;
};

const formatDate = (value) => {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }
    const year = String(date.getFullYear()).padStart(4, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatTime = (value) => {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

const formatListDate = (value) => {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }
    const now = new Date();
    const sameDay = now.getFullYear() === date.getFullYear()
        && now.getMonth() === date.getMonth()
        && now.getDate() === date.getDate();
    return sameDay ? formatTime(date) : formatDate(date);
};

const formatDetailDateTime = (value) => {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }
    return `${formatDate(date)} ${formatTime(date)}`;
};

const normalizeNotice = (notice) => {
    const createdAt = notice.createdAt ?? notice.created_at ?? notice.date ?? notice.createdDate;
    return {
        id: notice.id ?? notice.noticeId ?? notice.notice_id,
        title: notice.title ?? notice.noticeTitle ?? '',
        content: notice.content ?? notice.noticeContent ?? '',
        authorName: notice.authorName ?? notice.author ?? notice.userName ?? notice.writerName ?? '',
        authorId: notice.authorId ?? notice.userId ?? notice.writerId ?? notice.user_id ?? null,
        createdAt,
    };
};

const normalizeComment = (comment) => {
    const createdAt = comment.createdAt ?? comment.created_at ?? comment.date ?? comment.createdDate;
    return {
        id: comment.id ?? comment.commentId ?? comment.comment_id,
        content: comment.content ?? comment.comment ?? '',
        authorName: comment.authorName ?? comment.author ?? comment.userName ?? comment.writerName ?? '',
        authorId: comment.authorId ?? comment.userId ?? comment.writerId ?? comment.user_id ?? null,
        createdAt,
    };
};

const NoticeBoard = () => {
    const { user } = useAuth();
    const rawName = user?.userName || localStorage.getItem('userName') || '김에이블러';
    const maskedName = maskName(rawName);
    const [notices, setNotices] = React.useState([]);
    const [selectedId, setSelectedId] = React.useState(null);
    const [selectedNotice, setSelectedNotice] = React.useState(null);
    const [showDetail, setShowDetail] = React.useState(false);
    const [showForm, setShowForm] = React.useState(false);
    const [title, setTitle] = React.useState('');
    const [content, setContent] = React.useState('');
    const [searchField, setSearchField] = React.useState('title');
    const [searchTerm, setSearchTerm] = React.useState('');
    const [page, setPage] = React.useState(1);
    const [loadingNotices, setLoadingNotices] = React.useState(true);
    const [noticeError, setNoticeError] = React.useState('');
    const [detailLoading, setDetailLoading] = React.useState(false);
    const [detailError, setDetailError] = React.useState('');
    const [comments, setComments] = React.useState([]);
    const [commentInput, setCommentInput] = React.useState('');
    const [commentEditingId, setCommentEditingId] = React.useState(null);
    const [commentEditingText, setCommentEditingText] = React.useState('');
    const [editMode, setEditMode] = React.useState(false);
    const [editTitle, setEditTitle] = React.useState('');
    const [editContent, setEditContent] = React.useState('');
    const [isSubmittingNotice, setIsSubmittingNotice] = React.useState(false);
    const [isSavingNotice, setIsSavingNotice] = React.useState(false);
    const [isSavingComment, setIsSavingComment] = React.useState(false);
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filteredNotices = normalizedSearch
        ? notices.filter((notice) => {
            const haystack = searchField === 'content' ? notice.content : notice.title;
            return (haystack || '').toLowerCase().includes(normalizedSearch);
        })
        : notices;
    const pageSize = 5;
    const totalPages = Math.max(1, Math.ceil(filteredNotices.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const pagedNotices = filteredNotices.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const isLoggedIn = Boolean(user || localStorage.getItem('accessToken'));
    const isEditingComment = commentEditingId !== null;

    const refreshCsrf = React.useCallback(async () => {
        try {
            await axiosInstance.get('/api/csrf');
        } catch (error) {
            // ignore csrf refresh failures
        }
    }, []);

    const isOwner = React.useCallback(
        (authorId, authorName) => {
            if (!rawName) {
                return false;
            }
            if (authorId && user?.userId) {
                return authorId === user.userId;
            }
            if (authorName) {
                return authorName === rawName;
            }
            return false;
        },
        [rawName, user]
    );

    const loadNotices = React.useCallback(async () => {
        setLoadingNotices(true);
        setNoticeError('');
        try {
            const response = await axiosInstance.get('/api/notices');
            const data = Array.isArray(response.data) ? response.data : response.data?.data ?? [];
            const normalized = data.map(normalizeNotice);
            if (normalized.length) {
                setNotices(normalized);
                if (!selectedId) {
                    setSelectedId(normalized[0]?.id ?? null);
                }
            } else {
                setNotices(initialNotices.map(normalizeNotice));
            }
        } catch (error) {
            console.error(error);
            setNoticeError('공지사항을 불러오지 못했습니다.');
            setNotices(initialNotices.map(normalizeNotice));
        } finally {
            setLoadingNotices(false);
        }
    }, [selectedId]);

    const loadNoticeDetail = React.useCallback(async (noticeId) => {
        if (!noticeId) {
            return;
        }
        setDetailLoading(true);
        setDetailError('');
        setComments([]);
        try {
            const response = await axiosInstance.get(`/api/notices/${noticeId}`);
            const detail = normalizeNotice(response.data?.data ?? response.data);
            setSelectedNotice(detail);
        } catch (error) {
            console.error(error);
            setDetailError('공지사항을 불러오지 못했습니다.');
        }
        try {
            const response = await axiosInstance.get(`/api/notices/${noticeId}/comments`);
            const data = Array.isArray(response.data) ? response.data : response.data?.data ?? [];
            setComments(data.map(normalizeComment));
        } catch (error) {
            console.error(error);
            setDetailError((prev) => prev || '댓글을 불러오지 못했습니다.');
        } finally {
            setDetailLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadNotices();
    }, [loadNotices]);

    React.useEffect(() => {
        setPage(1);
    }, [searchField, searchTerm]);

    const handleOpenDetail = (notice) => {
        setSelectedId(notice.id);
        setSelectedNotice(notice);
        setShowDetail(true);
        setEditMode(false);
        setCommentInput('');
        setCommentEditingId(null);
        setCommentEditingText('');
        loadNoticeDetail(notice.id);
    };

    const handleSubmit = async () => {
        if (!isLoggedIn || !title.trim() || !content.trim()) {
            return;
        }
        setIsSubmittingNotice(true);
        try {
            await refreshCsrf();
            const response = await axiosInstance.post('/api/notices', {
                title: title.trim(),
                content: content.trim(),
            });
            const created = normalizeNotice(response.data?.data ?? response.data);
            const fallbackNotice = {
                ...created,
                id: created.id ?? Date.now(),
                authorName: created.authorName || rawName,
                createdAt: created.createdAt || new Date().toISOString(),
                title: created.title || title.trim(),
                content: created.content || content.trim(),
            };
            setNotices((prev) => [fallbackNotice, ...prev]);
            setSelectedId(fallbackNotice.id);
            setSelectedNotice(fallbackNotice);
            setShowDetail(true);
            setComments([]);
            setDetailError('');
            setTitle('');
            setContent('');
            setShowForm(false);
            setPage(1);
            loadNoticeDetail(fallbackNotice.id);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmittingNotice(false);
        }
    };

    const handleStartEditNotice = () => {
        if (!selectedNotice) {
            return;
        }
        setEditMode(true);
        setEditTitle(selectedNotice.title ?? '');
        setEditContent(selectedNotice.content ?? '');
    };

    const handleSaveNotice = async () => {
        if (!selectedNotice || !editTitle.trim() || !editContent.trim()) {
            return;
        }
        setIsSavingNotice(true);
        try {
            await refreshCsrf();
            const response = await axiosInstance.put(`/api/notices/${selectedNotice.id}`, {
                title: editTitle.trim(),
                content: editContent.trim(),
            });
            const updated = normalizeNotice(response.data?.data ?? response.data);
            const merged = {
                ...selectedNotice,
                title: updated.title || editTitle.trim(),
                content: updated.content || editContent.trim(),
                createdAt: updated.createdAt || selectedNotice.createdAt,
            };
            setSelectedNotice(merged);
            setNotices((prev) => prev.map((notice) => (notice.id === merged.id ? { ...notice, ...merged } : notice)));
            setEditMode(false);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSavingNotice(false);
        }
    };

    const handleDeleteNotice = async () => {
        if (!selectedNotice) {
            return;
        }
        const confirmed = window.confirm('공지사항을 삭제하시겠습니까?');
        if (!confirmed) {
            return;
        }
        setIsSavingNotice(true);
        try {
            await refreshCsrf();
            await axiosInstance.delete(`/api/notices/${selectedNotice.id}`);
            setNotices((prev) => prev.filter((notice) => notice.id !== selectedNotice.id));
            setShowDetail(false);
            setSelectedNotice(null);
            setComments([]);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSavingNotice(false);
        }
    };

    const handleAddComment = async () => {
        if (!isLoggedIn || !selectedNotice || !commentInput.trim()) {
            return;
        }
        setIsSavingComment(true);
        try {
            await refreshCsrf();
            const response = await axiosInstance.post(`/api/notices/${selectedNotice.id}/comments`, {
                content: commentInput.trim(),
            });
            const created = normalizeComment(response.data?.data ?? response.data);
            const fallbackComment = {
                ...created,
                id: created.id ?? Date.now(),
                authorName: created.authorName || rawName,
                createdAt: created.createdAt || new Date().toISOString(),
                content: created.content || commentInput.trim(),
            };
            setComments((prev) => [...prev, fallbackComment]);
            setCommentInput('');
        } catch (error) {
            console.error(error);
        } finally {
            setIsSavingComment(false);
        }
    };

    const handleStartEditComment = (comment) => {
        setCommentEditingId(comment.id);
        setCommentEditingText(comment.content);
        setEditMode(false);
    };

    const handleSaveComment = async (comment) => {
        if (!selectedNotice || !commentEditingText.trim()) {
            return;
        }
        setIsSavingComment(true);
        try {
            await refreshCsrf();
            const response = await axiosInstance.put(`/api/notices/${selectedNotice.id}/comments/${comment.id}`, {
                content: commentEditingText.trim(),
            });
            const updated = normalizeComment(response.data?.data ?? response.data);
            const merged = {
                ...comment,
                content: updated.content || commentEditingText.trim(),
                createdAt: updated.createdAt || comment.createdAt,
            };
            setComments((prev) => prev.map((item) => (item.id === comment.id ? merged : item)));
            setCommentEditingId(null);
            setCommentEditingText('');
        } catch (error) {
            console.error(error);
        } finally {
            setIsSavingComment(false);
        }
    };

    const handleDeleteComment = async (comment) => {
        if (!selectedNotice) {
            return;
        }
        const confirmed = window.confirm('댓글을 삭제하시겠습니까?');
        if (!confirmed) {
            return;
        }
        setIsSavingComment(true);
        try {
            await refreshCsrf();
            await axiosInstance.delete(`/api/notices/${selectedNotice.id}/comments/${comment.id}`);
            setComments((prev) => prev.filter((item) => item.id !== comment.id));
        } catch (error) {
            console.error(error);
        } finally {
            setIsSavingComment(false);
        }
    };

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
                        </div>
                        <div
                            className="h-10 w-10 rounded-full shadow-[0_10px_20px_var(--shadow)]"
                            style={{ background: 'linear-gradient(135deg, var(--avatar-1), var(--avatar-2))' }}
                        />
                    </div>
                </div>

                <div className="mt-8 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_12px_30px_var(--shadow)] overflow-hidden min-h-[520px]">
                    <div className="grid w-full grid-cols-[64px_1fr_auto] gap-4 px-4 py-3 text-sm font-semibold text-[color:var(--text)] bg-[color:var(--surface-muted)]">
                        <span>번호</span>
                        <span>제목</span>
                        <span className="min-w-[140px] justify-self-end text-right">작성자 | 날짜</span>
                    </div>
                    <div className="divide-y divide-[color:var(--border)]">
                        {loadingNotices && (
                            <div className="px-4 py-6 text-sm text-[color:var(--text-muted)]">공지사항을 불러오는 중입니다.</div>
                        )}
                        {!loadingNotices && searchTerm.trim().length > 0 && filteredNotices.length === 0 && (
                            <div className="px-4 py-6 text-sm text-[color:var(--text-muted)]">No notices match your search.</div>
                        )}
                        {!loadingNotices && noticeError && (
                            <div className="px-4 py-3 text-xs text-[color:var(--danger)] bg-[color:var(--danger-bg)]">
                                {noticeError}
                            </div>
                        )}
                        {!loadingNotices && pagedNotices.map((notice) => (
                            <button
                                type="button"
                                key={notice.id}
                                onClick={() => handleOpenDetail(notice)}
                                className={`grid w-full grid-cols-[64px_1fr_auto] gap-4 px-4 py-3 text-sm text-left transition ${selectedId === notice.id && showDetail
                                    ? 'bg-[color:var(--surface-muted)]'
                                    : 'bg-transparent hover:bg-[color:var(--surface-muted)]'
                                    }`}
                            >
                                <span>{notice.id}</span>
                                <span>{notice.title}</span>
                                <span className="min-w-[140px] justify-self-end text-right text-[color:var(--text-muted)]">
                                    {maskName(notice.authorName)} | {formatListDate(notice.createdAt)}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setPage(Math.max(1, currentPage - 1))}
                            className="w-8 h-8 rounded-md border border-[color:var(--border)] text-sm text-[color:var(--text)] hover:bg-[color:var(--surface-muted)] transition"
                        >
                            &lt;
                        </button>
                        {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                            <button
                                key={pageNum}
                                type="button"
                                onClick={() => setPage(pageNum)}
                                className={`w-8 h-8 rounded-md border border-[color:var(--border)] text-sm transition ${pageNum === currentPage
                                    ? 'bg-[color:var(--surface-muted)] text-[color:var(--text)]'
                                    : 'text-[color:var(--text-muted)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text)]'
                                    }`}
                            >
                                {pageNum}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                            className="w-8 h-8 rounded-md border border-[color:var(--border)] text-sm text-[color:var(--text)] hover:bg-[color:var(--surface-muted)] transition"
                        >
                            &gt;
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowForm((prev) => !prev)}
                        className="px-4 py-2 rounded-xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-sm text-[color:var(--text)] hover:bg-[color:var(--surface)] transition"
                    >
                        {showForm ? '작성 닫기' : '글 작성'}
                    </button>
                



                                </div>

                <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-1 items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 shadow-[0_10px_25px_var(--shadow)]">
                        <select
                            value={searchField}
                            onChange={(event) => setSearchField(event.target.value)}
                            className="bg-transparent text-sm text-[color:var(--text)] focus:outline-none"
                        >
                            <option value="title">제목</option>
                            <option value="content">내용</option>
                        </select>
                        <span className="h-6 w-px bg-[color:var(--border)]" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="공지사항 검색"
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

                {showForm && (
                    <div className="mt-6 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_12px_30px_var(--shadow)]">
                        <h3 className="text-lg font-semibold text-[color:var(--text)] mb-4">공지사항 작성</h3>
                        <div className="space-y-3">
                            <input
                                type="text"
                                placeholder="제목"
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                                className="w-full p-3 rounded-xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                            />
                            <textarea
                                rows="4"
                                placeholder="내용"
                                value={content}
                                onChange={(event) => setContent(event.target.value)}
                                className="w-full p-3 rounded-xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                            />
                            {!isLoggedIn && (
                                <p className="text-xs text-[color:var(--danger)]">로그인 후 작성할 수 있습니다.</p>
                            )}
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={!isLoggedIn || isSubmittingNotice}
                                    className="px-4 py-2 rounded-xl bg-[color:var(--accent)] text-[color:var(--accent-contrast)] text-sm font-semibold hover:bg-[color:var(--accent-strong)] transition disabled:opacity-50"
                                >
                                    {isSubmittingNotice ? '등록 중...' : '등록'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showDetail && selectedNotice && (
                    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-6 py-0">
                        <div className="w-full max-w-2xl rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_20px_60px_var(--shadow)] h-full max-h-none overflow-hidden flex flex-col">
                            <div className="flex items-start justify-between gap-4 px-6 py-5 bg-[color:var(--surface)] border-b border-[color:var(--border)] sticky top-0 z-10">
                                <div className="flex-1">
                                    <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-soft)]">공지사항 상세</p>
                                    {editMode ? (
                                        <div className="mt-3 space-y-3">
                                            <input
                                                type="text"
                                                value={editTitle}
                                                onChange={(event) => setEditTitle(event.target.value)}
                                                className="w-full p-3 rounded-xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                                            />
                                            <textarea
                                                rows="4"
                                                value={editContent}
                                                onChange={(event) => setEditContent(event.target.value)}
                                                className="w-full p-3 rounded-xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-[color:var(--text)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            <h3 className="text-xl font-semibold text-[color:var(--text)]">{selectedNotice.title}</h3>
                                            <p className="text-sm text-[color:var(--text-muted)] mt-2">
                                                {maskName(selectedNotice.authorName)} | {formatDetailDateTime(selectedNotice.createdAt)}
                                            </p>
                                        </>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2 items-center justify-end">
                                    {!isEditingComment && isOwner(selectedNotice.authorId, selectedNotice.authorName) && !editMode && (
                                        <button
                                            type="button"
                                            onClick={handleStartEditNotice}
                                            className="px-3 py-1 rounded-lg bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-sm text-[color:var(--text)] hover:bg-[color:var(--surface)] transition"
                                        >
                                            수정
                                        </button>
                                    )}
                                    {!isEditingComment && isOwner(selectedNotice.authorId, selectedNotice.authorName) && editMode && (
                                        <button
                                            type="button"
                                            onClick={handleSaveNotice}
                                            disabled={isSavingNotice}
                                            className="px-3 py-1 rounded-lg bg-[color:var(--accent)] text-[color:var(--accent-contrast)] text-sm hover:bg-[color:var(--accent-strong)] transition disabled:opacity-50"
                                        >
                                            {isSavingNotice ? '저장 중...' : '저장'}
                                        </button>
                                    )}
                                    {!isEditingComment && isOwner(selectedNotice.authorId, selectedNotice.authorName) && (
                                        <button
                                            type="button"
                                            onClick={handleDeleteNotice}
                                            disabled={isSavingNotice}
                                            className="px-3 py-1 rounded-lg bg-[color:var(--danger-bg)] text-[color:var(--danger)] border border-[color:var(--danger)] text-sm hover:bg-[color:var(--danger)] hover:text-white transition disabled:opacity-50"
                                        >
                                            삭제
                                        </button>
                                    )}
                                    {!isEditingComment && editMode && (
                                        <button
                                            type="button"
                                            onClick={() => setEditMode(false)}
                                            className="px-3 py-1 rounded-lg bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-sm text-[color:var(--text)] hover:bg-[color:var(--surface)] transition"
                                        >
                                            취소
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setShowDetail(false)}
                                        className="px-3 py-1 rounded-lg bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-sm text-[color:var(--text)] hover:bg-[color:var(--surface)] transition"
                                    >
                                        닫기
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-hidden px-6 py-5 flex flex-col">
                                {detailLoading && (
                                    <div className="text-sm text-[color:var(--text-muted)]">상세 정보를 불러오는 중입니다.</div>
                                )}
                                {detailError && (
                                    <div className="mt-4 text-sm text-[color:var(--danger)]">{detailError}</div>
                                )}
                                {!editMode && !isEditingComment && (
                                    <div className="mt-6 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4 text-sm text-[color:var(--text)]">
                                        {selectedNotice.content}
                                    </div>
                                )}

                                {!editMode && (
                                    <div className="mt-6 border-t border-[color:var(--border)] pt-5 flex flex-col flex-1 min-h-0">
                                        <h4 className="text-sm font-semibold text-[color:var(--text)] mb-3">댓글</h4>
                                        <div className="space-y-3 flex-1 overflow-y-auto pr-2 min-h-0">
                                            {comments.length === 0 && (
                                                <p className="text-sm text-[color:var(--text-muted)]">아직 댓글이 없습니다.</p>
                                            )}
                                            {comments.map((comment) => (
                                                <div key={comment.id} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="text-sm font-semibold text-[color:var(--text)]">
                                                            {maskName(comment.authorName)}
                                                            <span className="ml-2 text-xs text-[color:var(--text-muted)]">{formatDetailDateTime(comment.createdAt)}</span>
                                                        </div>
                                                        {isOwner(comment.authorId, comment.authorName) && (
                                                            <div className="flex items-center gap-2 text-xs">
                                                                {commentEditingId !== comment.id ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleStartEditComment(comment)}
                                                                        className="text-[color:var(--text-soft)] hover:text-[color:var(--text)] transition"
                                                                    >
                                                                        수정
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleSaveComment(comment)}
                                                                        disabled={isSavingComment}
                                                                        className="text-[color:var(--accent)] hover:text-[color:var(--accent-strong)] transition disabled:opacity-50"
                                                                    >
                                                                        저장
                                                                    </button>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteComment(comment)}
                                                                    disabled={isSavingComment}
                                                                    className="text-[color:var(--danger)] hover:text-[color:var(--danger)] transition disabled:opacity-50"
                                                                >
                                                                    삭제
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {commentEditingId === comment.id ? (
                                                        <textarea
                                                            rows="3"
                                                            value={commentEditingText}
                                                            onChange={(event) => setCommentEditingText(event.target.value)}
                                                            className="mt-3 w-full p-3 rounded-lg bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-sm text-[color:var(--text)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                                                        />
                                                    ) : (
                                                        <p className="mt-2 text-sm text-[color:var(--text)]">{comment.content}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {!isEditingComment && (
                                            <div className="mt-4">
                                                <textarea
                                                    rows="3"
                                                    value={commentInput}
                                                    onChange={(event) => setCommentInput(event.target.value)}
                                                    placeholder={isLoggedIn ? '댓글을 입력해주세요.' : '로그인 후 댓글을 작성할 수 있습니다.'}
                                                    disabled={!isLoggedIn}
                                                    className="w-full p-3 rounded-xl bg-[color:var(--surface-muted)] border border-[color:var(--border)] text-sm text-[color:var(--text)] placeholder:text-[color:var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] disabled:opacity-60"
                                                />
                                                <div className="mt-3 flex justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={handleAddComment}
                                                        disabled={!isLoggedIn || isSavingComment}
                                                        className="px-4 py-2 rounded-xl bg-[color:var(--accent)] text-[color:var(--accent-contrast)] text-sm font-semibold hover:bg-[color:var(--accent-strong)] transition disabled:opacity-50"
                                                    >
                                                        {isSavingComment ? '등록 중...' : '댓글 등록'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NoticeBoard;
