import { describe, expect, it } from 'vitest'

import { parseArticle } from './parse-article'

const INVALID = 'Артикул — это число или ссылка на товар WB'

describe('parseArticle', () => {
	it.each([
		['604174866', 604174866],
		['  604174866  ', 604174866],
		['1', 1],
		['000123', 123],
		['999999999999', 999999999999],
		['604 174 866', 604174866],
		['604\u00a0174\u202f866', 604174866],
		['https://www.wildberries.ru/catalog/604174866/detail.aspx', 604174866],
		['https://www.wildberries.ru/catalog/604174866/detail.aspx?size=1#reviews', 604174866],
		['http://wildberries.ru/catalog/604174866', 604174866],
		['wildberries.ru/catalog/604174866/detail.aspx', 604174866],
		['WWW.WILDBERRIES.RU/catalog/604174866/detail.aspx', 604174866],
		['https://global.wildberries.ru/catalog/604174866/detail.aspx', 604174866],
		['https://www.wildberries.kz/catalog/604174866/detail.aspx', 604174866]
	])('parses %s', (input, article) => {
		expect(parseArticle(input)).toEqual({ ok: true, article })
	})

	it.each([
		['', 'Введите артикул'],
		['   ', 'Введите артикул'],
		['abc', INVALID],
		['-5', INVALID],
		['1.5', INVALID],
		['1234567890123', 'Артикул должен содержать не больше 12 цифр'],
		['https://wildberries.ru/catalog/1234567890123/detail.aspx', 'Артикул должен содержать не больше 12 цифр'],
		['604 17 4866', INVALID],
		['1e6', INVALID],
		['0x12', INVALID],
		['+42', INVALID],
		['604174866 123', INVALID],
		['0', 'Артикул должен быть больше нуля']
	])('rejects %j', (input, error) => {
		expect(parseArticle(input)).toEqual({ ok: false, error })
	})

	it.each([
		['foreign domain, same path', 'https://example.com/catalog/604174866/detail.aspx'],
		['wb domain as subdomain of foreign host', 'https://wildberries.ru.evil.test/catalog/604174866'],
		['look-alike domain', 'https://evilwildberries.ru/catalog/604174866'],
		['wb domain in query of foreign host', 'https://example.com/?next=wildberries.ru/catalog/604174866'],
		['wb domain in credentials', 'https://wildberries.ru@example.com/catalog/604174866'],
		['non-http protocol', 'ftp://www.wildberries.ru/catalog/604174866'],
		['javascript url', 'javascript://www.wildberries.ru/catalog/604174866'],
		['wb link without catalog path', 'https://www.wildberries.ru/brands/604174866'],
		['catalog path not at start', 'https://www.wildberries.ru/x/catalog/604174866'],
		['catalog id with letters', 'https://www.wildberries.ru/catalog/6041a/detail.aspx'],
		['extra path after article', 'https://www.wildberries.ru/catalog/604174866/not-a-product'],
		['unsupported port', 'https://www.wildberries.ru:8080/catalog/604174866'],
		['credentials on a WB link', 'https://foo:bar@wildberries.ru/catalog/604174866'],
		['embedded whitespace', 'https://wildberries.ru/catalog/604\t174866/detail.aspx']
	])('rejects %s', (_, input) => {
		expect(parseArticle(input)).toEqual({ ok: false, error: INVALID })
	})
})
