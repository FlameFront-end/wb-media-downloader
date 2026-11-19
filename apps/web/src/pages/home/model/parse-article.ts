const MAX_ARTICLE_DIGITS = 12
const ARTICLE_PATTERN = /^\d+$/
const GROUPED_ARTICLE_PATTERN = /^\d{1,3}(?:[ \u00a0\u202f]\d{3})+$/
const ARTICLE_SEPARATOR = /[ \u00a0\u202f]/g
const INVALID_LINK_CHARACTERS = /[\s\\]/u
const CATALOG_PATH_PATTERN = /^\/catalog\/(\d+)(?:\/detail\.aspx)?\/?$/
const URL_SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:\/\//i

/** Storefront domains of Wildberries; subdomains (www., global.) are allowed. */
const WB_DOMAINS = [
	'wildberries.ru',
	'wildberries.by',
	'wildberries.kz',
	'wildberries.am',
	'wildberries.kg',
	'wildberries.uz',
	'wildberries.ge'
] as const

export type ParseArticleResult = { ok: true; article: number } | { ok: false; error: string }

const INVALID_INPUT = 'Артикул — это число или ссылка на товар WB'

function isWbHost(hostname: string): boolean {
	const host = hostname.toLowerCase()

	return WB_DOMAINS.some(domain => host === domain || host.endsWith(`.${domain}`))
}

function parseCatalogLink(value: string): string | null {
	if (INVALID_LINK_CHARACTERS.test(value)) {
		return null
	}
	let url: URL

	try {
		url = new URL(URL_SCHEME_PATTERN.test(value) ? value : `https://${value}`)
	} catch {
		return null
	}

	if (
		(url.protocol !== 'https:' && url.protocol !== 'http:') ||
		url.username ||
		url.password ||
		url.port ||
		!isWbHost(url.hostname)
	) {
		return null
	}

	return CATALOG_PATH_PATTERN.exec(url.pathname)?.[1] ?? null
}

/**
 * Accepts a bare article ("604174866") or a WB product link
 * ("https://www.wildberries.ru/catalog/604174866/detail.aspx").
 */
export function parseArticle(input: string): ParseArticleResult {
	const value = input.trim()

	if (value === '') {
		return { ok: false, error: 'Введите артикул' }
	}

	const compact = GROUPED_ARTICLE_PATTERN.test(value) ? value.replaceAll(ARTICLE_SEPARATOR, '') : value
	const digits = ARTICLE_PATTERN.test(compact) ? compact : parseCatalogLink(value)

	if (!digits) {
		return { ok: false, error: INVALID_INPUT }
	}

	if (digits.length > MAX_ARTICLE_DIGITS) {
		return { ok: false, error: `Артикул должен содержать не больше ${MAX_ARTICLE_DIGITS} цифр` }
	}

	const article = Number(digits)

	if (article <= 0) {
		return { ok: false, error: 'Артикул должен быть больше нуля' }
	}

	return { ok: true, article }
}
