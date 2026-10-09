/**
 * A record with an entry for each of `keys`, in their order, each `value`
 * of its key. `Object.fromEntries` names its result's keys only as strings,
 * so this is the one place a lab record's keys are cast to their union.
 */
export function recordOf<const K extends string, V>(
	keys: readonly K[],
	value: (key: K) => V,
): Record<K, V> {
	// Sound: every key of K gets an entry above, and no other key does.
	return Object.fromEntries(keys.map((key) => [key, value(key)])) as Record<
		K,
		V
	>;
}
