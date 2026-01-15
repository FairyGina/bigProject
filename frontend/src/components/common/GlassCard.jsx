import React from 'react';

const GlassCard = ({ children, className = "" }) => (
    <div className={`backdrop-blur-xl bg-[color:var(--surface)]/90 border border-[color:var(--border)] rounded-[2.5rem] shadow-[0_30px_80px_var(--shadow)] ${className}`}>
        {children}
    </div>
);

export default GlassCard;
