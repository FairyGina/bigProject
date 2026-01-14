import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
    return (
        <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center text-white px-4">
            <h1 className="text-9xl font-bold text-gray-700">404</h1>
            <h2 className="text-3xl font-semibold mt-4 mb-6">페이지를 찾을 수 없습니다</h2>
            <p className="text-gray-400 mb-8 text-center max-w-md">
                요청하신 페이지가 존재하지 않거나, 이동되었을 수 있습니다.
            </p>
            <Link
                to="/"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
            >
                메인으로 돌아가기
            </Link>
        </div>
    );
};

export default NotFound;
