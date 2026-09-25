import { expect, test } from "bun:test";
import { Effect } from "effect";
import { closedParadigmVerb } from "../src/concrete-lang/de/authored-closed-sets/closed-verb-paradigms.js";
import { germanFusionTable } from "../src/concrete-lang/de/fusion-entries.js";
import { infinitiveShaped } from "../src/concrete-lang/de/grammatical-resolution/infinitive-shape.js";
import { possiblyInflectedNoun } from "../src/concrete-lang/de/grammatical-resolution/inflected-noun.js";
import review from "../src/evaluation/redesign/review-cases.json";
import nounProjection from "../src/generated/grammar-cases/lexeme/noun.json";
import verbProjection from "../src/generated/grammar-cases/lexeme/verb.json";
import proverbProjection from "../src/generated/grammar-cases/phraseme/proverb.json";
import { grammarFixture } from "../src/testing.js";
import type { OperationTrace } from "../src/types.js";
import { createDumgen } from "../src/universal/dumgen.js";
import { fusedWordPieces, fusionEntry } from "../src/universal/fusion-table.js";
import { validateEncounter } from "../src/universal/validation.js";

for (const example of review.constructions)
	test(`${example.id}: complete scoped grammar and independent supplied targets`, async () => {
		for (const target of example.targets) {
			const segments = example.sourceSentence
				.match(/\s+|[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu)!
				.map((text) => ({
					text,
					kind: /^\s+$/u.test(text)
						? "Whitespace"
						: /^[\p{L}\p{N}]+$/u.test(text)
							? "ResolvableText"
							: "Punctuation",
				}));
			let cursor = -1;
			const members = target.members.map((text) => {
				cursor = segments.findIndex(
					(segment, index) => index > cursor && segment.text === text,
				);
				return cursor;
			});
			const encounter = validateEncounter({
				sentence: { id: example.id, language: "de", segments },
				target: {
					family: "Lexeme",
					kind: target.kind,
					memberSegmentIndices: members,
				},
			});
			const features = {
				verbForm: target.form,
				tense: target.finiteTense,
				mood: target.form === "Fin" ? "Ind" : null,
				person: target.form === "Fin" ? "3" : null,
				number: target.form === "Fin" ? "Sing" : null,
				expletive: null,
				perfect: target.perfect ? "Yes" : null,
				future: target.future ? "Yes" : null,
				voice: target.passive ? "Pass" : null,
				passive: target.passive,
			};
			const golden = {
				lemma: {
					canonicalForm: target.canonicalForm,
					coreFeatures: {
						hasSepPrefix: null,
						lexicallyReflexive: null,
						verbType:
							target.canonicalForm === "müssen" ? "Mod" : null,
					},
				},
				surface: {
					spelling: "Canonical",
					surfaceFeatures: null,
					inflectionalFeatures: features,
				},
				memberOrthographies: target.members.map(() => "Standard"),
				normalizedMembers: target.members,
				realizationCoverage: "Full",
			};
			const traces: OperationTrace[] = [];
			const options = grammarFixture(
				golden,
				target.form === "Inf"
					? {
							"surface.inflectionalFeatures.tense": "Unresolved",
							"surface.inflectionalFeatures.person": "Unresolved",
							"surface.inflectionalFeatures.number": "Unresolved",
							"surface.inflectionalFeatures.mood": "Unresolved",
						}
					: {},
			);
			const output = await Effect.runPromise(
				createDumgen({
					...options,
					onOperation: (trace) => traces.push(trace),
				}).resolveGrammar({ ...encounter, contextAvailable: false }),
			);
			expect(output.surface).toHaveProperty(
				"inflectionalFeatures",
				features,
			);
			expect(output.surface.lemma.canonicalForm).toBe(
				target.canonicalForm,
			);
			expect(output.realizationCoverage).toBe("Full");
			expect(output.members.map((member) => member.attested)).toEqual(
				target.members,
			);
			expect(traces[0]?.calls[0]?.request.route).toEndWith("/features");
			expect(
				traces[0]?.calls.filter((call) => call.executor === "TypeSafe"),
			).toHaveLength(1);
			if (target.members.join(" ") === target.canonicalForm)
				expect(traces[0]?.calls).toHaveLength(1);
		}
	});
test("incompatible applicable features stop before missing-text generation", async () => {
	const traces: OperationTrace[] = [];
	const expected =
		verbProjection.cases["grammar-de-verb-finite-liest"].idealOutput;
	const options = grammarFixture(expected, {
		"surface.inflectionalFeatures.mood": "Unresolved",
	});
	const result = await Effect.runPromise(
		Effect.either(
			createDumgen({
				...options,
				onOperation: (trace) => traces.push(trace),
			}).resolveGrammar({
				...validateEncounter({
					sentence: {
						id: "invalid",
						language: "de",
						segments: [{ kind: "ResolvableText", text: "liest" }],
					},
					target: {
						family: "Lexeme",
						kind: "VERB",
						memberSegmentIndices: [0],
					},
				}),
				contextAvailable: false,
			}),
		),
	);
	expect(result).toMatchObject({
		_tag: "Left",
		left: { _tag: "Unresolved" },
	});
	expect(traces[0]?.calls).toHaveLength(1);
});

test("a bare mass noun keeps its click: NOUN Number never offers Unmarked", async () => {
	const expected = {
		lemma: {
			canonicalForm: "Obst",
			coreFeatures: { gender: "Neut", hyph: null },
		},
		surface: {
			spelling: "Canonical",
			surfaceFeatures: null,
			inflectionalFeatures: {
				case: "Acc",
				number: "Sing",
				article: "None",
			},
		},
		articleEvidence: null,
		memberOrthographies: ["Standard"],
		normalizedMembers: ["Obst"],
		realizationCoverage: "Full",
	};
	const numberPath = "surface.inflectionalFeatures.number";
	// Like jev, take Unmarked whenever it is offered; that answer contradicts
	// Marked inflection and used to lose the whole click.
	const prefersUnmarked = grammarFixture(expected, {
		[numberPath]: "Unmarked",
	}).judge;
	const { judge, ...options } = grammarFixture(expected);
	if (!judge || !prefersUnmarked) throw Error("Missing fixture judge");
	const traces: OperationTrace[] = [];
	const output = await Effect.runPromise(
		createDumgen({
			...options,
			judge: (request, settings) => {
				const number = request.questions[numberPath];
				return number?.type === "choice" &&
					"Unmarked" in number.criteria
					? prefersUnmarked(request, settings)
					: judge(request, settings);
			},
			onOperation: (trace) => traces.push(trace),
		}).resolveGrammar({
			...validateEncounter({
				sentence: {
					id: "bare-mass-noun",
					language: "de",
					segments: [
						{ kind: "ResolvableText", text: "Wir" },
						{ kind: "Whitespace", text: " " },
						{ kind: "ResolvableText", text: "kaufen" },
						{ kind: "Whitespace", text: " " },
						{ kind: "ResolvableText", text: "Obst" },
						{ kind: "Punctuation", text: "." },
					],
				},
				target: {
					family: "Lexeme",
					kind: "NOUN",
					memberSegmentIndices: [4],
				},
			}),
			contextAvailable: false,
		}),
	);
	const request = traces[0]?.calls[0]?.request;
	if (!request || !("questions" in request))
		throw Error("Expected feature judgment");
	expect(request.input).toHaveProperty(
		"markedContext",
		"Wir kaufen <TARGET>Obst</TARGET>.",
	);
	expect(Object.keys(request.questions[numberPath]?.criteria ?? {})).toEqual([
		"Plur",
		"Sing",
		"Unresolved",
	]);
	expect(output.surface.lemma.canonicalForm).toBe("Obst");
	expect(output.surface).toHaveProperty("inflectionalFeatures", {
		case: "Acc",
		number: "Sing",
		article: "None",
	});
});

test("finite homograph canonical candidate resolves without generation", async () => {
	const expected = {
		lemma: {
			canonicalForm: "gehen",
			coreFeatures: {
				hasSepPrefix: null,
				lexicallyReflexive: null,
				verbType: null,
			},
		},
		surface: {
			spelling: "Canonical",
			surfaceFeatures: null,
			inflectionalFeatures: {
				mood: "Ind",
				number: "Plur",
				person: "1",
				tense: "Pres",
				verbForm: "Fin",
				expletive: null,
				perfect: null,
				future: null,
				passive: null,
				voice: null,
			},
		},
		memberOrthographies: ["Standard"],
		normalizedMembers: ["gehen"],
		realizationCoverage: "Full",
	};
	const traces: OperationTrace[] = [];
	const output = await Effect.runPromise(
		createDumgen({
			...grammarFixture(expected),
			execute: async () => {
				throw Error("Canonical candidate must not invoke generation");
			},
			onOperation: (trace) => traces.push(trace),
		}).resolveGrammar({
			...validateEncounter({
				sentence: {
					id: "finite-homograph",
					language: "de",
					segments: [
						{ kind: "ResolvableText", text: "Wir" },
						{ kind: "Whitespace", text: " " },
						{ kind: "ResolvableText", text: "gehen" },
						{ kind: "Whitespace", text: " " },
						{ kind: "ResolvableText", text: "in" },
						{ kind: "ResolvableText", text: "s" },
						{ kind: "Whitespace", text: " " },
						{ kind: "ResolvableText", text: "Haus" },
						{ kind: "Punctuation", text: "." },
					],
				},
				target: {
					family: "Lexeme",
					kind: "VERB",
					memberSegmentIndices: [2],
				},
			}),
			contextAvailable: false,
		}),
	);
	expect(output.surface.lemma.canonicalForm).toBe("gehen");
	expect(traces[0]?.calls).toHaveLength(1);
	const request = traces[0]?.calls[0]?.request;
	if (!request || !("questions" in request))
		throw Error("Expected feature judgment");
	expect(request.input).toHaveProperty("canonicalFormCandidate", "gehen");
	expect(request.questions.canonical?.instructions).toContain(
		"`policy.canonicalForm`",
	);
	expect(request.input).toHaveProperty(
		"policy.canonicalExample",
		"In Wir gehen ins Haus, finite gehen has Canonical Form gehen.",
	);
});

test("AUX catalog absence and uncertainty remain distinct and never invoke Luna", async () => {
	const encounter = validateEncounter({
		sentence: {
			id: "aux",
			language: "de",
			segments: [{ kind: "ResolvableText", text: "wird" }],
		},
		target: { family: "Lexeme", kind: "AUX", memberSegmentIndices: [0] },
	});
	const output = {
		lemma: { canonicalForm: "werden", coreFeatures: { verbType: null } },
		surface: {
			spelling: "Canonical",
			surfaceFeatures: null,
			inflectionalFeatures: {
				verbForm: "Fin",
				tense: "Pres",
				mood: "Ind",
				person: "3",
				number: "Sing",
				expletive: null,
				perfect: null,
				future: null,
				passive: null,
				voice: null,
			},
		},
		memberOrthographies: ["Standard"],
		normalizedMembers: ["wird"],
		realizationCoverage: "Full",
	};
	for (const [identity, expected] of [
		["NoMatch", "CatalogMiss"],
		["Unresolved", "Unresolved"],
	]) {
		const options = grammarFixture(output, { identity: identity! });
		const traces: OperationTrace[] = [];
		const result = await Effect.runPromise(
			Effect.either(
				createDumgen({
					...options,
					execute: async () => {
						throw Error("Must not generate");
					},
					onOperation: (trace) => traces.push(trace),
				}).resolveGrammar({ ...encounter, contextAvailable: false }),
			),
		);
		expect(result).toMatchObject({
			_tag: "Left",
			left: { _tag: expected },
		});
		expect(traces[0]?.calls).toHaveLength(1);
	}
});

for (const [attested, canonicalForm, normalized, inflection, expectedCalls] of [
	["Aufstieg", "Aufstieg", "Aufstieg", { case: "Nom", number: "Sing" }, 1],
	["Häusern", "Haus", "Häusern", { case: "Dat", number: "Plur" }, 2],
	["aufstieg", "Aufstieg", "Aufstieg", { case: "Nom", number: "Sing" }, 2],
] as const)
	test(`${attested}: copy only the exact headword, otherwise generate missing text`, async () => {
		const expected = {
			lemma: {
				canonicalForm,
				coreFeatures: {
					gender: canonicalForm === "Haus" ? "Neut" : "Masc",
					hyph: null,
				},
			},
			surface: {
				spelling: "Canonical",
				surfaceFeatures: null,
				inflectionalFeatures: { ...inflection, article: "None" },
			},
			memberOrthographies: [
				attested === normalized ? "Standard" : "Typo",
			],
			normalizedMembers: [normalized],
			realizationCoverage: "Full",
		};
		const traces: OperationTrace[] = [];
		const output = await Effect.runPromise(
			createDumgen({
				...grammarFixture(expected),
				onOperation: (trace) => traces.push(trace),
			}).resolveGrammar({
				...validateEncounter({
					sentence: {
						id: "headword",
						language: "de",
						segments: [
							{ kind: "ResolvableText", text: attested },
							{
								kind: "OpaqueText",
								text: " — Wörterbuch: „Haus“, „Aufstieg“.",
							},
						],
					},
					target: {
						family: "Lexeme",
						kind: "NOUN",
						memberSegmentIndices: [0],
					},
				}),
				contextAvailable: false,
			}),
		);
		expect(output.surface.lemma.canonicalForm).toBe(canonicalForm);
		expect(output.surface.normalizedSurface).toBe(normalized);
		expect(output.surface).toHaveProperty("inflectionalFeatures", {
			...inflection,
			article: "None",
		});
		expect(output.members[0]?.attested).toBe(attested);
		const calls = traces[0]?.calls ?? [];
		// Case rides speculatively in the feature round trip; no separate call.
		expect(calls).toHaveLength(expectedCalls);
		expect(calls.map((call) => call.request.route)).not.toContain(
			"de/Lexeme/NOUN/case",
		);
		const request = calls[0]?.request;
		if (!request || !("questions" in request))
			throw Error("Expected feature batch");
		expect(Object.keys(request.questions)).toContain(
			"surface.inflectionalFeatures.case",
		);
		expect(Object.keys(request.questions)).not.toContain("attachment");
		expect(request.input).toHaveProperty(
			"canonicalFormCandidate",
			attested,
		);
		expect(request.questions.canonical).toMatchObject({
			type: "choice",
			criteria: {
				CandidateIsCanonical: expect.any(String),
				CandidateIsNotCanonical: expect.any(String),
				Unresolved: expect.any(String),
			},
		});
		expect(
			Object.keys(request.questions.canonical?.criteria ?? {}),
		).toEqual([
			"CandidateIsCanonical",
			"CandidateIsNotCanonical",
			"Unresolved",
		]);
		expect(request.questions).toHaveProperty(["lemma.coreFeatures.gender"]);
		if (expectedCalls === 2) {
			const generation = calls[1];
			if (!generation) throw Error("Expected headword generation");
			expect(generation.executor).toBe("Luna");
			expect(generation.request.stage).toBe("generateCanonicalForm");
			expect(generation.request.input).toBe(normalized);
		}
	});

test("uncertain headword judgment stops without copying or generating", async () => {
	const traces: OperationTrace[] = [];
	const result = await Effect.runPromise(
		Effect.either(
			createDumgen({
				...grammarFixture(
					verbProjection.cases["grammar-de-verb-finite-liest"]
						.idealOutput,
					{ canonical: "Unresolved" },
				),
				onOperation: (trace) => traces.push(trace),
			}).resolveGrammar({
				...validateEncounter({
					sentence: {
						id: "uncertain-headword",
						language: "de",
						segments: [{ kind: "ResolvableText", text: "liest" }],
					},
					target: {
						family: "Lexeme",
						kind: "VERB",
						memberSegmentIndices: [0],
					},
				}),
				contextAvailable: false,
			}),
		),
	);
	expect(result).toMatchObject({
		_tag: "Left",
		left: { _tag: "Unresolved" },
	});
	expect(traces[0]?.calls).toHaveLength(1);
});

/** An encounter from a corpus `<TARGET>` context. */
function markedEncounter(
	id: string,
	markedContext: string,
	kind: "VERB" | "NOUN" | "Proverb" = "VERB",
) {
	const segments: { text: string; kind: string }[] = [];
	const members: number[] = [];
	for (const [, target, text = ""] of markedContext.matchAll(
		/(<TARGET>)?(\s+|[\p{L}\p{N}]+|[^\s\p{L}\p{N}<])(?:<\/TARGET>)?/gu,
	)) {
		if (target) members.push(segments.length);
		// A fused word is one Segment per component (ADR 0035).
		const fusion = target
			? undefined
			: fusionEntry(germanFusionTable, text);
		for (const piece of fusion ? fusedWordPieces(fusion, text) : [text])
			segments.push({
				text: piece,
				kind: /^\s+$/u.test(piece)
					? "Whitespace"
					: /^[\p{L}\p{N}]+$/u.test(piece)
						? "ResolvableText"
						: "Punctuation",
			});
	}
	return validateEncounter({
		sentence: { id, language: "de", segments },
		target: {
			family: kind === "Proverb" ? "Phraseme" : "Lexeme",
			kind,
			memberSegmentIndices: members,
		},
	});
}

test("a saying keeps its capital initial against LowerInitial", async () => {
	const id = "grammar-de-proverb-dev-andere-laender";
	const example = proverbProjection.cases[id];
	const output = await Effect.runPromise(
		createDumgen(
			grammarFixture(example.idealOutput, {
				normalization_0: "LowerInitial",
			}),
		).resolveGrammar({
			...markedEncounter(id, example.input.markedContext, "Proverb"),
			contextAvailable: false,
		}),
	);
	expect(output.surface.normalizedSurface).toBe(
		"Andere Länder andere Sitten",
	);
	expect(output.surface.lemma.canonicalForm).toBe(
		"Andere Länder andere Sitten",
	);
});

for (const [id, rejected] of [
	["grammar-de-verb-prep-free-reflexive-erholen-im", "erholt sich"],
	["grammar-de-verb-imperative-lauf", "Lauf"],
] as const)
	test(`CandidateIsCanonical for finite ${rejected} generates the Canonical Form`, async () => {
		const example = verbProjection.cases[id];
		const traces: OperationTrace[] = [];
		const output = await Effect.runPromise(
			createDumgen({
				...grammarFixture(example.idealOutput, {
					canonical: "CandidateIsCanonical",
				}),
				onOperation: (trace) => traces.push(trace),
			}).resolveGrammar({
				...markedEncounter(id, example.input.markedContext),
				contextAvailable: false,
			}),
		);
		expect(output.surface.lemma.canonicalForm).toBe(
			example.idealOutput.lemma.canonicalForm,
		);
		const request = traces[0]?.calls[0]?.request;
		if (!request || !("questions" in request))
			throw Error("Expected feature judgment");
		expect(request.input).toHaveProperty(
			"canonicalFormCandidate",
			rejected,
		);
		const generation = traces[0]?.calls[1]?.request;
		expect(generation).toHaveProperty("stage", "generateCanonicalForm");
		expect(generation).toHaveProperty("outputFormat", "text");
		expect(traces[0]?.events).toContainEqual({
			kind: "NonInfinitiveCanonicalForm",
			data: { rejected, answer: "CandidateIsCanonical" },
		});
	});

for (const [id, canonicalForm] of [
	["grammar-de-verb-full-modal-mag", "mögen"],
	["grammar-de-verb-modal-moechte-bleiben", "mögen"],
	["grammar-de-verb-copula-perfect-ist-gewesen", "sein"],
	["grammar-de-verb-full-hat", "haben"],
] as const)
	test(`a closed paradigm names ${canonicalForm} without a Luna call: ${id}`, async () => {
		const example = verbProjection.cases[id];
		const traces: OperationTrace[] = [];
		const output = await Effect.runPromise(
			createDumgen({
				...grammarFixture(example.idealOutput),
				onOperation: (trace) => traces.push(trace),
			}).resolveGrammar({
				...markedEncounter(id, example.input.markedContext),
				contextAvailable: false,
			}),
		);
		expect(output.surface.lemma.canonicalForm).toBe(canonicalForm);
		expect(traces[0]?.calls.map((call) => call.executor)).toEqual([
			"TypeSafe",
		]);
	});

test("a closed paradigm names one Lemma or none", () => {
	expect(closedParadigmVerb(["muß"])).toBe("müssen");
	expect(closedParadigmVerb(["ist", "geworden"])).toBeUndefined();
	expect(closedParadigmVerb(["hat", "vor"])).toBeUndefined();
	// Recipient-passive verbs stay open as VERBs: kriegt is kriegen.
	expect(closedParadigmVerb(["kriegt"])).toBeUndefined();
	expect(closedParadigmVerb(["bekommt"])).toBeUndefined();
});

test("a canonically spelled, uninflected word is its own headword without Luna", async () => {
	const traces: OperationTrace[] = [];
	const output = await Effect.runPromise(
		createDumgen({
			...grammarFixture(
				{
					lemma: {
						canonicalForm: "anstatt",
						coreFeatures: { conjType: null },
					},
					surface: {
						spelling: "Canonical",
						surfaceFeatures: null,
					},
					normalizedMembers: ["anstatt"],
					memberOrthographies: ["Standard"],
					realizationCoverage: "Full",
				},
				// jev misses the lowercase headword of a sentence-initial word.
				{ canonical: "CandidateIsNotCanonical" },
			),
			onOperation: (trace) => traces.push(trace),
		}).resolveGrammar({
			...validateEncounter({
				sentence: {
					id: "bare-word",
					language: "de",
					segments: [
						{ kind: "ResolvableText", text: "Anstatt" },
						{ kind: "Whitespace", text: " " },
						{ kind: "ResolvableText", text: "zu" },
						{ kind: "Whitespace", text: " " },
						{ kind: "ResolvableText", text: "arbeiten" },
					],
				},
				target: {
					family: "Lexeme",
					kind: "SCONJ",
					memberSegmentIndices: [0],
				},
			}),
			contextAvailable: false,
		}),
	);
	expect(output.surface.lemma.canonicalForm).toBe("anstatt");
	expect(traces[0]?.calls.map((call) => call.executor)).toEqual(["TypeSafe"]);
});

for (const id of [
	"grammar-de-verb-subject-reflexive",
	"grammar-de-verb-subject-question",
	"grammar-de-verb-reflexive-schaemt",
	"grammar-de-verb-finite-liest",
] as const)
	test(`membership settles expletive and lexicallyReflexive: ${id}`, async () => {
		const example = verbProjection.cases[id];
		const traces: OperationTrace[] = [];
		const output = await Effect.runPromise(
			createDumgen({
				...grammarFixture(example.idealOutput),
				onOperation: (trace) => traces.push(trace),
			}).resolveGrammar({
				...markedEncounter(id, example.input.markedContext),
				contextAvailable: false,
			}),
		);
		const request = traces[0]?.calls[0]?.request;
		if (!request || !("questions" in request))
			throw Error("Expected feature judgment");
		const asked = Object.keys(request.questions);
		expect(asked).not.toContain("surface.inflectionalFeatures.expletive");
		expect(asked).not.toContain("lemma.coreFeatures.lexicallyReflexive");
		// Code normalizes a subject es, so its normalization is not asked.
		const es = example.input.members.findIndex(
			(member) => member.toLocaleLowerCase("de") === "es",
		);
		if (es !== -1) expect(asked).not.toContain(`normalization_${es}`);
		expect(output.surface).toHaveProperty(
			"inflectionalFeatures.expletive",
			example.idealOutput.surface.inflectionalFeatures.expletive,
		);
		expect(output.surface.lemma.coreFeatures).toHaveProperty(
			"lexicallyReflexive",
			example.idealOutput.lemma.coreFeatures.lexicallyReflexive,
		);
	});

test("every reviewed VERB Canonical Form is infinitive-shaped", () => {
	for (const example of Object.values(verbProjection.cases))
		expect(
			infinitiveShaped(example.idealOutput.lemma.canonicalForm),
		).toBeTrue();
	for (const text of ["erholt sich", "Lauf", "lauf", "gehst", "sich"])
		expect(infinitiveShaped(text)).toBeFalse();
});

/** A weak masculine noun, which is -n-final in every oblique singular Case. */
const weakNoun = {
	input: {
		markedContext:
			"Sie spricht mit <TARGET>dem</TARGET> <TARGET>Nachbarn</TARGET>.",
	},
	idealOutput: {
		lemma: {
			canonicalForm: "Nachbar",
			coreFeatures: { gender: "Masc", hyph: null },
		},
		surface: {
			spelling: "Canonical",
			surfaceFeatures: null,
			inflectionalFeatures: {
				case: "Dat",
				number: "Sing",
				article: "Definite",
			},
		},
		memberOrthographies: ["Standard", "Standard"],
		normalizedMembers: ["dem", "Nachbarn"],
		realizationCoverage: "Full",
		articleEvidence: { kind: "Owned", member: 0 },
	},
};

for (const [id, example, rejected] of [
	[
		"grammar-de-noun-dev-acc-plur-buecher",
		nounProjection.cases["grammar-de-noun-dev-acc-plur-buecher"],
		"Bücher",
	],
	[
		"grammar-de-noun-accept-dat-plur-haeusern",
		nounProjection.cases["grammar-de-noun-accept-dat-plur-haeusern"],
		"Häusern",
	],
	[
		"grammar-de-noun-dev-gen-sing-mannes",
		nounProjection.cases["grammar-de-noun-dev-gen-sing-mannes"],
		"Mannes",
	],
	["weak-dat-sing-nachbarn", weakNoun, "Nachbarn"],
] as const)
	test(`a copied inflected noun member ${rejected} generates the Canonical Form`, async () => {
		const traces: OperationTrace[] = [];
		const output = await Effect.runPromise(
			createDumgen({
				...grammarFixture(example.idealOutput, {
					canonical: "candidate_0",
				}),
				onOperation: (trace) => traces.push(trace),
			}).resolveGrammar({
				...markedEncounter(id, example.input.markedContext, "NOUN"),
				contextAvailable: false,
			}),
		);
		expect(output.surface.lemma.canonicalForm).toBe(
			example.idealOutput.lemma.canonicalForm,
		);
		const request = traces[0]?.calls[0]?.request;
		if (!request || !("questions" in request))
			throw Error("Expected feature judgment");
		// The owned article is never offered as the noun's headword.
		expect(
			Object.entries(request.questions.canonical?.criteria ?? {}).filter(
				([key]) => key.startsWith("candidate_"),
			),
		).toEqual([["candidate_0", rejected]]);
		const generation = traces[0]?.calls[1]?.request;
		expect(generation).toHaveProperty("stage", "generateCanonicalForm");
		expect(generation).toHaveProperty("outputFormat", "text");
		expect(traces[0]?.events).toContainEqual({
			kind: "InflectedNounCanonicalForm",
			data: { rejected, answer: "candidate_0" },
		});
	});

test("a copied noun member under an uninflecting Surface stays the Canonical Form", async () => {
	const id = "grammar-de-noun-dev-dat-sing-chef";
	const example = nounProjection.cases[id];
	const traces: OperationTrace[] = [];
	const output = await Effect.runPromise(
		createDumgen({
			...grammarFixture(example.idealOutput),
			onOperation: (trace) => traces.push(trace),
		}).resolveGrammar({
			...markedEncounter(id, example.input.markedContext, "NOUN"),
			contextAvailable: false,
		}),
	);
	expect(output.surface.lemma.canonicalForm).toBe("Chef");
	expect(traces[0]?.calls).toHaveLength(1);
});

test("a stored noun Lemma under its own plural text stays the Canonical Form", async () => {
	const id = "grammar-de-noun-dev-acc-plur-knie";
	const example = nounProjection.cases[id];
	const traces: OperationTrace[] = [];
	const output = await Effect.runPromise(
		createDumgen({
			...grammarFixture(example.idealOutput, {
				canonical: "CandidateIsCanonical",
			}),
			onOperation: (trace) => traces.push(trace),
		}).resolveGrammar(
			{
				...markedEncounter(id, example.input.markedContext, "NOUN"),
				contextAvailable: false,
			},
			[
				{
					lemma: {
						unitKind: "Lemma",
						language: "de",
						family: "Lexeme",
						kind: "NOUN",
						canonicalForm: "Knie",
						coreFeatures: { gender: "Neut", hyph: null },
					},
					foundUnder: ["Knie"],
				},
			],
		),
	);
	expect(output.surface.lemma.canonicalForm).toBe("Knie");
	expect(traces[0]?.calls).toHaveLength(1);
});

test("every reviewed noun inflected away from its headword is marked", () => {
	for (const example of Object.values(nounProjection.cases)) {
		const { lemma, surface, memberOrthographies, valencyEvidence } =
			example.idealOutput as {
				lemma?: {
					canonicalForm: string;
					coreFeatures: { gender: unknown };
				};
				surface?: {
					spelling: string;
					inflectionalFeatures: Record<string, unknown> | null;
				};
				memberOrthographies?: string[];
				valencyEvidence?: { member: number | null }[];
			};
		const features = surface?.inflectionalFeatures;
		if (!lemma || !features) continue;
		// The noun is the last member that realizes no governed preposition.
		const governed = new Set(
			(valencyEvidence ?? []).map((slot) => slot.member),
		);
		const position = example.input.members.findLastIndex(
			(_, index) => !governed.has(index),
		);
		const member = example.input.members[position] ?? "";
		// Typos, variants and suspended compounds differ by more than inflection.
		const inflectedOnly =
			surface?.spelling === "Canonical" &&
			memberOrthographies?.[position] === "Standard" &&
			!/[-‐‑]$/u.test(member);
		if (inflectedOnly && member !== lemma.canonicalForm)
			expect(
				possiblyInflectedNoun(member, {
					gender: lemma.coreFeatures.gender,
					number: features.number,
					case: features.case,
				}),
			).toBeTrue();
	}
	for (const [text, gender, number, case_] of [
		["Chef", "Masc", "Sing", "Dat"],
		["Stadt", "Fem", "Sing", "Acc"],
		["Frau", "Fem", "Sing", "Gen"],
		["Zeichen", "Neut", "Sing", "Dat"],
		["Nachbar", "Masc", "Sing", "Nom"],
	] as const)
		expect(
			possiblyInflectedNoun(text, { gender, number, case: case_ }),
		).toBeFalse();
});
