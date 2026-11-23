import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import {
	asksBreakdown,
	type Segmenters,
	withBreakdown,
} from "../server/knowledgeBreakdown";
import type { KnowledgeProduction } from "../server/knowledgeProduction";
import { hebrewNoun } from "./support/hebrew-note";

const reading = {
	unitKind: "Reading" as const,
	lemma: hebrewNoun,
	emojiDescription: "🏠",
};

test("unsupported Hebrew Breakdown preserves Knowledge and never invokes German segmenters", async () => {
	let calls = 0;
	const segmenters: Segmenters<never> = {
		inConstituents: () => {
			calls++;
			return Effect.die("unsupported");
		},
		inMorphemes: () => {
			calls++;
			return Effect.die("unsupported");
		},
	};
	const produced: KnowledgeProduction = {
		changes: [],
		failures: [],
		pendingRelations: [],
	};
	expect(asksBreakdown(reading, { topUpOnly: false, knowledge: {} })).toBe(
		false,
	);
	const result = await Effect.runPromise(
		withBreakdown(
			segmenters,
			Effect.succeed(produced),
			{ reading, breakdown: true },
			() => {
				calls++;
				return Effect.succeed(false);
			},
		),
	);
	expect(result).toBe(produced);
	expect(calls).toBe(0);
	expect(result.changes).toEqual([]);
});
