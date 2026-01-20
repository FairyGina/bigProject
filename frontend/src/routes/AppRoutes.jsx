import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import SignUpPage from '../pages/SignUpPage';
import FindPasswordPage from '../pages/FindPasswordPage';
import MainBoard from '../pages/MainBoard';
import UserBoard from '../pages/UserBoard';
import AICreateRecipe from '../pages/AICreateRecipe';
import UserCreateRecipe from '../pages/UserCreateRecipe';
import NoticeBoard from '../pages/NoticeBoard';
import RecipeReport from '../pages/RecipeReport';
import NotFound from '../pages/NotFound';
import MainLayout from '../components/layout/MainLayout';
import PasswordCheckPage from '../pages/PasswordCheckPage';
import UserProfilePage from '../pages/UserProfilePage';

// 인증이 필요한 라우트 보호 컴포넌트
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div>Loading...</div>; // 또는 LoadingSpinner
    }

    if (!user) {
        return <Navigate to="/" replace />;
    }

    return children;
};

// 로그인 상태에서 접근 불가한 라우트 (로그인/회원가입 등)
const PublicOnlyRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div>Loading...</div>;
    }

    if (user) {
        return <Navigate to="/mainboard" replace />;
    }

    return children;
};

const AppRoutes = () => {
    return (
        <Routes>
            {/* 공개 라우트 */}
            <Route path="/" element={<PublicOnlyRoute><LandingPage /></PublicOnlyRoute>} />

            <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
            <Route path="/signup" element={<PublicOnlyRoute><SignUpPage /></PublicOnlyRoute>} />
            <Route path="/find-password" element={<PublicOnlyRoute><FindPasswordPage /></PublicOnlyRoute>} />

            {/* 보호된 라우트 */}
            <Route
                path="/mainboard/*"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <Routes>
                                <Route path="/" element={<MainBoard />} />
                                <Route path="notice" element={<NoticeBoard />} />
                                <Route path="user-hub" element={<Navigate to="user-hub/recipes" replace />} />
                                <Route path="user-hub/recipes" element={<UserBoard />} />
                                <Route path="user-hub/password-check" element={<PasswordCheckPage />} />
                                <Route path="user-hub/profile" element={<UserProfilePage />} />
                                <Route path="recipe-report" element={<RecipeReport />} />
                                <Route path="create/ai" element={<AICreateRecipe />} />
                                <Route path="create/manual" element={<UserCreateRecipe />} />
                                <Route path="settings/password-check" element={<PasswordCheckPage />} />
                                <Route path="settings/profile" element={<UserProfilePage />} />
                            </Routes>
                        </MainLayout>
                    </ProtectedRoute>
                }
            />

            {/* 404 라우트 */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
};

export default AppRoutes;
