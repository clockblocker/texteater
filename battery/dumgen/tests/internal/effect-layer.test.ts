import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
	DumgenLive,
	DumgenService,
	type ModelGenerator,
	ModelGeneratorService,
} from "../../src";

test("constructs Dumgen through its model layer and keeps expected input failure in Effect", async () => {
	let calls = 0;
	const model: ModelGenerator = {
		structuredGeneration: () =>
			Effect.sync(() => {
				calls++;
				return undefined as never;
			}),
		unstructuredGeneration: () => Effect.die("unused"),
	};
	const live = DumgenLive.pipe(
		Layer.provide(Layer.succeed(ModelGeneratorService, model)),
	);
	const program = Effect.gen(function* () {
		const dumgen = yield* DumgenService;
		return yield* Effect.either(dumgen.segment([]));
	});
	const result = await Effect.runPromise(program.pipe(Effect.provide(live)));
	expect(result).toMatchObject({
		_tag: "Left",
		left: { code: "invalid-input" },
	});
	expect(calls).toBe(0);
});
