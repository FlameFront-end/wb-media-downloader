import { createTheme } from '@mantine/core'

export const theme = createTheme({
	primaryColor: 'violet',
	defaultRadius: 'md',
	// Mantine transitions (modal, collapse) become instant with prefers-reduced-motion
	respectReducedMotion: true
})
