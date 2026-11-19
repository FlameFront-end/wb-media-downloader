import fsd from '@feature-sliced/steiger-plugin'
import { defineConfig } from 'steiger'

export default defineConfig([
	...fsd.configs.recommended,
	{
		rules: {
			// Small app: each feature is a single user action used from one widget,
			// and the product entity is shared by the widget and two features.
			// Merging them into pages would hide the domain boundaries the task asks to show.
			'fsd/insignificant-slice': 'off'
		}
	}
])
