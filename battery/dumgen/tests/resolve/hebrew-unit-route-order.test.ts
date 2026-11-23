import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import type {
	SegmentedSentence,
	Unit,
} from "../../src/segment/segmented-sentence.js";
import { fakeDumgen } from "../service-test-adapter.js";

const unit: Unit<"he"> = {
	segments: [0],
	route: { language: "he", family: "Lexeme", kind: "NOUN" },
};
const reordered: Unit<"he"> = {
	segments: [0],
	route: { kind: "NOUN", family: "Lexeme", language: "he" },
};
const sentence: SegmentedSentence<"he"> = {
	text: "ספר",
	segments: [{ kind: "ResolvableText", text: "ספר" }],
	units: [unit],
};
const surface = {
	unitKind: "Surface",
	language: "he",
	lemma: {
		unitKind: "Lemma",
		language: "he",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "ספר",
		coreFeatures: { abbr: null, gender: "Masc" },
	},
	normalizedSurface: "ספר",
	spelling: { kind: "Canonical" },
	surfaceFeatures: null,
	inflectionalFeatures: { number: "Sing", definite: "Ind" },
} as const satisfies Dumling.Surface<"he">;
const attestation = {
	unitKind: "Attestation",
	surface,
	members: [{ attested: "ספר", orthography: "Standard" }],
	realizationCoverage: "Full",
	articleEvidence: null,
} as const satisfies Dumling.Attestation<"he">;

function setup() {
	let calls = 0;
	const dumgen = fakeDumgen({
		jev: async () => {
			throw Error("The cold Reading must use its draft");
		},
		luna: async () => {
			calls++;
			return {
				output: {
					emojiDescription: "📚",
					grammarEvidence: {
						kind: "NOUN",
						state: "Absolute",
						complement: null,
					},
					surface,
				},
			};
		},
		requestBudget: 1,
	});
	return { dumgen, calls: () => calls };
}

test("Hebrew grammar accepts an equal stored route regardless of object key order", async () => {
	const { dumgen, calls } = setup();
	const result = await Effect.runPromise(
		dumgen.resolve.grammar({
			language: "he",
			sentence,
			unit: reordered,
			neighbours: {},
			lemmaCandidates: [],
		}),
	);
	expect(result._tag).toBe("Resolved");
	expect(calls()).toBe(1);
});

test("Hebrew Reading accepts an equal stored route regardless of object key order", async () => {
	const { dumgen, calls } = setup();
	const result = await Effect.runPromise(
		dumgen.resolve.reading({
			attestation,
			sentence,
			unit: reordered,
			candidates: [],
			drafted: "📚",
		}),
	);
	expect(result).toEqual({ _tag: "New", emojiDescription: "📚" });
	expect(calls()).toBe(0);
});

test("Hebrew unit validation still refuses a genuinely different route before model calls", async () => {
	const { dumgen, calls } = setup();
	await expect(
		Effect.runPromise(
			dumgen.resolve.grammar({
				language: "he",
				sentence,
				unit: {
					segments: [0],
					route: { language: "he", family: "Lexeme", kind: "ADJ" },
				},
				neighbours: {},
				lemmaCandidates: [],
			}),
		),
	).rejects.toThrow("not stored");
	expect(calls()).toBe(0);
});
