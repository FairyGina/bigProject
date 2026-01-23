import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            '/api': {
<<<<<<< HEAD
                target: 'http://localhost:8080',
=======
                target: 'http://localhost:3001',
>>>>>>> upstream/UI3
                changeOrigin: true,
            }
        }
    }
})
