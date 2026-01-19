import React from 'react';
import Sidebar from './Sidebar';
import ThemeToggle from '../common/ThemeToggle';

const MainLayout = ({ children }) => {
    return (
        <div
            className="min-h-screen text-[color:var(--text)] flex flex-col md:flex-row"
            style={{ background: 'linear-gradient(135deg, var(--bg-1), var(--bg-2), var(--bg-3))' }}
        >
            {/* 고정 사이드바 */}
            <Sidebar />

            {/* 메인 콘텐츠 영역 */}
            <div className="flex-1 p-6 md:p-10">
                <div className="flex justify-end mb-6">
                    <ThemeToggle />
                </div>
                {children}
            </div>
        </div>
    );
};

export default MainLayout;
