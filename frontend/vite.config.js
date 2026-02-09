import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    define: {
        global: 'globalThis',
    },
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            }
            ,
            '/ai/recipe': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            }
        }
    }
})

