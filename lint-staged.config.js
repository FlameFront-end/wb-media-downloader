/** @type {import('lint-staged').Configuration} */
export default {
	'*.{ts,tsx,js}': ['eslint --fix', 'prettier --write'],
	'*.{json,md,css,scss,html,yml,yaml}': 'prettier --write'
}
