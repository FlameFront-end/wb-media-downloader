const ARTICLE_PATTERN = /^\d{1,12}$/
const CATALOG_PATH_PATTERN = /^\/catalog\/(\d{1,12})(?:\/|$)/
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
	let url: URL

	try {
		url = new URL(URL_SCHEME_PATTERN.test(value) ? value : `https://${value}`)
	} catch {
		return null
	}

	if ((url.protocol !== 'https:' && url.protocol !== 'http:') || !isWbHost(url.hostname)) {
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

	const digits = ARTICLE_PATTERN.test(value) ? value : parseCatalogLink(value)

	if (!digits) {
		return { ok: false, error: INVALID_INPUT }
	}

	const article = Number(digits)

	if (article <= 0) {
		return { ok: false, error: 'Артикул должен быть больше нуля' }
	}

	return { ok: true, article }
}
