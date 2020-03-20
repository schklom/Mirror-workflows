const FaviconsWebpackPlugin = require('favicons-webpack-plugin')

module.exports = {
	configureWebpack: {
		entry: {
			app: './src/ui/entry.js'
		},
		plugins: [
			new FaviconsWebpackPlugin('./src/assets/small.jpg')
		]
	},
	devServer: {
		hotOnly: true,
		disableHostCheck: true,
		clientLogLevel: 'warning',
		inline: true,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
			'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
		},
		proxy: {
				'(/inner.js|/(main|raw|feed)/*)': {
					target: 'http://localhost:3000/',
					changeOrigin: true,
					ws: false
				}
		}
	}
}
