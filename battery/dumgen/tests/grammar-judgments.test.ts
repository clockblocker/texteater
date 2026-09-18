import { expect, test } from "bun:test";
import { Effect } from "effect";
import verbCases from "../src/concrete-lang/de/grammatical-resolution/lexeme/verb/corpus.json";
import review from "../src/evaluation/redesign/review-cases.json";
import type { OperationTrace } from "../src/types.js";
import { createDumgen } from "../src/universal/dumgen.js";
import { validateEncounter } from "../src/universal/validation.js";
import { grammarFixture } from "./grammar-fixture.js";

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
				perfect: target.perfect ? "Yes" : null,
				future: target.future ? "Yes" : null,
				voice: target.passive ? "Pass" : null,
				passive: target.passive,
			};
			const golden = {
				lemma: {
					canonicalForm: target.canonicalForm,
					coreFeatures:
						target.kind === "AUX"
							? { verbType: "Mod" }
							: {
									hasGovPrep: null,
									hasSepPrefix: null,
									lexicallyReflexive: null,
									verbType: null,
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
				}).resolveGrammar(encounter),
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
			if (
				target.kind === "AUX" ||
				target.members.join(" ") === target.canonicalForm
			)
				expect(traces[0]?.calls).toHaveLength(1);
		}
	});
test("incompatible applicable features stop before missing-text generation", async () => {
	const traces: OperationTrace[] = [];
	const expected = verbCases["grammar-de-verb-finite-liest"].idealOutput;
	const options = grammarFixture(expected, {
		"surface.inflectionalFeatures.mood": "Unresolved",
	});
	const result = await Effect.runPromise(
		Effect.either(
			createDumgen({
				...options,
				onOperation: (trace) => traces.push(trace),
			}).resolveGrammar(
				validateEncounter({
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
			),
		),
	);
	expect(result).toMatchObject({
		_tag: "Left",
		left: { _tag: "Unresolved" },
	});
	expect(traces[0]?.calls).toHaveLength(1);
});

test("finite homograph canonical candidate resolves without generation", async () => {
	const expected = {
		lemma: {
			canonicalForm: "gehen",
			coreFeatures: {
				hasGovPrep: null,
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
		}).resolveGrammar(
			validateEncounter({
				sentence: {
					id: "finite-homograph",
					language: "de",
					segments: [
						{ kind: "ResolvableText", text: "Wir" },
						{ kind: "Whitespace", text: " " },
						{ kind: "ResolvableText", text: "gehen" },
						{ kind: "Whitespace", text: " " },
						{ kind: "ResolvableText", text: "ins" },
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
		),
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
			segments: [{ kind: "ResolvableText", text: "muss" }],
		},
		target: { family: "Lexeme", kind: "AUX", memberSegmentIndices: [0] },
	});
	const output = {
		lemma: { canonicalForm: "müssen", coreFeatures: { verbType: "Mod" } },
		surface: {
			spelling: "Canonical",
			surfaceFeatures: null,
			inflectionalFeatures: {
				verbForm: "Fin",
				tense: "Pres",
				mood: "Ind",
				person: "3",
				number: "Sing",
				perfect: null,
				future: null,
				passive: null,
				voice: null,
			},
		},
		memberOrthographies: ["Standard"],
		normalizedMembers: ["muss"],
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
				}).resolveGrammar(encounter),
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
				inflectionalFeatures: { ...inflection, article: null },
				articleReference: null,
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
			}).resolveGrammar(
				validateEncounter({
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
			),
		);
		expect(output.surface.lemma.canonicalForm).toBe(canonicalForm);
		expect(output.surface.normalizedSurface).toBe(normalized);
		expect(output.surface).toHaveProperty("inflectionalFeatures", {
			...inflection,
			article: null,
		});
		expect(output.members[0]?.attested).toBe(attested);
		const calls = traces[0]?.calls ?? [];
		expect(calls).toHaveLength(expectedCalls + 1);
		expect(calls.at(-1)?.request.route).toBe("de/Lexeme/NOUN/case");
		const request = calls[0]?.request;
		if (!request || !("questions" in request))
			throw Error("Expected feature batch");
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
		expect(request.questions).not.toHaveProperty([
			"surface.inflectionalFeatures.case",
		]);
		const caseRequest = calls.at(-1)?.request;
		if (!caseRequest || !("questions" in caseRequest))
			throw Error("Expected dependent Case judgment");
		expect(caseRequest.questions).toHaveProperty([
			"surface.inflectionalFeatures.case",
		]);
		if (expectedCalls === 2) {
			const generation = calls[1];
			if (!generation) throw Error("Expected headword generation");
			expect(generation.executor).toBe("Luna");
			expect(generation.request.stage).toBe("generateCanonicalForm");
			expect(generation.request.input).toMatchObject({
				needed: { canonicalForm: expect.any(String) },
			});
			expect(
				Object.keys(
					(generation.request.input as { needed: object }).needed,
				),
			).toEqual(["canonicalForm"]);
		}
	});

test("uncertain headword judgment stops without copying or generating", async () => {
	const traces: OperationTrace[] = [];
	const result = await Effect.runPromise(
		Effect.either(
			createDumgen({
				...grammarFixture(
					verbCases["grammar-de-verb-finite-liest"].idealOutput,
					{ canonical: "Unresolved" },
				),
				onOperation: (trace) => traces.push(trace),
			}).resolveGrammar(
				validateEncounter({
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
			),
		),
	);
	expect(result).toMatchObject({
		_tag: "Left",
		left: { _tag: "Unresolved" },
	});
	expect(traces[0]?.calls).toHaveLength(1);
});
