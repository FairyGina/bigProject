import React from 'react';
import { ChevronDown, ChevronRight, LogOut } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const labels = {
    brand: '\ube48 \ub808\uc2dc\ud53c',
    notice: '\uacf5\uc9c0\uc0ac\ud56d',
    hub: '\ub808\uc2dc\ud53c \ud5c8\ube0c',
    userHub: '\uc720\uc800 \ud5c8\ube0c',
    userRecipes: '\uc720\uc800 \ub808\uc2dc\ud53c',
    profileEdit: '\ub0b4 \uc815\ubcf4 \uc218\uc815',
    create: '\ub808\uc2dc\ud53c \uc0dd\uc131\ud558\uae30',
    aiCreate: 'AI\ub85c \uc0dd\uc131\ud558\uae30',
    manualCreate: '\uc9c1\uc811 \ub4f1\ub85d\ud558\uae30',
    logout: '\ub85c\uadf8\uc544\uc6c3',
    confirmNavigation: '\uc791\uc131 \uc911\uc778 \ub0b4\uc6a9\uc774 \uc0ac\ub77c\uc9d1\ub2c8\ub2e4. \uc774\ub3d9\ud560\uae4c\uc694?',
    confirmLogout: '\ub85c\uadf8\uc544\uc6c3 \ud558\uc2dc\uaca0\uc2b5\ub2c8\uae4c?',
};

const menuItems = [
    { title: labels.notice, path: '/mainboard/notice' },
    { title: labels.hub, path: '/mainboard' },
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
                        onClick={() => setUserHubOpen((prev) => !prev)}
                        className={`w-full text-left px-4 py-3 rounded-xl transition ${userHubActive
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
                        className={`w-full text-left px-4 py-3 rounded-xl transition ${createActive
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
                </nav>

                <div className="mt-auto">
                    <button
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
