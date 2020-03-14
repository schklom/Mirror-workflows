module.exports = {
  root: true,
  env: {
	"browser": true,
	"commonjs": true,
	"es6": true,
	"node": true
  },
  'extends': [
    'plugin:vue/essential',
    'eslint:recommended'
  ],
  rules: {
    'no-console': 'off',
    'no-debugger': 'off',
    "no-case-declarations":"off"
  },
  parserOptions: {
    parser: 'babel-eslint'
  }
}
