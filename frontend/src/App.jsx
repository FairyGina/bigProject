import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';
import { AnimatePresence } from 'framer-motion';

export default function App() {
    return (
        <Router>
            <AuthProvider>
                <div className="font-sans antialiased bg-[#121212] min-h-screen selection:bg-blue-500/30">
                    <AnimatePresence mode="wait">
                        <AppRoutes />
                    </AnimatePresence>
                </div>
            </AuthProvider>
        </Router>
    );
}
