const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
	entry: {
		inner: './src/ui/inner.js',
		outer: './src/ui/outer.js'
	},
	mode: 'development',
	devtool: 'inline-source-map',
	output: {
		// filename: 'app.js',
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
		}),
		new webpack.HotModuleReplacementPlugin()
	],
	module: {
		rules: [{
			test: /\.css$/i,
			use: ['style-loader', 'css-loader'],
		}]
	}
};
