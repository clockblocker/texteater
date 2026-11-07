/** `value` with a random sign. */
export function plusMinus(value: number): number {
	const plusminus = Math.round(Math.random()) ? -1 : 1;

	return plusminus * value;
}
