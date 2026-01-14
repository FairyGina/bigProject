import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Users, Settings, Activity, ChevronRight } from 'lucide-react';
import GlassCard from '../components/common/GlassCard';

// 대시보드 페이지
const Dashboard = () => {
    const [userName, setUserName] = React.useState('사용자');

    React.useEffect(() => {
        const storedName = localStorage.getItem('userName');
        if (storedName) {
            setUserName(storedName);
        }
    }, []);

    // Main Content Only
    return (
        <React.Fragment>

            {/* Main Content Area */}
            <div className="flex flex-col gap-6 h-full">
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
            </div>
        </React.Fragment>
    );
};

export default Dashboard;
