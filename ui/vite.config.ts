import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

process.env.VITE_BUILD_TIME = new Date().toISOString()
// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		vue(),
	],
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url))
		}
	},
	build: {
		target: 'esnext'
	},
	server: {
		proxy: {
			'^(/inner.js|/(api/main|raw|(api/)?feed)/*)': {
				target: 'http://localhost:3000/',
				changeOrigin: true,
				ws: false
			}
		}
	}
})
