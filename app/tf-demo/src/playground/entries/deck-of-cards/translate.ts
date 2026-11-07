/**
 * A CSS `translate()`. Upstream switched to `translate3d()` on browsers
 * whose user agent looked mobile; current browsers composite either alike.
 */
export function translate(a: string, b: string): string {
	return `translate(${a}, ${b})`;
}
