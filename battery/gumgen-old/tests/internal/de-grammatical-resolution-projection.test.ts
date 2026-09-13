import { describe, expect, test } from "bun:test";

import { projectDeGrammaticalResolution } from "../../src/grammatical-resolution/de/projection";

describe("German Grammatical Resolution projection interface", () => {
	test("owns fixed route fields and Citation-only route policy", () => {
		const result = projectDeGrammaticalResolution({
			input: {
				markedContext:
					"<TARGET>Entweder</TARGET> heute <TARGET>oder</TARGET> morgen",
				members: ["Entweder", "oder"],
			},
			output: {
				lemma: {
					canonicalForm: "entweder … oder",
					coreFeatures: { conjType: null },
				},
				memberOrthographies: ["Standard", "Standard"],
				normalizedMembers: ["entweder", "oder"],
				surface: {
					spelling: "Canonical",
					surfaceFeatures: { historicalStatus: null },
				},
			},
			route: { family: "Lexeme", kind: "CCONJ" },
		});

		expect(result).toEqual({
			lemma: {
				canonicalForm: "entweder … oder",
				coreFeatures: { conjType: null },
			},
			memberOrthographies: ["Standard", "Standard"],
			normalizedMembers: ["entweder", "oder"],
			realizationCoverage: "Full",
			route: { language: "de", family: "Lexeme", kind: "CCONJ" },
			surface: {
				normalizedSurface: "entweder oder",
				spelling: "Canonical",
				surfaceFeatures: null,
				surfaceKind: "Citation",
			},
		});
	});

	test("normalizes aligned members and applies route-fixed Lemma policy", () => {
		const result = projectDeGrammaticalResolution({
			input: {
				markedContext:
					"<TARGET>Pass</TARGET> die <TARGET>U\u0308bung</TARGET> <TARGET>auf</TARGET> <TARGET>auf</TARGET>",
				members: ["Pass", "U\u0308bung", "auf", "auf"],
			},
			output: {
				lemma: {
					canonicalForm: "aufpassen",
					coreFeatures: { hasSepPrefix: "Yes", verbType: "Aux" },
				},
				memberOrthographies: [
					"Standard",
					"Standard",
					"Standard",
					"Standard",
				],
				normalizedMembers: ["pass", "übung", "auf", "auf"],
				surface: {
					spelling: "Canonical",
					surfaceFeatures: null,
					surfaceKind: "Inflection",
				},
			},
			route: { family: "Lexeme", kind: "VERB" },
		});

		expect(result.surface.normalizedSurface).toBe("pass übung auf auf");
		expect(result.lemma.coreFeatures).toEqual({
			hasSepPrefix: "Yes",
			verbType: null,
		});
	});

	test("accepts prompt-owned typo repair without inventing edit distance", () => {
		const result = projectDeGrammaticalResolution({
			input: {
				markedContext: "Die <TARGET>Bnak</TARGET>.",
				members: ["Bnak"],
			},
			output: {
				lemma: { canonicalForm: "Bank" },
				memberOrthographies: ["Typo"],
				normalizedMembers: ["Bank"],
				surface: {
					spelling: "Canonical",
					surfaceFeatures: null,
					surfaceKind: "Inflection",
				},
			},
			route: { family: "Lexeme", kind: "NOUN" },
		});

		expect(result.surface.normalizedSurface).toBe("Bank");
	});

	test.each([
		["reordered", ["auf", "pass", "auf"]],
		["unrelated", ["pass", "banana", "auf"]],
		["leading whitespace", [" pass", "auf", "auf"]],
		["trailing whitespace", ["pass ", "auf", "auf"]],
		["repeated whitespace", ["pass", "auf  auf", "auf"]],
		["multiple source members", ["pass auf", "auf", "auf"]],
	] as const)(
		"rejects %s normalized members",
		(_label, normalizedMembers) => {
			expect(() =>
				projectDeGrammaticalResolution({
					input: {
						markedContext:
							"<TARGET>Pass</TARGET> <TARGET>auf</TARGET> <TARGET>auf</TARGET>",
						members: ["Pass", "auf", "auf"],
					},
					output: {
						lemma: { canonicalForm: "aufpassen" },
						memberOrthographies: [
							"Standard",
							"Standard",
							"Standard",
						],
						normalizedMembers,
						surface: {
							spelling: "Canonical",
							surfaceFeatures: null,
							surfaceKind: "Inflection",
						},
					},
					route: { family: "Lexeme", kind: "VERB" },
				}),
			).toThrow();
		},
	);

	test("rejects member cardinality drift", () => {
		expect(() =>
			projectDeGrammaticalResolution({
				input: {
					markedContext:
						"<TARGET>wartet</TARGET> <TARGET>auf</TARGET>",
					members: ["wartet", "auf"],
				},
				output: {
					lemma: { canonicalForm: "warten" },
					memberOrthographies: ["Standard", "Standard"],
					normalizedMembers: ["wartet"],
					surface: {
						spelling: "Canonical",
						surfaceFeatures: null,
						surfaceKind: "Inflection",
					},
				},
				route: { family: "Lexeme", kind: "VERB" },
			}),
		).toThrow(/align one-to-one/);
	});

	test("requires and preserves Phraseme realization coverage", () => {
		const args = {
			input: {
				markedContext: "<TARGET>Ende</TARGET> <TARGET>gut</TARGET>",
				members: ["Ende", "gut"],
			},
			output: {
				lemma: { canonicalForm: "Ende gut, alles gut" },
				memberOrthographies: ["Standard", "Standard"] as const,
				normalizedMembers: ["Ende", "gut"],
				surface: {
					spelling: "Canonical",
					surfaceFeatures: null,
				},
			},
			route: { family: "Phraseme", kind: "Proverb" } as const,
		};

		expect(
			projectDeGrammaticalResolution({
				...args,
				output: { ...args.output, realizationCoverage: "Partial" },
			}).realizationCoverage,
		).toBe("Partial");
		expect(() => projectDeGrammaticalResolution(args)).toThrow(
			/Phraseme.*realizationCoverage/,
		);
	});

	test.each(["-", "‐", "‑"])(
		"licenses NOUN Ergänzungsstrich completion for %s",
		(divis) => {
			const member = `Kinder${divis}`;
			const result = projectDeGrammaticalResolution({
				input: {
					markedContext: `Sie verkauft <TARGET>${member}</TARGET> und Jugendbücher.`,
					members: [member],
				},
				output: {
					lemma: { canonicalForm: "Kinderbuch" },
					memberOrthographies: ["Standard"],
					normalizedMembers: ["Kinderbücher"],
					surface: {
						spelling: "Canonical",
						surfaceFeatures: null,
						surfaceKind: "Inflection",
					},
				},
				route: { family: "Lexeme", kind: "NOUN" },
			});

			expect(result.surface.normalizedSurface).toBe("Kinderbücher");
		},
	);

	test("licenses typo repair before NOUN completion", () => {
		const result = projectDeGrammaticalResolution({
			input: {
				markedContext:
					"Sie verkauft <TARGET>Knder-</TARGET> und Jugendbücher.",
				members: ["Knder-"],
			},
			output: {
				lemma: { canonicalForm: "Kinderbuch" },
				memberOrthographies: ["Typo"],
				normalizedMembers: ["Kinderbücher"],
				surface: {
					spelling: "Canonical",
					surfaceFeatures: null,
					surfaceKind: "Inflection",
				},
			},
			route: { family: "Lexeme", kind: "NOUN" },
		});

		expect(result.surface.normalizedSurface).toBe("Kinderbücher");
	});

	test.each([
		["isolated", "<TARGET>Kinder-</TARGET>.", "Inflection"],
		[
			"three conjuncts",
			"<TARGET>Kinder-</TARGET>, Jugend- und Bilderbücher.",
			"Inflection",
		],
		[
			"bare right constituent",
			"<TARGET>Kinder-</TARGET> und Bücher.",
			"Inflection",
		],
		[
			"Citation",
			"Eintrag: <TARGET>Kinder-</TARGET> und Jugendbücher.",
			"Citation",
		],
	] as const)(
		"rejects %s NOUN suspension",
		(_label, markedContext, surfaceKind) => {
			expect(() =>
				projectDeGrammaticalResolution({
					input: { markedContext, members: ["Kinder-"] },
					output: {
						lemma: { canonicalForm: "Kinderbuch" },
						memberOrthographies: ["Standard"],
						normalizedMembers: ["Kinderbücher"],
						surface: {
							spelling: "Canonical",
							surfaceFeatures: null,
							surfaceKind,
						},
					},
					route: { family: "Lexeme", kind: "NOUN" },
				}),
			).toThrow(/NOUN suspended completion/);
		},
	);

	test("enforces route-specific Surface discrimination", () => {
		const base = {
			input: {
				markedContext: "<TARGET>schnell</TARGET>",
				members: ["schnell"],
			},
			output: {
				lemma: { canonicalForm: "schnell" },
				memberOrthographies: ["Standard"] as const,
				normalizedMembers: ["schnell"],
				surface: { spelling: "Canonical", surfaceFeatures: null },
			},
		};

		expect(() =>
			projectDeGrammaticalResolution({
				...base,
				route: { family: "Lexeme", kind: "ADJ" },
			}),
		).toThrow(/must discriminate Citation and Inflection/);
		expect(() =>
			projectDeGrammaticalResolution({
				...base,
				output: {
					...base.output,
					surface: {
						...base.output.surface,
						surfaceKind: "Inflection",
					},
				},
				route: { family: "Lexeme", kind: "CCONJ" },
			}),
		).toThrow(/exposes only Citation Surfaces/);
	});
});
