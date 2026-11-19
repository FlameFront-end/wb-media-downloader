import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'
import importX from 'eslint-plugin-import-x'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
	globalIgnores(['.plan/**', '**/dist', '**/coverage', '**/node_modules', '**/test-results', '**/playwright-report']),

	{
		name: 'project/typescript',
		files: ['**/*.{ts,tsx}'],
		extends: [js.configs.recommended, tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname
			}
		},
		plugins: {
			'import-x': importX
		},
		rules: {
			'import-x/order': [
				'error',
				{
					groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
					'newlines-between': 'always',
					alphabetize: { order: 'asc', caseInsensitive: true },
					pathGroups: [
						{ pattern: 'react{,-dom{,/**}}', group: 'external', position: 'before' },
						{ pattern: '@/**', group: 'internal', position: 'before' }
					],
					pathGroupsExcludedImportTypes: ['react']
				}
			],
			'import-x/no-duplicates': 'error',
			'@typescript-eslint/consistent-type-imports': 'error',
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
			'@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
			'no-console': ['warn', { allow: ['warn', 'error'] }]
		}
	},

	{
		name: 'project/web',
		files: ['apps/web/src/**/*.{ts,tsx}'],
		extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
		languageOptions: {
			globals: globals.browser
		}
	},

	{
		name: 'project/tooling',
		files: ['**/*.config.{js,ts}'],
		languageOptions: {
			globals: globals.node
		}
	},

	{
		name: 'project/javascript',
		files: ['**/*.{js,mjs,cjs}'],
		extends: [js.configs.recommended, tseslint.configs.disableTypeChecked]
	},

	prettier
])
