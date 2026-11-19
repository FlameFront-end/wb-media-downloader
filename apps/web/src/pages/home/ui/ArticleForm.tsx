import { useState, type SubmitEvent } from 'react'

import { Box, Button, TextInput } from '@mantine/core'

import { parseArticle } from '../model/parse-article'

import classes from './ArticleForm.module.css'

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
				size='md'
				label='Артикул или ссылка WB'
				placeholder='Например, 604174866'
				value={value}
				onChange={event => {
					setValue(event.currentTarget.value)
					setError(null)
				}}
				error={error}
				onFocus={onIntent}
				inputMode='url'
				autoCapitalize='none'
				spellCheck={false}
				autoComplete='off'
				// Button next to the input, label above and error below both: aligned without magic offsets
				inputContainer={input => (
					<Box className={classes.controls}>
						{input}
						<Button type='submit' size='md' loading={loading} onPointerEnter={onIntent}>
							Найти товар
						</Button>
					</Box>
				)}
			/>
		</form>
	)
}
