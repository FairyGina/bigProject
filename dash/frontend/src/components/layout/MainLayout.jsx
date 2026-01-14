import React from 'react';
import Sidebar from './Sidebar';

const MainLayout = ({ children }) => {
    return (
        <div className="min-h-screen bg-[#121212] text-white flex">
            {/* 고정된 사이드바 */}
            <Sidebar />

            {/* 메인 컨텐츠 영역 - 사이드바 너비(w-72 = 18rem = 288px) 만큼 마진 적용 */}
            <div className="flex-1 ml-0 lg:ml-72 p-6 transition-all duration-300">
                {children}
            </div>
        </div>
    );
};

export default MainLayout;
