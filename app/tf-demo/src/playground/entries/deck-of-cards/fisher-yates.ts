/** Shuffles `array` in place and returns it. */
export function fisherYates<T>(array: T[]): T[] {
	for (let i = array.length - 1; i; i--) {
		const rnd = Math.floor(Math.random() * (i + 1));
		const temp = array[i] as T;
		array[i] = array[rnd] as T;
		array[rnd] = temp;
	}

	return array;
}
