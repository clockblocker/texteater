import { expect, test } from "bun:test";
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import { createDumgen } from "../src/create-dumgen.js";
import type { OperationTrace } from "../src/operation-trace.js";
import type {
	SegmentedSentence,
	Unit,
} from "../src/segment/segmented-sentence.js";

const attestation: Dumling.Attestation<"he", "Lexeme", "NOUN"> = {
	unitKind: "Attestation",
	surface: {
		unitKind: "Surface",
		language: "he",
		lemma: {
			unitKind: "Lemma",
			language: "he",
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm: "סֵפֶר",
			coreFeatures: { abbr: null, gender: "Masc" },
		},
		normalizedSurface: "סֵפֶר",
		spelling: { kind: "Canonical" },
		surfaceFeatures: null,
		inflectionalFeatures: { definite: "Ind", number: "Sing" },
	},
	members: [{ attested: "סֵפֶר", orthography: "Standard" }],
	realizationCoverage: "Full",
	articleEvidence: null,
};
const unit: Unit<"he"> = {
	segments: [0],
	route: { language: "he", family: "Lexeme", kind: "NOUN" },
};
const sentence: SegmentedSentence<"he"> = {
	text: "סֵפֶר",
	segments: [{ kind: "ResolvableText", text: "סֵפֶר" }],
	units: [unit],
};

const noModels = async (): Promise<never> => {
	throw Error("This path must make no model call");
};

test("public Card operations reach Hebrew handlers through the shared registry", async () => {
	expect(parseUnit(attestation).success).toBe(true);
	const traces: OperationTrace[] = [];
	const dumgen = createDumgen({
		jev: noModels,
		luna: noModels,
		onOperation: (trace) => traces.push(trace),
	});
	const reading = await Effect.runPromise(
		dumgen.resolve.reading({
			attestation,
			sentence,
			unit,
			candidates: [],
			drafted: "📖",
		}),
	);
	expect(reading).toEqual({ _tag: "New", emojiDescription: "📖" });
	const unresolved: Unit<"he"> = { segments: [0], route: "Unresolved" };
	expect(
		await Effect.runPromise(
			dumgen.resolve.grammar({
				language: "he",
				sentence: { ...sentence, units: [unresolved] },
				unit: unresolved,
				neighbours: {},
				lemmaCandidates: [],
			}),
		),
	).toEqual({ _tag: "Unresolved" });
	const knowledge = await Effect.runPromise(
		dumgen.knowledge.produce({
			language: "he",
			reading: {
				unitKind: "Reading",
				lemma: attestation.surface.lemma,
				emojiDescription: "📖",
			},
			attestation,
			sentence: { segments: sentence.segments, target: unit.segments },
			origin: "New",
			request: {},
		}),
	);
	expect(knowledge).toEqual({
		changes: [],
		pendingRelations: [],
		failures: [],
	});
	expect(traces.map(({ operation }) => operation)).toEqual([
		"resolve.reading",
		"resolve.grammar",
		"knowledge.produce",
	]);
	expect(traces.every(({ calls }) => calls.length === 0)).toBe(true);
});
