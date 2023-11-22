import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import multi from '@rollup/plugin-multi-entry';

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
		target: 'esnext',
		rollupOptions: {
			input: {
				index: resolve(__dirname, 'index.html'),
				inner: resolve(__dirname, 'inner.html'),
			},
			output: {
				manualChunks: {},
				dir: 'dist',
				chunkFileNames: 'assets/[name].js',
				entryFileNames: 'assets/[name].js'
			}
		},
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
