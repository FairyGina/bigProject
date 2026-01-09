import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Users, Settings, Activity, ChevronRight } from 'lucide-react';
import GlassCard from '../components/GlassCard';

// 대시보드 페이지
const Dashboard = ({ setView }) => {
    const [userName, setUserName] = React.useState('사용자');

    React.useEffect(() => {
        const storedName = localStorage.getItem('userName');
        if (storedName) {
            setUserName(storedName);
        }
    }, []);

    const handleLogout = () => {
        if (window.confirm("로그아웃 하시겠습니까?")) {
            // 토큰 및 사용자 정보 삭제
            localStorage.removeItem('accessToken');
            localStorage.removeItem('userName');
            // 메인 화면으로 이동
            setView('main');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="min-h-screen bg-[#050505] text-white flex p-6 gap-6"
        >
            {/* Sidebar */}
            <aside className="w-72 hidden lg:flex flex-col">
                <GlassCard className="flex-1 p-8 flex flex-col rounded-[3rem]">
                    <div className="flex items-center gap-3 mb-12">
                        <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-xl" />
                        <span className="font-bold text-xl tracking-tighter">OS UI</span>
                    </div>
                    <nav className="space-y-2 flex-1">
                        {[
                            { name: '대시보드', icon: <LayoutDashboard size={20} />, active: true },
                            { name: '사용자 통계', icon: <Users size={20} /> },
                            { name: '시스템 활동', icon: <Activity size={20} /> },
                            { name: '설정', icon: <Settings size={20} /> },
                        ].map((item) => (
                            <div key={item.name} className={`flex items-center gap-4 px-4 py-4 rounded-2xl cursor-pointer transition ${item.active ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                                {item.icon} <span className="font-medium">{item.name}</span>
                            </div>
                        ))}
                    </nav>
                    <button onClick={handleLogout} className="mt-auto text-gray-500 hover:text-white text-sm">로그아웃</button>
                </GlassCard>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col gap-6">
                <header className="flex justify-between items-center px-4">
                    <h2 className="text-3xl font-bold">대시보드 개요</h2>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm font-bold text-white">{userName} 님</p>
                            <p className="text-xs text-gray-500">Premium Plan</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-orange-400 to-rose-500 border-2 border-white/20" />
                    </div>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <GlassCard className="p-8 hover:bg-white/10 transition cursor-default group">
                        <p className="text-gray-400 text-sm mb-2">총 매출액</p>
                        <div className="flex justify-between items-end">
                            <p className="text-4xl font-bold">$42,950</p>
                            <span className="text-green-400 text-sm font-bold">+12%</span>
                        </div>
                    </GlassCard>
                    <div className="p-8 rounded-[2.5rem] bg-blue-600 shadow-2xl shadow-blue-600/30 flex flex-col justify-between">
                        <p className="text-blue-100 text-sm">현재 활성 사용자</p>
                        <p className="text-4xl font-bold text-white">2,421</p>
                    </div>
                    <GlassCard className="p-8">
                        <p className="text-gray-400 text-sm mb-2">진행 중인 프로젝트</p>
                        <p className="text-4xl font-bold">18</p>
                    </GlassCard>
                </div>

                {/* Large Content Area */}
                <GlassCard className="flex-1 p-8 relative overflow-hidden group">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-bold">실시간 데이터 추이</h3>
                        <button className="text-sm text-gray-400 flex items-center gap-1 hover:text-white transition">전체보기 <ChevronRight size={16} /></button>
                    </div>
                    <div className="h-64 flex items-end gap-3 px-4">
                        {[40, 70, 45, 90, 65, 80, 50, 95, 60].map((h, i) => (
                            <motion.div
                                initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: i * 0.1 }}
                                key={i} className="flex-1 bg-gradient-to-t from-blue-500/40 to-blue-400 rounded-t-lg"
                            />
                        ))}
                    </div>
                </GlassCard>
            </main>
        </motion.div>
    );
};

export default Dashboard;
