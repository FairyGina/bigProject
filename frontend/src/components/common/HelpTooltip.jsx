import React from 'react';

const HelpTooltip = ({ label, description, align = 'center', width = 'w-56', margin = 'ml-2' }) => {
    const alignmentClass = align === 'left' ? 'left-0' : 'left-1/2 -translate-x-1/2';

    return (
        <span className={`relative inline-flex items-center group align-middle ${margin}`}>
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[color:var(--border)] text-[10px] font-semibold text-[color:var(--text-muted)] bg-[color:var(--surface)]">
                ?
            </span>
            <span className="sr-only">{label}</span>
            <span
                className={`pointer-events-none absolute ${alignmentClass} top-full z-10 mt-2 ${width} rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs text-[color:var(--text)] opacity-0 shadow-[0_12px_30px_var(--shadow)] transition group-hover:opacity-100`}
            >
                {description}
            </span>
        </span>
    );
};

export default HelpTooltip;
