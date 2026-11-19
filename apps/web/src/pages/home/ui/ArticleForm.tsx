import { useState, type SubmitEvent } from 'react'

import { Button, Group, TextInput } from '@mantine/core'

import { parseArticle } from '../model/parse-article'

interface ArticleFormProps {
	onSubmit: (article: number) => void
}

export function ArticleForm({ onSubmit }: ArticleFormProps) {
	const [value, setValue] = useState('')
	const [error, setError] = useState<string | null>(null)

	const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault()
		const result = parseArticle(value)

		if (!result.ok) {
			setError(result.error)
			return
		}

		setError(null)
		onSubmit(result.article)
	}

	return (
		<form onSubmit={handleSubmit} noValidate>
			<Group align='flex-start' gap='sm' wrap='nowrap'>
				<TextInput
					flex={1}
					label='Артикул'
					placeholder='604174866 или ссылка на товар'
					value={value}
					onChange={event => {
						setValue(event.currentTarget.value)
						setError(null)
					}}
					error={error}
					inputMode='numeric'
					autoComplete='off'
				/>
				<Button type='submit' mt={25}>
					Скачать фото
				</Button>
			</Group>
		</form>
	)
}
