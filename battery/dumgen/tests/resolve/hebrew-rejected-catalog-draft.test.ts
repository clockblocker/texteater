import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import type { LunaRequest } from "../../src/luna.js";
import type { OperationTrace } from "../../src/operation-trace.js";
import { operations } from "../../src/operations.js";
import type { ResolveReadingInput } from "../../src/resolve/types.js";
import type { JevRequest } from "../../src/segment/jev.js";
import { liveOver } from "../live-over.js";

const unit: ResolveReadingInput<"he">["unit"] = {
	segments: [0],
	route: { language: "he", family: "Lexeme", kind: "NOUN" },
};
const input: ResolveReadingInput<"he"> = {
	sentence: {
		text: "עכבר מחובר למחשב.",
		segments: [
			{ kind: "ResolvableText", text: "עכבר" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "מחובר" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "למחשב" },
			{ kind: "Punctuation", text: "." },
		],
		units: [unit],
	},
	unit,
	attestation: {
		unitKind: "Attestation",
		surface: {
			unitKind: "Surface",
			language: "he",
			lemma: {
				unitKind: "Lemma",
				language: "he",
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "עכבר",
				coreFeatures: { abbr: null, gender: "Masc" },
			},
			normalizedSurface: "עכבר",
			spelling: { kind: "Canonical" },
			surfaceFeatures: null,
			inflectionalFeatures: { definite: "Ind", number: "Sing" },
		},
		members: [{ attested: "עכבר", orthography: "Standard" }],
		realizationCoverage: "Full",
		articleEvidence: null,
	},
	candidates: ["🐁"],
	drafted: "🐭",
};

function setup(
	extra: Partial<ResolveReadingInput<"he">> = {},
	selected = "NoMatch",
	output: unknown = "🖱️",
) {
	const judges: JevRequest[] = [];
	const writers: LunaRequest[] = [];
	const traces: OperationTrace[] = [];
	const run = () =>
		Effect.runPromise(
			operations.resolve.reading({ ...input, ...extra }).pipe(
				Effect.provide(
					liveOver({
						tracePayloads: true,
						onOperation: (trace) => traces.push(trace),
						jev: async (request) => {
							judges.push(request);
							return {
								model: request.model,
								answers: {
									reading: {
										type: "choice",
										choice: selected,
										confidence: 1,
										probabilities: { [selected]: 1 },
									},
								},
								usage: { input_tokens: 1, output_tokens: 1 },
							};
						},
						luna: async (request) => {
							writers.push(request);
							return { output };
						},
					}),
				),
			),
		);
	return { run, judges, writers, traces };
}

// Runtime regression: candidate2 returned New 🐭 and never reached Luna here.
// These deterministic transports exercise the public Effect, not live providers.
test("rejected Hebrew catalog forces a fresh contextual description instead of the Grammar draft", async () => {
	const { run, judges, writers, traces } = setup();
	expect({ result: await run(), writerCalls: writers.length }).toEqual({
		result: { _tag: "New", emojiDescription: "🖱" },
		writerCalls: 1,
	});
	expect(judges).toHaveLength(1);
	expect(JSON.stringify(judges[0])).not.toContain("🐭");
	expect(judges[0]?.questions.reading).toMatchObject({
		criteria: { c0: "🐁" },
	});
	expect(writers).toHaveLength(1);
	expect(writers[0]?.input).toEqual({
		markedSentence: "⟦עכבר⟧ מחובר למחשב.",
		lemma: "עכבר",
	});
	expect(
		traces[0]?.calls.map(({ executor, stage }) => ({ executor, stage })),
	).toEqual([
		{ executor: "jev", stage: "reading" },
		{ executor: "luna", stage: "hebrewEmojiDescription" },
	]);
	expect(traces[0]?.resolution).toEqual({
		outcome: "New",
		reason: "Written",
	});
});

test("Judged Reuse bypasses both the wrong draft and fallback writer", async () => {
	const { run, judges, writers, traces } = setup({ candidates: ["🖱️"] }, "c0");
	expect(await run()).toEqual({ _tag: "Reuse", emojiDescription: "🖱️" });
	expect(judges).toHaveLength(1);
	expect(writers).toHaveLength(0);
	expect(traces[0]?.resolution).toEqual({
		outcome: "Reuse",
		reason: "Judged",
	});
});

test("cold catalog adopts the validated Grammar draft without any model call", async () => {
	const { run, judges, writers, traces } = setup({
		candidates: [],
		drafted: "🖱️",
	});
	expect(await run()).toEqual({ _tag: "New", emojiDescription: "🖱" });
	expect(judges).toHaveLength(0);
	expect(writers).toHaveLength(0);
	expect(traces[0]?.resolution).toEqual({
		outcome: "New",
		reason: "Drafted",
	});
});

test("explicit written Reading preserves its stale retry path after NoMatch", async () => {
	const { run, judges, writers, traces } = setup({ written: "🖱️" });
	expect(await run()).toEqual({ _tag: "New", emojiDescription: "🖱" });
	expect(judges).toHaveLength(1);
	expect(writers).toHaveLength(0);
	expect(traces[0]?.resolution).toEqual({
		outcome: "New",
		reason: "Rejudged",
	});
});

test("explicit written stored collision still bypasses the judge", async () => {
	const { run, judges, writers } = setup({ written: "🐁️" });
	expect(await run()).toEqual({ _tag: "Reuse", emojiDescription: "🐁" });
	expect(judges).toHaveLength(0);
	expect(writers).toHaveLength(0);
});

test("fresh fallback collision still reveals a wrong NoMatch as normalized Reuse", async () => {
	const { run, writers, traces } = setup({}, "NoMatch", "🐁️");
	expect(await run()).toEqual({ _tag: "Reuse", emojiDescription: "🐁" });
	expect(writers).toHaveLength(1);
	expect(traces[0]?.resolution).toEqual({
		outcome: "Reuse",
		reason: "Written",
	});
});

for (const extra of [
	{ candidates: ["not emoji"] },
	{ drafted: "not emoji" },
	{ written: "not emoji" },
]) {
	test(`invalid Hebrew Reading input remains rejected before model calls: ${JSON.stringify(extra)}`, async () => {
		const { run, judges, writers } = setup(extra);
		await expect(run()).rejects.toThrow("Invalid Hebrew Emoji Description");
		expect(judges).toHaveLength(0);
		expect(writers).toHaveLength(0);
	});
}

test("invalid fresh fallback output is rejected and logged instead of reviving the draft", async () => {
	const { run, writers, traces } = setup({}, "NoMatch", "not emoji");
	await expect(run()).rejects.toThrow(
		"Luna returned no valid Hebrew Emoji Description",
	);
	expect(writers).toHaveLength(1);
	expect(traces[0]?.calls[1]?.failure?.tag).toBe("InvalidModelOutput");
	expect(traces[0]?.resolution).toBeUndefined();
});
