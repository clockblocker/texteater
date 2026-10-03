import { expect, test } from "bun:test";
import type {
	Dumgen,
	GrammarResolution,
	ReadingResolution,
	ResolveGrammarInput,
	ResolveReadingInput,
} from "dumgen";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import { clickCallDeadlineMs } from "../convex/orchestration";
import type { ClickGrammarInput } from "../server/clickResolution";
import { dumgenClickResolution } from "../server/dumgenClickResolution";
import { parseResolvedGrammar } from "../server/resolutionGrammar";
import { storedUnitOf } from "../server/storedSegments";

const sentence: ClickGrammarInput["sentence"] = {
	id: "sentence-1",
	language: "de",
	segments: [
		{ kind: "ResolvableText", text: "Er" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "kommt" },
		{ kind: "Punctuation", text: "." },
	],
};

const kommt: Dumling.Attestation<"de"> = {
	unitKind: "Attestation",
	surface: {
		unitKind: "Surface",
		language: "de",
		lemma: {
			unitKind: "Lemma",
			language: "de",
			family: "Lexeme",
			kind: "VERB",
			canonicalForm: "kommen",
			coreFeatures: { hasSepPrefix: null, lexicallyReflexive: null },
		},
		normalizedSurface: "kommt",
		spelling: { kind: "Canonical" },
		surfaceFeatures: null,
		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Pres",
			verbForm: "Fin",
			expletive: null,
			perfect: null,
			future: null,
			voice: null,
			passive: null,
		},
	},
	members: [{ attested: "kommt", orthography: "Standard" }],
	realizationCoverage: "Full",
	expletiveEvidence: null,
	valencyEvidence: [],
} as Dumling.Attestation<"de">;

/**
 * A Dumgen whose `resolve.grammar` answers `result`, and whose
 * `resolve.reading` answers `reading`, keeping what each got.
 */
function fakeDumgen(
	result: GrammarResolution,
	reading: ReadingResolution = { _tag: "New", emojiDescription: "🚶" },
) {
	const inputs: ResolveGrammarInput[] = [];
	const readingInputs: ResolveReadingInput[] = [];
	let built = 0;
	const dumgen = (): Pick<Dumgen, "resolve"> => {
		built++;
		return {
			resolve: {
				grammar: (input) => {
					inputs.push(input);
					return Effect.succeed(result);
				},
				reading: (input) => {
					readingInputs.push(input);
					return Effect.succeed(reading);
				},
			},
		};
	};
	return { dumgen, inputs, readingInputs, built: () => built };
}

const verb = { language: "de", family: "Lexeme", kind: "VERB" } as const;

test("a click's grammar is Dumgen's resolve.grammar over the stored unit, and its Attestation becomes a Grammar checkpoint", async () => {
	const fake = fakeDumgen({ _tag: "Resolved", attestation: kommt });
	const grammar = await Effect.runPromise(
		dumgenClickResolution(fake.dumgen).grammar({
			sentence,
			clickedSegmentIndex: 2,
			unit: { segments: [2], route: verb },
			lemmaCandidates: [],
			neighbours: { before: "Es ist spät." },
		}),
	);
	expect(fake.inputs[0]).toEqual({
		language: "de",
		sentence: {
			text: "Er kommt.",
			segments: sentence.segments,
			units: [{ segments: [2], route: verb }],
		},
		unit: { segments: [2], route: verb },
		neighbours: { before: "Es ist spät." },
		lemmaCandidates: [],
	});
	if (grammar.decision !== "Resolved") throw Error("Expected Resolved");
	expect(grammar.encounter.target).toEqual({
		family: "Lexeme",
		kind: "VERB",
		memberSegmentIndices: [2],
	});
	expect(parseResolvedGrammar(grammar)).toMatchObject({
		decision: "Resolved",
	});
});

test("a stored closed-class identity reaches Dumgen, and a Catalog Miss comes back as tf-demo's signal", async () => {
	const pron = { language: "de", family: "Lexeme", kind: "PRON" } as const;
	const fake = fakeDumgen({
		_tag: "CatalogMiss",
		route: pron,
		message: "No authored PRON er is spelled Er",
	});
	const identity = {
		kind: "PRON",
		canonicalForm: "er",
		pronType: "Prs",
	} as const;
	const grammar = await Effect.runPromise(
		dumgenClickResolution(fake.dumgen).grammar({
			sentence,
			clickedSegmentIndex: 0,
			unit: { segments: [0], route: pron, identity },
			lemmaCandidates: [],
			neighbours: {},
		}),
	);
	expect(fake.inputs[0]?.unit.identity).toEqual(identity);
	expect(grammar).toEqual({
		decision: "CatalogMiss",
		stage: "resolve.grammar",
		route: "de/Lexeme/PRON",
		message: "No authored PRON er is spelled Er",
	});
});

