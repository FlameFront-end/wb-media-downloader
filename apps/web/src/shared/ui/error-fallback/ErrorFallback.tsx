import { Alert, Button, Center, Stack, Text } from '@mantine/core'
import type { FallbackProps } from 'react-error-boundary'

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
	const details = import.meta.env.DEV && error instanceof Error ? error.message : null

	return (
		<Center mih='100vh' p='md'>
			<Alert color='red' title='Что-то пошло не так' maw={480} w='100%'>
				<Stack gap='sm'>
					<Text size='sm'>Произошла непредвиденная ошибка. Попробуйте ещё раз.</Text>
					{details && (
						<Text size='xs' c='dimmed' ff='monospace'>
							{details}
						</Text>
					)}
					<Button variant='light' color='red' onClick={resetErrorBoundary}>
						Попробовать снова
					</Button>
				</Stack>
			</Alert>
		</Center>
	)
}
