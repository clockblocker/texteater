/**
 * Memos the lab's arms share work through: a lookup run once per key, on
 * Effect's `Cache`, which keeps failures as well as answers, lets
 * concurrent callers of a key share one pending lookup, and drops a lookup
 * every caller left before it settled.
 */
import * as Cache from "effect/Cache";
import * as Effect from "effect/Effect";

/**
 * `lookup` once per `keyOf` of its argument. The first caller's argument
 * is the one looked up; every later caller of the same key, concurrent or
 * not, gets its outcome.
 */
export const onceEach = <I, A, E, R>(
	keyOf: (input: I) => string,
	lookup: (input: I) => Effect.Effect<A, E, R>,
): Effect.Effect<(input: I) => Effect.Effect<A, E>, never, R> =>
	Effect.suspend(() => {
		const first = new Map<string, I>();
		return Effect.map(
			Cache.make({
				capacity: Number.POSITIVE_INFINITY,
				lookup: (key: string) => {
					const input = first.get(key);
					return input === undefined
						? Effect.die(Error(`No argument was kept for ${key}`))
						: lookup(input);
				},
			}),
			(cache) => (input: I) =>
				Effect.suspend(() => {
					const key = keyOf(input);
					if (!first.has(key)) first.set(key, input);
					return Cache.get(cache, key);
				}),
		);
	});
