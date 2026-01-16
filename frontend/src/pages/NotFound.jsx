import React from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/common/ThemeToggle';

const NotFound = () => {
    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center text-[color:var(--text)] px-4"
            style={{ background: 'linear-gradient(135deg, var(--bg-1), var(--bg-2), var(--bg-3))' }}
        >
            <ThemeToggle className="fixed top-6 right-6 z-50" />
            <h1 className="text-9xl font-bold text-[color:var(--text-soft)]">404</h1>
            <h2 className="text-3xl font-semibold mt-4 mb-6">페이지를 찾을 수 없습니다</h2>
            <p className="text-[color:var(--text-muted)] mb-8 text-center max-w-md">
                요청하신 페이지가 존재하지 않거나, 이동되었을 수 있습니다.
            </p>
            <Link
                to="/"
                className="px-6 py-3 bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-[color:var(--accent-contrast)] rounded-lg font-medium transition-colors"
            >
                메인으로 돌아가기
            </Link>
        </div>
    );
};

export default NotFound;
