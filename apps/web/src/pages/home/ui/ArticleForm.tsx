import { useState, type SubmitEvent } from 'react'

import { Box, Button, Group, TextInput } from '@mantine/core'

import { parseArticle } from '../model/parse-article'

interface ArticleFormProps {
	onSubmit: (article: number) => void
	/** The user is about to submit (focus or hover): a good moment to preload what comes next */
	onIntent?: () => void
	/** Submit accepted, waiting for what it opens. */
	loading?: boolean
}

export function ArticleForm({ onSubmit, onIntent, loading = false }: ArticleFormProps) {
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
			<TextInput
				label='Артикул'
				placeholder='604174866 или ссылка'
				value={value}
				onChange={event => {
					setValue(event.currentTarget.value)
					setError(null)
				}}
				error={error}
				onFocus={onIntent}
				inputMode='numeric'
				autoComplete='off'
				// Button next to the input, label above and error below both: aligned without magic offsets
				inputContainer={input => (
					<Group gap='sm' wrap='nowrap' align='flex-start'>
						<Box flex={1}>{input}</Box>
						<Button type='submit' loading={loading} onPointerEnter={onIntent}>
							Скачать фото
						</Button>
					</Group>
				)}
			/>
		</form>
	)
}
