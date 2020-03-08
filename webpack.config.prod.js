const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
	entry: {
		inner: './src/ui/inner.js',
		outer: './src/ui/outer.js'
	},
	mode: 'production',
	output: {
		path: path.resolve(__dirname, 'dist')
	},
	resolve: {
		extensions: [ '.js' ]
	},
	plugins: [
		new HtmlWebpackPlugin({
			title: 'Output Management',
			template: 'src/ui/assets/index.html',
			inject: false
		})
	],
	module: {
		rules: [{
			test: /\.css$/i,
			use: ['style-loader', 'css-loader'],
		}]
	}
};
