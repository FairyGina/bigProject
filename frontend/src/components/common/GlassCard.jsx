import React from 'react';

// 유리 질감 카드 공통 컴포넌트
const GlassCard = ({ children, className = "" }) => (
    <div className={`backdrop-blur-xl bg-white/5 border border-white/10 rounded-[2.5rem] shadow-2xl ${className}`}>
        {children}
    </div>
);

export default GlassCard;