test("a Segment without a unit, or a unit intake left Unresolved, resolves nothing and builds no Dumgen", async () => {
	const fake = fakeDumgen({ _tag: "Unresolved" });
	const resolution = dumgenClickResolution(fake.dumgen);
	for (const unit of [
		undefined,
		{ segments: [0], route: "Unresolved" as const },
	])
		expect(
			await Effect.runPromise(
				resolution.grammar({
					sentence,
					clickedSegmentIndex: 0,
					...(unit ? { unit } : {}),
					lemmaCandidates: [],
					neighbours: {},
				}),
			),
		).toEqual({ decision: "Unresolved", language: "de" });
	expect(fake.built()).toBe(0);
});

test("a click's model calls take their own deadline, intake's until it is measured", () => {
	expect(clickCallDeadlineMs(undefined)).toBe(120_000);
	expect(clickCallDeadlineMs("8000")).toBe(8000);
	expect(() => clickCallDeadlineMs("soon")).toThrow("positive whole number");
});

test("a stored unit keeps the closed-class identity intake picked (#864)", () => {
	const pron = { language: "de", family: "Lexeme", kind: "PRON" } as const;
	const identity = {
		kind: "PRON",
		canonicalForm: "dieser",
		pronType: "Dem",
	} as const;
	expect(storedUnitOf({ segments: [0], route: pron, identity })).toEqual({
		segments: [0],
		route: pron,
		identity,
	});
	expect(storedUnitOf({ segments: [2], route: "Unresolved" })).toEqual({
		segments: [2],
		route: "Unresolved",
	});
});

// The Reading half: Dumgen's resolve.reading (#877).

const kommen = kommt.surface.lemma;
const resolvedKommt = parseResolvedGrammar({
	encounter: {
		sentence,
		target: { family: "Lexeme", kind: "VERB", memberSegmentIndices: [2] },
	},
	attestation: kommt,
});

test("a click's Reading is Dumgen's resolve.reading over the Attestation, its unit and the stored Emoji Descriptions", async () => {
	const fake = fakeDumgen(
		{ _tag: "Unresolved" },
		{ _tag: "Reuse", emojiDescription: "🚶" },
	);
	const reading = await Effect.runPromise(
		dumgenClickResolution(fake.dumgen).reading({
			grammar: resolvedKommt,
			lemma: kommen,
			candidates: ["🚶", "🔜"],
		}),
	);
	expect(fake.readingInputs[0]).toEqual({
		attestation: kommt,
		sentence: {
			text: "Er kommt.",
			segments: sentence.segments,
			units: [{ segments: [2], route: verb }],
		},
		unit: { segments: [2], route: verb },
		candidates: ["🚶", "🔜"],
	});
	expect(reading).toEqual({ decision: "Reuse", emojiDescription: "🚶" });
});

test("a New carries the candidates its judge saw, and a stale re-judge passes the written description back", async () => {
	const fake = fakeDumgen(
		{ _tag: "Unresolved" },
		{ _tag: "New", emojiDescription: "🔜" },
	);
	const resolution = dumgenClickResolution(fake.dumgen);
	expect(
		await Effect.runPromise(
			resolution.reading({
				grammar: resolvedKommt,
				lemma: kommen,
				candidates: ["🚶"],
				written: "🔜",
			}),
		),
	).toEqual({ decision: "New", emojiDescription: "🔜", candidates: ["🚶"] });
	expect(fake.readingInputs[0]?.written).toBe("🔜");
});

test("a Reading Catalog Miss comes back as tf-demo's signal", async () => {
	const fake = fakeDumgen(
		{ _tag: "Unresolved" },
		{
			_tag: "CatalogMiss",
			route: verb,
			message: "No authored Reading of VERB kommen",
		},
	);
	expect(
		await Effect.runPromise(
			dumgenClickResolution(fake.dumgen).reading({
				grammar: resolvedKommt,
				lemma: kommen,
				candidates: [],
			}),
		),
	).toEqual({
		decision: "CatalogMiss",
		stage: "resolve.reading",
		route: "de/Lexeme/VERB",
		message: "No authored Reading of VERB kommen",
	});
});
