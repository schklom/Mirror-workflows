import typescript from 'rollup-plugin-typescript2';
import terser from '@rollup/plugin-terser';
export default {
	input: 'src/inner.ts',
	output: {
		file: 'dist/inner.js',
		format: 'es'
	},
	plugins: [
		terser(),
		typescript()
	]
}
