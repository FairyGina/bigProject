import React from 'react';

const ThemeToggle = ({ className = '' }) => {
    const [theme, setTheme] = React.useState(() => {
        return localStorage.getItem('theme') || 'light';
    });

    React.useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    };

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className={`px-4 py-2 rounded-full text-sm font-semibold border border-[color:var(--border)] text-[color:var(--text)] bg-[color:var(--surface)] shadow-[0_10px_30px_var(--shadow)] hover:bg-[color:var(--surface-muted)] transition ${className}`}
            aria-label="테마 전환"
        >
            {theme === 'light' ? '다크 모드' : '라이트 모드'}
        </button>
    );
};

export default ThemeToggle;
