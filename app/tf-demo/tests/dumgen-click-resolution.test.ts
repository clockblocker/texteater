import { expect, test } from "bun:test";
import type {
	GrammarResolution,
	ReadingResolution,
	ResolveGrammarInput,
	ResolveReadingInput,
} from "dumgen";
import { JevTransport, LunaTransport } from "dumgen";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
	type CallPolicy,
	clickCallDeadlineMs,
	clickDumgen,
	deploymentDumgen,
	knowledgeDumgen,
	replaceModelTransports,
} from "../convex/model/deploymentDumgen";
import type { ClickGrammarInput } from "../server/clickResolution";
import {
	type ClickDumgen,
	dumgenClickResolution,
} from "../server/dumgenClickResolution";
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
			coreFeatures: { hasSepPrefix: null },
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
	const inputs: ResolveGrammarInput<"de" | "he">[] = [];
	const readingInputs: ResolveReadingInput<"de" | "he">[] = [];
	let built = 0;
	const dumgen = (): ClickDumgen<never> => {
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

test("a click's grammar is Dumgen's resolve.grammar over the stored unit among the Sentence's others, and its Attestation becomes a Grammar checkpoint", async () => {
	const fake = fakeDumgen({ _tag: "Resolved", attestation: kommt });
	const er = storedUnitOf({
		segments: [0],
		route: { family: "Lexeme", kind: "PRON" },
		variants: [{ family: "Lexeme", kind: "PRON" }],
		identity: { kind: "PRON", canonicalForm: "er", pronType: "Prs" },
	});
	const grammar = await Effect.runPromise(
		dumgenClickResolution(fake.dumgen).grammar({
			sentence,
			clickedSegmentIndex: 2,
			units: [er, { segments: [2], route: verb }],
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
			// Grammar reads the units around the clicked one (#1337).
			units: [
				{
					segments: [0],
					route: er.route,
					identity: er.identity,
				},
				{ segments: [2], route: verb },
			],
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

test("the word intake stored for a piece reaches Dumgen, and the Encounter keeps only the Segments' kind and text", async () => {
	// Geht0 's1 _2 gut3 .4: intake read 's as es.
	const gehts: ClickGrammarInput["sentence"] = {
		id: "sentence-2",
		language: "de",
		segments: [
			{ kind: "ResolvableText", text: "Geht", surface: "geht" },
			{ kind: "ResolvableText", text: "'s", surface: "es" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "gut" },
			{ kind: "Punctuation", text: "." },
		],
	};
	const fake = fakeDumgen({ _tag: "Resolved", attestation: kommt });
	const grammar = await Effect.runPromise(
		dumgenClickResolution(fake.dumgen).grammar({
			sentence: gehts,
			clickedSegmentIndex: 0,
			units: [],
			unit: { segments: [0, 1], route: verb },
			lemmaCandidates: [],
			neighbours: {},
		}),
	);
	expect(fake.inputs[0]?.sentence.segments).toEqual(gehts.segments);
	if (grammar.decision !== "Resolved") throw Error("Expected Resolved");
	expect(grammar.encounter.sentence.segments).toEqual(
		gehts.segments.map(({ kind, text }) => ({ kind, text })),
	);
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
			units: [],
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
					units: [],
					...(unit ? { unit } : {}),
					lemmaCandidates: [],
					neighbours: {},
				}),
			),
		).toEqual({ decision: "Unresolved", language: "de" });
	expect(fake.built()).toBe(0);
});

test("a click's model calls take a 15 s deadline unless the deployment sets one", () => {
	expect(clickCallDeadlineMs(undefined)).toBe(15_000);
	expect(clickCallDeadlineMs("8000")).toBe(8000);
	expect(() => clickCallDeadlineMs("soon")).toThrow("positive whole number");
});

test("a click's and a Knowledge run's Luna cache their prompts; only a click's calls take the click deadline", () => {
	const built: { jev: CallPolicy[]; luna: CallPolicy[] } = {
		jev: [],
		luna: [],
	};
	const unused = async (): Promise<never> => {
		throw Error("No model call is expected.");
	};
	const restore = replaceModelTransports({
		jev: (policy) => {
			built.jev.push(policy);
			return JevTransport.fromAsk(unused);
		},
		luna: (policy) => {
			built.luna.push(policy);
			return LunaTransport.fromAsk(unused);
		},
	});
	try {
		for (const dumgen of [
			clickDumgen(),
			knowledgeDumgen,
			Layer.suspend(() => deploymentDumgen()),
		])
			Effect.runSync(Effect.scoped(Layer.build(dumgen)));
	} finally {
		restore();
	}
	const click = { timeoutMs: 15_000, promptCaching: true };
	expect(built.luna).toEqual([click, { promptCaching: true }, {}]);
	expect(built.jev).toEqual(built.luna);
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

test("Luna's draft comes back with the Attestation, reaches resolve.reading, and stays out of the Grammar checkpoint", async () => {
	const fake = fakeDumgen({
		_tag: "Resolved",
		attestation: kommt,
		drafted: "🚶",
	});
	const resolution = dumgenClickResolution(fake.dumgen);
	const grammar = await Effect.runPromise(
		resolution.grammar({
			sentence,
			clickedSegmentIndex: 2,
			units: [],
			unit: { segments: [2], route: verb },
			lemmaCandidates: [],
			neighbours: {},
		}),
	);
	if (grammar.decision !== "Resolved") throw Error("Expected Resolved");
	expect(grammar.drafted).toBe("🚶");
	expect(parseResolvedGrammar(grammar)).not.toHaveProperty("drafted");
	await Effect.runPromise(
		resolution.reading({
			grammar,
			lemma: kommen,
			candidates: [],
			drafted: "🚶",
		}),
	);
	expect(fake.readingInputs[0]?.drafted).toBe("🚶");
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

// A Reading with an Optional Reflexive Slot on a reflexive click (ADR 0052).

const ruhtSichAus = {
	...kommt,
	surface: {
		...kommt.surface,
		lemma: {
			...kommen,
			canonicalForm: "ausruhen",
			coreFeatures: { hasSepPrefix: "aus" },
		},
		normalizedSurface: "ruht aus",
	},
	members: [
		{ attested: "ruht", orthography: "Standard" },
		{ attested: "sich", orthography: "Standard" },
		{ attested: "aus", orthography: "Standard" },
	],
	valencyEvidence: [
		{
			member: 1,
			complement: { kind: "Reflexive", governedCase: "Acc" },
			realizedCase: "Acc",
		},
	],
} as Dumling.Attestation<"de">;

test("a click with a lexical reflexive asks stored Knowledge for the Readings whose Reflexive Slot is Optional, and passes them on", async () => {
	const segments = ["Er", " ", "ruht", " ", "sich", " ", "aus", "."];
	const resolved = parseResolvedGrammar({
		encounter: {
			sentence: {
				...sentence,
				segments: segments.map((text) => ({
					kind:
						text === " "
							? "Whitespace"
							: text === "."
								? "Punctuation"
								: "ResolvableText",
					text,
				})),
			},
			target: {
				family: "Lexeme",
				kind: "VERB",
				memberSegmentIndices: [2, 4, 6],
			},
		},
		attestation: ruhtSichAus,
	});
	const asked: Dumling.Lemma<"de">[] = [];
	const lookup = async (lemma: Dumling.Lemma<"de">) => {
		asked.push(lemma);
		return ["😴"];
	};
	const fake = fakeDumgen(
		{ _tag: "Unresolved" },
		{ _tag: "Reuse", emojiDescription: "😴" },
	);
	const resolution = dumgenClickResolution(fake.dumgen, lookup);
	await Effect.runPromise(
		resolution.reading({
			grammar: resolved,
			lemma: ruhtSichAus.surface.lemma,
			candidates: ["😴", "🪞🧘"],
		}),
	);
	expect(asked).toEqual([ruhtSichAus.surface.lemma]);
	expect(fake.readingInputs[0]?.optionallyReflexive).toEqual(["😴"]);
	// A click with no reflexive asks nothing.
	await Effect.runPromise(
		resolution.reading({
			grammar: resolvedKommt,
			lemma: kommen,
			candidates: ["🚶"],
		}),
	);
	expect(asked).toHaveLength(1);
	expect(fake.readingInputs[1]).not.toHaveProperty("optionallyReflexive");
});
