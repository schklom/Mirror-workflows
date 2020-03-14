const path = require('path');

module.exports = {
	entry: {
		inner: './src/ui/inner.js'
	},
	mode: 'development',
	devtool: 'inline-source-map',
	output: {
		// filename: 'app.js',
		path: path.resolve(__dirname, 'dist')
	},
	resolve: {
		extensions: [ '.js' ]
	}
};
