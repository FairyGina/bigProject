import React from 'react';
import { useNavigate } from 'react-router-dom';

const Footer = () => {
    const navigate = useNavigate();

    return (
        <footer className="w-full px-6 py-6 text-xs text-[color:var(--text-muted)]">
            <div className="flex flex-col items-center gap-1 text-center">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => navigate('/privacy-policy')}
                        className="hover:text-[color:var(--text)] underline underline-offset-4"
                    >
                        개인정보 처리방침
                    </button>
                    <span className="text-[color:var(--text-soft)]">|</span>
                    <button
                        type="button"
                        onClick={() => navigate('/terms')}
                        className="hover:text-[color:var(--text)] underline underline-offset-4"
                    >
                        이용약관
                    </button>
                </div>
                <p>(주)BeanRecipe | 대표자: KT AIVLE SCHOOL_수도권 01반 02조_김지나 | 사업자등록번호: 000-00-00000</p>
                <p>통신판매업신고: 2026-서울강남-0000</p>
                <p>(c) 2026 BeanRecipe. All rights reserved.</p>
            </div>
        </footer>
    );
};

export default Footer;

