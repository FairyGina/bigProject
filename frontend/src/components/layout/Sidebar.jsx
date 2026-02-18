
import React from 'react';
import { ChevronDown, ChevronRight, LogOut, MessageCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const labels = {
    brand: '빈 레시피',
    notice: '공지사항',
    hub: '레시피 허브',
    finalSelection: '최종 레시피 선정',
    remoteMeeting: '비대면 회의',
    userHub: '유저 허브',
    userRecipes: '유저 레시피',
    profileEdit: '내 정보 수정',
    create: '레시피 생성하기',
    aiCreate: 'AI로 생성하기',
    manualCreate: '직접 등록하기',
    logout: '로그아웃',
    confirmNavigation: '작성 중인 내용이 사라집니다. 이동할까요?',
    confirmLogout: '로그아웃 하시겠습니까?',
    testVisual: '데이터 시각화',
    exportAnalysis: '수출 분석',
    consumerAnalysis: '소비자 분석',
};

const menuItems = [
    { title: labels.notice, path: '/mainboard/notice' },
    { title: labels.hub, path: '/mainboard' },
];

const Sidebar = ({ onOpenChatbot }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();

    // Active state logic
    const userHubActive = location.pathname.startsWith('/mainboard/user-hub');
    const createActive = location.pathname.startsWith('/mainboard/create');
    const finalSelectionActive = location.pathname.startsWith('/mainboard/final-selection');
    const visualActive = location.pathname.startsWith('/mainboard/visual');

    const isExactPath = (path) => location.pathname === path || location.pathname === `${path}/`;
    const userHubSelected = isExactPath('/mainboard/user-hub');
    const createSelected = isExactPath('/mainboard/create');
    const finalSelectionSelected = isExactPath('/mainboard/final-selection');

    // Open state management
    const [userHubOpen, setUserHubOpen] = React.useState(userHubActive);
    const [createOpen, setCreateOpen] = React.useState(createActive);
    const [finalSelectionOpen, setFinalSelectionOpen] = React.useState(finalSelectionActive);
    const [visualOpen, setVisualOpen] = React.useState(visualActive);

    React.useEffect(() => {
        if (userHubActive) setUserHubOpen(true);
        if (createActive) setCreateOpen(true);
        if (finalSelectionActive) setFinalSelectionOpen(true);
        if (visualActive) setVisualOpen(true);
    }, [userHubActive, createActive, finalSelectionActive, visualActive]);

    const isActive = (path) => {
        if (!path) {
            return false;
        }
        if (path === '/mainboard') {
            return location.pathname === '/mainboard' || location.pathname === '/mainboard/';
        }
        return location.pathname.startsWith(path);
    };

    const confirmNavigation = () => {
        const isDirty = sessionStorage.getItem('recipeEditDirty') === '1';
        if (!isDirty) {
            return true;
        }
        const confirmed = window.confirm(labels.confirmNavigation);
        if (confirmed) {
            sessionStorage.removeItem('recipeEditDirty');
        }
        return confirmed;
    };

    const handleLogout = () => {
        if (!confirmNavigation()) {
            return;
        }
        if (window.confirm(labels.confirmLogout)) {
            logout();
            navigate('/');
        }
    };

    return (
        <aside className="w-full md:w-64 md:h-screen md:sticky md:top-0 bg-[color:var(--sidebar-bg)] border-r border-[color:var(--sidebar-border)]">
            <div className="h-full p-6 flex flex-col gap-8">
                <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-soft)]">{labels.brand}</p>
                    <div className="h-px bg-[color:var(--border-strong)]" />
                </div>

                <nav className="space-y-2">
                    {menuItems.map((item) => {
                        const active = isActive(item.path);
                        return (
                            <button
                                key={item.title}
                                type="button"
                                onClick={() => {
                                    if (!confirmNavigation()) {
                                        return;
                                    }
                                    navigate(item.path);
                                }}
                                className={`w-full text-left px-4 py-3 rounded-xl transition ${active
                                    ? 'bg-[color:var(--surface)] shadow-[0_10px_30px_var(--shadow)] text-[color:var(--text)]'
                                    : 'text-[color:var(--text-muted)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text)]'
                                    }`}
                            >
                                <span className="text-sm font-semibold">{item.title}</span>
                            </button>
                        );
                    })}

                    <button
                        type="button"
                        onClick={() => setVisualOpen((prev) => !prev)}
                        className={`w-full text-left px-4 py-3 rounded-xl transition ${visualActive
                            ? 'bg-[color:var(--surface)] shadow-[0_10px_30px_var(--shadow)] text-[color:var(--text)]'
                            : 'text-[color:var(--text-muted)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text)]'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">{labels.testVisual}</span>
                            {visualOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                    </button>
                    {visualOpen && (
                        <div className="ml-4 space-y-1">
                            <button
                                type="button"
                                onClick={() => {
                                    if (!confirmNavigation()) {
                                        return;
                                    }
                                    navigate('/mainboard/visual/export-analysis');
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${isActive('/mainboard/visual/export-analysis')
                                    ? 'bg-[color:var(--surface-muted)] text-[color:var(--text)]'
                                    : 'text-[color:var(--text-muted)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text)]'
                                    }`}
                            >
                                {labels.exportAnalysis}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!confirmNavigation()) {
                                        return;
                                    }
                                    navigate('/mainboard/visual/consumer-analysis');
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${isActive('/mainboard/visual/consumer-analysis')
                                    ? 'bg-[color:var(--surface-muted)] text-[color:var(--text)]'
                                    : 'text-[color:var(--text-muted)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text)]'
                                    }`}
                            >
                                {labels.consumerAnalysis}
                            </button>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => setUserHubOpen((prev) => !prev)}
                        className={`w-full text-left px-4 py-3 rounded-xl transition ${userHubSelected
                            ? 'bg-[color:var(--surface)] shadow-[0_10px_30px_var(--shadow)] text-[color:var(--text)]'
                            : 'text-[color:var(--text-muted)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text)]'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">{labels.userHub}</span>
                            {userHubOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                    </button>
                    {userHubOpen && (
                        <div className="ml-4 space-y-1">
                            <button
                                type="button"
                                onClick={() => {
                                    if (!confirmNavigation()) {
                                        return;
                                    }
                                    navigate('/mainboard/user-hub/recipes');
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${isActive('/mainboard/user-hub/recipes')
                                    ? 'bg-[color:var(--surface-muted)] text-[color:var(--text)]'
                                    : 'text-[color:var(--text-muted)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text)]'
                                    }`}
                            >
                                {labels.userRecipes}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!confirmNavigation()) {
                                        return;
                                    }
                                    navigate('/mainboard/user-hub/password-check');
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${isActive('/mainboard/user-hub/profile')
                                    ? 'bg-[color:var(--surface-muted)] text-[color:var(--text)]'
                                    : 'text-[color:var(--text-muted)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text)]'
                                    }`}
                            >
                                {labels.profileEdit}
                            </button>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => setCreateOpen((prev) => !prev)}
                        className={`w-full text-left px-4 py-3 rounded-xl transition ${createSelected
                            ? 'bg-[color:var(--surface)] shadow-[0_10px_30px_var(--shadow)] text-[color:var(--text)]'
                            : 'text-[color:var(--text-muted)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text)]'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">{labels.create}</span>
                            {createOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                    </button>
                    {createOpen && (
                        <div className="ml-4 space-y-1">
                            <button
                                type="button"
                                onClick={() => {
                                    if (!confirmNavigation()) {
                                        return;
                                    }
                                    navigate('/mainboard/create/ai');
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${isActive('/mainboard/create/ai')
                                    ? 'bg-[color:var(--surface-muted)] text-[color:var(--text)]'
                                    : 'text-[color:var(--text-muted)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text)]'
                                    }`}
                            >
                                {labels.aiCreate}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!confirmNavigation()) {
                                        return;
                                    }
                                    navigate('/mainboard/create/manual');
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${isActive('/mainboard/create/manual')
                                    ? 'bg-[color:var(--surface-muted)] text-[color:var(--text)]'
                                    : 'text-[color:var(--text-muted)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text)]'
                                    }`}
                            >
                                {labels.manualCreate}
                            </button>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => setFinalSelectionOpen((prev) => !prev)}
                        className={`w-full text-left px-4 py-3 rounded-xl transition ${finalSelectionSelected
                            ? 'bg-[color:var(--surface)] shadow-[0_10px_30px_var(--shadow)] text-[color:var(--text)]'
                            : 'text-[color:var(--text-muted)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text)]'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">{labels.finalSelection}</span>
                            {finalSelectionOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                    </button>
                    {finalSelectionOpen && (
                        <div className="ml-4 space-y-1">
                            <button
                                type="button"
                                onClick={() => {
                                    if (!confirmNavigation()) {
                                        return;
                                    }
                                    navigate('/mainboard/final-selection');
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${isExactPath('/mainboard/final-selection')
                                    ? 'bg-[color:var(--surface-muted)] text-[color:var(--text)]'
                                    : 'text-[color:var(--text-muted)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text)]'
                                    }`}
                            >
                                {labels.finalSelection}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!confirmNavigation()) {
                                        return;
                                    }
                                    navigate('/mainboard/final-selection/meeting');
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${isActive('/mainboard/final-selection/meeting')
                                    ? 'bg-[color:var(--surface-muted)] text-[color:var(--text)]'
                                    : 'text-[color:var(--text-muted)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text)]'
                                    }`}
                            >
                                {labels.remoteMeeting}
                            </button>
                        </div>
                    )}
                </nav>

                <div className="mt-auto">
                    <button
                        type="button"
                        onClick={onOpenChatbot}
                        className="flex items-center gap-3 w-full px-4 py-3 text-[color:var(--text)] hover:bg-[color:var(--surface-muted)] rounded-xl transition"
                    >
                        <MessageCircle size={18} />
                        <span className="text-sm font-semibold">도움말 챗봇</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 text-[color:var(--danger)] hover:bg-[color:var(--danger-bg)] rounded-xl transition"
                    >
                        <LogOut size={18} />
                        <span className="text-sm font-semibold">{labels.logout}</span>
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;


