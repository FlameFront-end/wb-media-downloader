// Vite inlines this script in <head>, before React starts.
{
	const defaultScheme = document.currentScript?.getAttribute('data-default-color-scheme')
	let scheme = defaultScheme === 'light' || defaultScheme === 'dark' ? defaultScheme : 'auto'

	try {
		const stored = localStorage.getItem('mantine-color-scheme-value')

		if (stored === 'light' || stored === 'dark' || stored === 'auto') {
			scheme = stored
		}
	} catch {
		// The system or default theme still works when storage is blocked.
	}

	const resolved =
		scheme === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : scheme

	document.documentElement.setAttribute('data-mantine-color-scheme', resolved)
}
