import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { createDumdictLayer } from "../../../src/service/layer";
import { createInMemoryTestStorage } from "../../../src/testing/in-memory-storage";
import { englishWalkLemma } from "./helpers";

test("constructs a language-bound dictionary through its storage layer", async () => {
	const dictionary = createDumdictLayer("en");
	const storage = createInMemoryTestStorage("en", []);
	const live = dictionary.Live.pipe(
		Layer.provide(Layer.succeed(dictionary.Storage, storage)),
	);
	const program = Effect.gen(function* () {
		const service = yield* dictionary.Service;
		return yield* service.findStoredReadings({ lemma: englishWalkLemma });
	});
	expect(
		await Effect.runPromise(program.pipe(Effect.provide(live))),
	).toMatchObject({ candidates: [] });
});

test("dictionary preflight runs inside the Effect boundary", async () => {
	const dictionary = createDumdictLayer("en");
	const live = dictionary.Live.pipe(
		Layer.provide(
			Layer.succeed(
				dictionary.Storage,
				createInMemoryTestStorage("en", []),
			),
		),
	);
	const result = await Effect.runPromise(
		Effect.gen(function* () {
			const service = yield* dictionary.Service;
			// @ts-expect-error Exercise a malformed runtime caller, not a valid request.
			const program = service.prepare.addNewNote(null);
			expect(Effect.isEffect(program)).toBe(true);
			return yield* Effect.exit(program);
		}).pipe(Effect.provide(live)),
	);
	expect(result._tag).toBe("Failure");
});
