import { HttpError, InvalidResponseError } from '@/shared/api'

/** What went wrong with the card request, in words the user can act on. */
export function describeLoadError(error: Error | null, online = navigator.onLine): string {
	if (!online) {
		return 'Нет подключения к интернету. Подключитесь и попробуйте ещё раз.'
	}

	if (error instanceof HttpError) {
		if (error.status === 429) {
			return 'Wildberries ограничил число запросов. Подождите немного и попробуйте снова.'
		}

		if (error.status >= 500) {
			return 'Серверы Wildberries сейчас не отвечают. Попробуйте ещё раз чуть позже.'
		}

		return `Wildberries отклонил запрос (код ${error.status}). Попробуйте ещё раз позже.`
	}

	if (error instanceof InvalidResponseError) {
		return 'Wildberries вернул карточку в неожиданном формате. Повтор может не помочь, если изменился их API.'
	}

	// fetch rejects with TypeError when the request never got a response
	if (error instanceof TypeError) {
		return 'Не удалось связаться с серверами Wildberries. Проверьте интернет или попробуйте позже.'
	}

	return 'При загрузке карточки что-то пошло не так. Попробуйте ещё раз.'
}
