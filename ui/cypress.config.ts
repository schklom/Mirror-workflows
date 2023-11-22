import { defineConfig } from 'cypress'

export default defineConfig({
	e2e: {
		experimentalStudio: true,
		specPattern: 'cypress/e2e/**/*.{cy,spec}.{js,jsx,ts,tsx}',
		baseUrl: 'http://localhost:4173'
	},
	component: {
		specPattern: 'src/**/__tests__/*.{cy,spec}.{js,ts,jsx,tsx}',
		devServer: {
			framework: 'vue',
			bundler: 'vite'
		}
	}
})
