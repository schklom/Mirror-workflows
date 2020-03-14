const path = require('path');

module.exports = {
	entry: {
		inner: './src/ui/inner.js'
	},
	mode: 'production',
	output: {
		path: path.resolve(__dirname, 'dist')
	},
	resolve: {
		extensions: [ '.js' ]
	}
};
