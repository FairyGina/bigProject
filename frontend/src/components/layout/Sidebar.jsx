import React from 'react';
import { ChevronDown, ChevronRight, LogOut } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const menuItems = [
    { title: '공지사항', path: '/mainboard/notice' },
    { title: '레시피 허브', path: '/mainboard' },
];

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();
    const userHubActive = location.pathname.startsWith('/mainboard/user-hub');
    const createActive = location.pathname.startsWith('/mainboard/create');
    const [userHubOpen, setUserHubOpen] = React.useState(userHubActive);
    const [createOpen, setCreateOpen] = React.useState(createActive);

    React.useEffect(() => {
        if (userHubActive) {
            setUserHubOpen(true);
        }
        if (createActive) {
            setCreateOpen(true);
        }
    }, [userHubActive, createActive]);

    const isActive = (path) => {
        if (!path) {
            return false;
        }
        if (path === '/mainboard') {
            return location.pathname === '/mainboard' || location.pathname === '/mainboard/';
        }
        return location.pathname.startsWith(path);
    };

    const handleLogout = () => {
        if (window.confirm('로그아웃 하시겠습니까?')) {
            logout();
            navigate('/');
        }
    };

    return (
        <aside className="w-full md:w-64 md:h-screen md:sticky md:top-0 bg-[color:var(--sidebar-bg)] border-r border-[color:var(--sidebar-border)]">
            <div className="h-full p-6 flex flex-col gap-8">
                <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-soft)]">프로그램명</p>
                    <div className="h-px bg-[color:var(--border-strong)]" />
                </div>

                <nav className="space-y-2">
                    {menuItems.map((item) => {
                        const active = isActive(item.path);
                        return (
                            <button
                                key={item.title}
                                type="button"
                                onClick={() => navigate(item.path)}
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
                        onClick={() => setUserHubOpen((prev) => !prev)}
                        className={`w-full text-left px-4 py-3 rounded-xl transition ${userHubActive
                            ? 'bg-[color:var(--surface)] shadow-[0_10px_30px_var(--shadow)] text-[color:var(--text)]'
                            : 'text-[color:var(--text-muted)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text)]'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">유저 허브</span>
                            {userHubOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                    </button>
                    {userHubOpen && (
                        <div className="ml-4 space-y-1">
                            <button
                                type="button"
                                onClick={() => navigate('/mainboard/user-hub/recipes')}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${isActive('/mainboard/user-hub/recipes')
                                    ? 'bg-[color:var(--surface-muted)] text-[color:var(--text)]'
                                    : 'text-[color:var(--text-muted)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text)]'
                                    }`}
                            >
                                유저 레시피
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/mainboard/user-hub/password-check')}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${isActive('/mainboard/user-hub/profile')
                                    ? 'bg-[color:var(--surface-muted)] text-[color:var(--text)]'
                                    : 'text-[color:var(--text-muted)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text)]'
                                    }`}
                            >
                                내 정보 수정
                            </button>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => setCreateOpen((prev) => !prev)}
                        className={`w-full text-left px-4 py-3 rounded-xl transition ${createActive
                            ? 'bg-[color:var(--surface)] shadow-[0_10px_30px_var(--shadow)] text-[color:var(--text)]'
                            : 'text-[color:var(--text-muted)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text)]'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">레시피 생성하기</span>
                            {createOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                    </button>
                    {createOpen && (
                        <div className="ml-4 space-y-1">
                            <button
                                type="button"
                                onClick={() => navigate('/mainboard/create/ai')}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${isActive('/mainboard/create/ai')
                                    ? 'bg-[color:var(--surface-muted)] text-[color:var(--text)]'
                                    : 'text-[color:var(--text-muted)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text)]'
                                    }`}
                            >
                                AI로 생성하기
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/mainboard/create/manual')}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${isActive('/mainboard/create/manual')
                                    ? 'bg-[color:var(--surface-muted)] text-[color:var(--text)]'
                                    : 'text-[color:var(--text-muted)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text)]'
                                    }`}
                            >
                                직접 등록하기
                            </button>
                        </div>
                    )}
                </nav>

                <div className="mt-auto">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 text-[color:var(--danger)] hover:bg-[color:var(--danger-bg)] rounded-xl transition"
                    >
                        <LogOut size={18} />
                        <span className="text-sm font-semibold">로그아웃</span>
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
