import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { ProviderFailure } from "../../src/errors.js";
import { segmentHebrewSentence } from "../../src/segment/he/segments.js";
import { picked } from "./hebrew-choices.js";

test("Hebrew bounds repeated source questions without losing sentence context", async () => {
	const source = Array(25).fill("והבית").join(" ");
	const batches: { keys: string[]; sentence: unknown }[] = [];
	const result = await Effect.runPromise(
		segmentHebrewSentence(source, ({ state, questions }) => {
			batches.push({
				keys: Object.keys(questions),
				sentence: state.sentence,
			});
			return Effect.succeed(
				Object.fromEntries(
					Object.keys(questions).map((key) => [
						key,
						picked("AsWritten"),
					]),
				),
			);
		}),
	);
	expect(batches.length).toBe(2);
	expect(
		batches.every(
			({ keys, sentence }) => keys.length <= 22 && sentence === source,
		),
	).toBe(true);
	expect(batches.map(({ keys }) => keys.length)).toEqual([22, 3]);
	const keys = batches.flatMap(({ keys }) => keys);
	expect(keys.length).toBe(25);
	expect(new Set(keys).size).toBe(keys.length);
	expect(result.segments.map(({ text }) => text).join("")).toBe(source);
});

test("Hebrew retries only oversized source requests with smaller batches", async () => {
	const source = Array(24).fill("והבית").join(" ");
	const sizes: number[] = [];
	const result = await Effect.runPromise(
		segmentHebrewSentence(source, ({ questions }) => {
			const keys = Object.keys(questions);
			sizes.push(keys.length);
			if (keys.length > 16)
				return Effect.fail(
					new ProviderFailure({
						stage: "segments",
						message: "TypeSafe refused the request",
						cause: Object.assign(
							Error(
								'TypeSafe answered 400: {"detail":{"error_type":"max_tokens_exceeded"}}',
							),
							{ status: 400 },
						),
					}),
				);
			return Effect.succeed(
				Object.fromEntries(
					keys.map((key) => [key, picked("AsWritten")]),
				),
			);
		}),
	);
	expect(sizes).toEqual([22, 11, 11, 2]);
	expect(result.segments.map(({ text }) => text).join("")).toBe(source);
});

test("Hebrew does not retry other provider refusals as token overflow", async () => {
	const source = Array(20).fill("והבית").join(" ");
	let calls = 0;
	try {
		await Effect.runPromise(
			segmentHebrewSentence(source, () => {
				calls++;
				return Effect.fail(
					new ProviderFailure({
						stage: "segments",
						message: "TypeSafe rate limit",
						cause: Object.assign(Error("TypeSafe answered 429"), {
							status: 429,
						}),
					}),
				);
			}),
		);
	} catch {
		// The original provider failure must propagate without another paid call.
	}
	expect(calls).toBe(1);
});
