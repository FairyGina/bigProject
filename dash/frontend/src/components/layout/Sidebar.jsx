import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Users, Activity, FileText, Settings, ChevronDown, ChevronRight, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../common/GlassCard';
import { useAuth } from '../../context/AuthContext';

const menuItems = [
    {
        title: 'Sample 1',
        icon: LayoutDashboard,
        subItems: ['Sample 1-1', 'Sample 1-2'],
    },
    {
        title: 'Sample 2',
        icon: Users,
        subItems: ['Sample 2-1', 'Sample 2-2'],
    },
    {
        title: 'Sample 3',
        icon: Activity,
        subItems: ['Sample 3-1', 'Sample 3-2'],
    },
    {
        title: 'Sample 4',
        icon: FileText,
        subItems: ['Sample 4-1', 'Sample 4-2'],
    },
    {
        title: 'Setting',
        icon: Settings,
        subItems: ['내 정보 수정'],
    },
];

const Sidebar = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [openMenu, setOpenMenu] = useState('Sample 1');

    const toggleMenu = (title) => {
        setOpenMenu(openMenu === title ? null : title);
    };

    const handleLogout = () => {
        if (window.confirm("로그아웃 하시겠습니까?")) {
            logout();
            navigate('/');
        }
    };

    return (
        <aside className="w-72 hidden lg:flex flex-col h-screen fixed left-0 top-0 p-6 z-50">
            <GlassCard className="flex-1 p-6 flex flex-col rounded-[2rem] overflow-hidden">
                <div className="flex items-center gap-3 mb-8 px-2">
                    <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-xl shadow-lg shadow-blue-500/20" />
                    <span className="font-bold text-xl tracking-tighter text-white">OS UI</span>
                </div>

                <nav className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {menuItems.map((item) => (
                        <div key={item.title} className="flex flex-col">
                            <button
                                onClick={() => toggleMenu(item.title)}
                                className={`flex items-center justify-between w-full p-3 rounded-xl transition-all duration-200 ${openMenu === item.title
                                    ? 'bg-blue-600/20 text-white'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <item.icon size={20} />
                                    <span className="font-medium text-sm">{item.title}</span>
                                </div>
                                {openMenu === item.title ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>

                            <AnimatePresence>
                                {openMenu === item.title && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="pl-10 py-1 space-y-1">
                                            {item.subItems.map((sub) => (
                                                <div
                                                    key={sub}
                                                    onClick={() => {
                                                        if (sub === '내 정보 수정') {
                                                            navigate('/dashboard/settings/password-check');
                                                        }
                                                    }}
                                                    className="p-2 text-sm text-gray-500 hover:text-white cursor-pointer rounded-lg hover:bg-white/5 transition"
                                                >
                                                    {sub}
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </nav>

                <div className="mt-4 pt-4 border-t border-white/10">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full p-3 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition"
                    >
                        <LogOut size={20} />
                        <span className="font-medium text-sm">로그아웃</span>
                    </button>
                </div>
            </GlassCard>
        </aside>
    );
};

export default Sidebar;
