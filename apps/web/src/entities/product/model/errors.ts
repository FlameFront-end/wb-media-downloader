export class ProductNotFoundError extends Error {
	override readonly name = 'ProductNotFoundError'
	readonly productId: number

	constructor(productId: number) {
		super(`Product ${productId} not found`)
		this.productId = productId
	}
}
