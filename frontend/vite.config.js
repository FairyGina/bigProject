import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
<<<<<<< HEAD
=======
    define: {
        global: 'globalThis',
    },    
>>>>>>> upstream/UI5
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            '/api': {
<<<<<<< HEAD
                target: 'http://localhost:8080',
=======
                target: 'http://localhost:3001',
>>>>>>> upstream/UI5
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
<<<<<<< HEAD
=======


>>>>>>> upstream/UI5
