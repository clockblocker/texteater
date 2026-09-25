import { expect, test } from "bun:test";
import { required } from "common-utils";
import {
	createDumgen,
	selectGrammaticalAlternatives,
	validateEncounter,
} from "dumgen";
import { comparisonInputSchema } from "dumgen/schemas";
import type { ComparisonInput, Encounter } from "dumgen/types";
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { Effect } from "effect";
import { authoredMembers } from "../src/concrete-lang/de/authored-closed-sets/inventory.js";
import nounCases from "../src/concrete-lang/de/grammatical-resolution/lexeme/noun/corpus.json";
import verbCases from "../src/concrete-lang/de/grammatical-resolution/lexeme/verb/corpus.json";
import {
	executeOutput,
	grammarFixture,
	knowledgeFixture,
	queuedTargetJudgment,
	readingJudgment,
	rejectJudgment,
} from "../src/testing.js";

const nounOutput = nounCases["grammar-de-noun-demo-citation-haus"].idealOutput;
const noun: Dumling.Lemma<"de", "Lexeme", "NOUN"> = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Bank",
	coreFeatures: { gender: "Fem", hyph: null },
};
const encounter = {
	sentence: {
		id: "test",
		language: "de",
		segments: [{ kind: "ResolvableText", text: "Bank" }],
	},
	target: { family: "Lexeme", kind: "NOUN", memberSegmentIndices: [0] },
} as const satisfies Encounter<"de">;
function controlled(output: unknown) {
	const calls: import("dumgen/types").ModelExchange["request"][] = [];
	return {
		calls,
		dumgen: createDumgen({
			judge: (request, options) =>
				Object.keys(request.questions).some((key) =>
					key.startsWith("relation_"),
				)
					? knowledgeFixture(output).judge(request, options)
					: Object.hasOwn(request.questions, "reading")
						? readingJudgment(output)(request, options)
						: grammarFixture(output).judge(request, options),
			onModelExchange: (exchange) => calls.push(exchange.request),
			execute: executeOutput(async (request) => {
				return request.stage === "produceKnowledge"
					? (await knowledgeFixture(output).execute(request)).output
					: request.route.endsWith("/text")
						? (await grammarFixture(output).execute(request)).output
						: (output as { emojiDescription?: unknown })
								.emojiDescription;
			}),
		}),
	};
}
async function tag(task: Effect.Effect<unknown, unknown>) {
	const result = await Effect.runPromise(Effect.either(task));
	return result._tag === "Left"
		? (result.left as { _tag: string })._tag
		: "Success";
}
test("direct targets and classified targets share one grammar path", async () => {
	const calls: import("dumgen/types").ModelExchange["request"][] = [];
	const dumgen = createDumgen({
		judge: (request, options) =>
			Object.hasOwn(request.questions, "route")
				? queuedTargetJudgment([encounter.target])(request, options)
				: grammarFixture(nounOutput).judge(request, options),
		onModelExchange: (exchange) => calls.push(exchange.request),
		execute: executeOutput(async (request) => {
			return request.stage === "classifyTarget"
				? {
						decision: "Resolved",
						target: { family: "Lexeme", kind: "NOUN" },
						additionalMemberIndices: [],
					}
				: nounOutput;
		}),
	});
	const sentence = {
		...encounter.sentence,
		segments: [{ kind: "ResolvableText" as const, text: "Haus" }],
	};
	const target = await Effect.runPromise(
		dumgen.classifyTarget({ sentence, clickedSegmentIndex: 0 }),
	);
	const result = await Effect.runPromise(
		dumgen.resolveGrammar({ sentence, target, contextAvailable: false }),
	);
	expect(calls.map((call) => call.stage)).toEqual([
		"classifyTarget",
		"resolveGrammar",
	]);
	expect(result.surface.lemma.canonicalForm).toBe("Haus");
	expect(parseUnit(result).success).toBe(true);
	expect(
		await Effect.runPromise(
			dumgen.resolveGrammar({
				sentence,
				target,
				contextAvailable: false,
			}),
		),
	).toEqual(result);
	expect(calls[2]?.input).toEqual(calls[1]?.input);
});
test("invalid encounters fail before execution; unsupported, unresolved and provider failures differ", async () => {
	const { dumgen, calls } = controlled(null);
	for (const indices of [[], [0, 0], [1], [1, 0]])
		expect(
			await tag(
				dumgen.resolveGrammar({
					...({
						...encounter,
						target: {
							...encounter.target,
							memberSegmentIndices: indices,
						},
					} as unknown as Encounter<"de">),
					contextAvailable: false,
				}),
			),
		).toBe("InvalidInput");
	expect(
		await tag(
			dumgen.classifyTarget({
				sentence: encounter.sentence,
				clickedSegmentIndex: 2,
			}),
		),
	).toBe("InvalidInput");
	expect(calls).toHaveLength(0);
	expect(
		await tag(
			dumgen.resolveGrammar({
				sentence: { ...encounter.sentence, language: "he" },
				target: {
					family: "Lexeme",
					kind: "NOUN",
					memberSegmentIndices: [0],
				},
				contextAvailable: false,
			}),
		),
	).toBe("NotImplemented");
	expect(
		await tag(
			controlled({ decision: "Unresolved" }).dumgen.resolveGrammar({
				...encounter,
				contextAvailable: false,
			}),
		),
	).toBe("Unresolved");
	expect(
		await tag(
			createDumgen({
				judge: rejectJudgment,
				execute: executeOutput(async () => {
					throw Error("offline");
				}),
			}).resolveGrammar({ ...encounter, contextAvailable: false }),
		),
	).toBe("ProviderFailure");
	expect(
		await tag(
			dumgen.resolveGrammar({ ...encounter, contextAvailable: false }),
		),
	).toBe("InvalidModelOutput");
	expect(() =>
		validateEncounter({
			...encounter,
			target: {
				family: "Lexeme",
				kind: "Idiom",
				memberSegmentIndices: [0],
			},
		}),
	).toThrow();
});
test("emoji operations use exact candidates and omit options for candidate-free generation", async () => {
	const { dumgen, calls } = controlled({ emojiDescription: "💰" });
	expect(
		await Effect.runPromise(
			dumgen.resolveOrGenerateReadingEmojiDescription({
				encounter,
				lemma: noun,
				candidates: ["💰"],
			}),
		),
	).toEqual({ decision: "Reuse", emojiDescription: "💰" });
	expect(
		await Effect.runPromise(
			dumgen.resolveOrGenerateReadingEmojiDescription({
				encounter,
				lemma: noun,
				candidates: ["🪑"],
			}),
		),
	).toEqual({ decision: "New", emojiDescription: "💰" });
	expect(
		await Effect.runPromise(
			dumgen.resolveOrGenerateReadingEmojiDescription({
				encounter,
				lemma: noun,
				candidates: [],
			}),
		),
	).toEqual({ decision: "New", emojiDescription: "💰" });
	expect(calls[0]?.input).toMatchObject({
		markedContext: "<TARGET>Bank</TARGET>",
		members: ["Bank"],
		lemma: noun,
		candidates: ["💰"],
	});
	expect(calls[0]?.input).not.toHaveProperty("encounter");
	expect(calls[3]?.input).toEqual({
		markedContext: "<TARGET>Bank</TARGET>",
		lemma: "Bank",
	});
	const generation = calls[3];
	expect(generation).toHaveProperty("outputFormat", "text");
	expect(generation).not.toHaveProperty("outputSchema");
	if (generation && "systemPrompt" in generation) {
		expect(generation.systemPrompt).toContain(
			"Return only one to four emoji graphemes, directly as text.",
		);
		expect(generation.systemPrompt).not.toContain('emojiDescription":');
	}
	expect(
		await tag(
			dumgen.resolveOrGenerateReadingEmojiDescription({
				encounter,
				lemma: {
					...noun,
					kind: "ADJ",
				},
			} as unknown as ComparisonInput<"de">),
		),
	).toBe("InvalidInput");
});
test("Knowledge carries a supplied encounter and code-owned target language and Family", async () => {
	const reading: Dumling.Reading<"de", "Lexeme", "NOUN"> = {
		unitKind: "Reading",
		lemma: noun,
		emojiDescription: "💰",
	};
	const request = { semanticRelations: { synonym: null } };
	const { dumgen, calls } = controlled({
		semanticRelations: {
			synonym: [
				{ canonicalForm: "Geldinstitut", kind: "NOUN" },
				{ canonicalForm: "Sparkasse", kind: "PROPN" },
			],
		},
	});
	const production = await Effect.runPromise(
		dumgen.produceKnowledge({ encounter, reading, request }),
	);
	expect(production.pendingRelations.map((item) => item.target)).toEqual([
		{
			canonicalForm: "Geldinstitut",
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
		},
		{
			canonicalForm: "Sparkasse",
			language: "de",
			family: "Lexeme",
			kind: "PROPN",
		},
	]);
	expect(calls).toHaveLength(2);
	expect(
		await tag(
			dumgen.produceKnowledge({ reading, request } as Parameters<
				typeof dumgen.produceKnowledge
			>[0]),
		),
	).toBe("InvalidInput");
	expect(calls).toHaveLength(2);
	expect(
		await tag(
			controlled({
				semanticRelations: {
					synonym: [{ canonicalForm: "x", kind: "Idiom" }],
				},
			}).dumgen.produceKnowledge({ encounter, reading, request }),
		),
	).toBe("Success");
	expect(
		await tag(
			dumgen.produceKnowledge({
				encounter,
				reading,
				request: { lexicalBreakdown: null },
			}),
		),
	).toBe("InvalidInput");
});
test("Closed Catalogs resolve internally and never fall through; Open population misses generate", async () => {
	const member = required(
		authoredMembers.find((member) => member.lemma.kind === "DET"),
		"Expected an authored determiner",
	);
	const fixedEncounter = validateEncounter({
		...encounter,
		target: { family: "Lexeme", kind: "DET", memberSegmentIndices: [0] },
	});
	const { dumgen, calls } = controlled({ emojiDescription: "✨" });
	expect(
		await Effect.runPromise(
			dumgen.resolveOrGenerateReadingEmojiDescription(
				comparisonInputSchema.parse({
					candidates: [],
					encounter: fixedEncounter,
					lemma: member.lemma,
				}),
			),
		),
	).toEqual({
		decision: "New",
		emojiDescription: member.reading.emojiDescription,
	});
	expect(calls).toHaveLength(0);
	expect(
		await tag(
			dumgen.resolveOrGenerateReadingEmojiDescription(
				comparisonInputSchema.parse({
					candidates: [],
					encounter: fixedEncounter,
					lemma: { ...member.lemma, canonicalForm: "unreviewed" },
				}),
			),
		),
	).toBe("CatalogMiss");
	expect(calls).toHaveLength(0);
	const pron = required(
		authoredMembers.find((member) => member.lemma.kind === "PRON"),
		"Expected an authored pronoun",
	);
	const openEncounter = validateEncounter({
		...encounter,
		target: { family: "Lexeme", kind: "PRON", memberSegmentIndices: [0] },
	});
	expect(
		await Effect.runPromise(
			dumgen.resolveOrGenerateReadingEmojiDescription(
				comparisonInputSchema.parse({
					candidates: [],
					encounter: openEncounter,
					lemma: { ...pron.lemma, canonicalForm: "unreviewed" },
				}),
			),
		),
	).toEqual({ decision: "New", emojiDescription: "✨" });
	expect(calls).toHaveLength(1);
});
test("feature navigation preserves Case and compares unmarked values literally", () => {
	const find = (form: string, grammaticalCase: string) =>
		required(
			authoredMembers.find(
				(member) =>
					member.lemma.kind === "PRON" &&
					member.lemma.canonicalForm === form &&
					member.lemma.coreFeatures.case === grammaticalCase,
			),
			`Expected authored pronoun ${form}/${grammaticalCase}`,
		).lemma as Dumling.Lemma<"de", "Lexeme", "PRON">;
	const mich = find("mich", "Acc");
	expect(
		selectGrammaticalAlternatives({ source: mich, vary: ["case"] }).some(
			(reading) => reading.lemma.canonicalForm === "mir",
		),
	).toBe(true);
	expect(
		selectGrammaticalAlternatives({
			source: mich,
			vary: ["number"],
		}).some((reading) => reading.lemma.canonicalForm === "uns"),
	).toBe(true);
	expect(
		selectGrammaticalAlternatives({
			source: find("uns", "Acc"),
			vary: ["case"],
		}).some(
			(reading) =>
				reading.lemma.kind === "PRON" &&
				reading.lemma.canonicalForm === "uns" &&
				reading.lemma.coreFeatures.case === "Dat",
		),
	).toBe(true);
	expect(selectGrammaticalAlternatives({ source: mich, vary: [] })).toEqual(
		[],
	);
});
test("varying case from er reaches only er's own cells, never a neuter one", () => {
	const personal = (form: string, grammaticalCase: string) =>
		required(
			authoredMembers.find(
				(member) =>
					member.lemma.kind === "PRON" &&
					member.lemma.canonicalForm === form &&
					member.lemma.coreFeatures.case === grammaticalCase &&
					member.lemma.coreFeatures.pronType === "Prs",
			),
			`Expected authored pronoun ${form}/${grammaticalCase}`,
		).lemma as Dumling.Lemma<"de", "Lexeme", "PRON">;
	const cells = (source: Dumling.Lemma<"de", "Lexeme", "PRON">) =>
		selectGrammaticalAlternatives({ source, vary: ["case"] })
			.map((reading) => {
				const core = (
					reading.lemma as Dumling.Lemma<"de", "Lexeme", "PRON">
				).coreFeatures;
				return `${reading.lemma.canonicalForm}/${core.case}.${core.gender}`;
			})
			.sort();
	expect(cells(personal("er", "Nom"))).toEqual([
		"ihm/Dat.Masc",
		"ihn/Acc.Masc",
		"seiner/Gen.Masc",
	]);
	expect(cells(personal("es", "Nom"))).toEqual([
		"es/Acc.Neut",
		"ihm/Dat.Neut",
		"seiner/Gen.Neut",
	]);
});
test("feature navigation walks German article cells like pronoun cells", () => {
	const dem = required(
		authoredMembers.find(
			(member) =>
				member.lemma.kind === "DET" &&
				member.lemma.canonicalForm === "dem" &&
				member.lemma.coreFeatures.pronType === "Art" &&
				member.lemma.coreFeatures.gender === "Masc",
		),
		"Expected the dative masculine definite article",
	).lemma as Dumling.Lemma<"de", "Lexeme", "DET">;
	const cells = (
		vary: Parameters<typeof selectGrammaticalAlternatives>[0]["vary"],
	) =>
		selectGrammaticalAlternatives({ source: dem, vary }).map((reading) => {
			const core = (reading.lemma as Dumling.Lemma<"de", "Lexeme", "DET">)
				.coreFeatures;
			return `${reading.lemma.canonicalForm}/${core.case}.${core.gender}.${core.number}`;
		});
	expect(cells(["case"]).sort()).toEqual([
		"den/Acc.Masc.Sing",
		"der/Nom.Masc.Sing",
		"des/Gen.Masc.Sing",
	]);
	expect(cells(["gender"]).sort()).toEqual([
		"dem/Dat.Neut.Sing",
		"der/Dat.Fem.Sing",
	]);
	expect(cells(["number", "gender"])).toContain("den/Dat.null.Plur");
});
test("feature navigation reaches the der-series cells that were once listed as synonyms", () => {
	const dem = required(
		authoredMembers.find(
			(member) =>
				member.lemma.kind === "PRON" &&
				member.lemma.canonicalForm === "dem" &&
				member.lemma.coreFeatures.pronType === "Dem" &&
				member.lemma.coreFeatures.gender === "Masc",
		),
		"Expected the dative masculine demonstrative pronoun",
	);
	expect(dem.knowledge.semanticRelations).toBeUndefined();
	const reached = new Set(
		selectGrammaticalAlternatives({
			source: dem.lemma as Dumling.Lemma<"de", "Lexeme", "PRON">,
			vary: ["case", "number", "gender"],
		}).map((reading) => reading.lemma.canonicalForm),
	);
	for (const form of ["der", "die", "das", "den", "dessen", "deren", "denen"])
		expect(reached.has(form), form).toBe(true);
});
test("migrated finite verb evidence remains present", () => {
	expect(
		verbCases["grammar-de-verb-finite-liest"].idealOutput.surface
			.inflectionalFeatures,
	).toMatchObject({
		mood: "Ind",
		number: "Sing",
		person: "3",
		tense: "Pres",
		verbForm: "Fin",
	});
});
test("segmentSentence trusts the caller's language and skips intake", async () => {
	const { calls, dumgen } = controlled({});
	const sentence = await Effect.runPromise(
		dumgen.segmentSentence({
			language: "de",
			stitchedText: "  Ein Gebäude,\n in dem   Menschen wohnen.  ",
		}),
	);
	expect(calls).toHaveLength(0);
	expect(sentence.language).toBe("de");
	expect(sentence.segments.map((segment) => segment.text).join("")).toBe(
		"Ein Gebäude, in dem Menschen wohnen.",
	);
	expect(
		sentence.segments.filter(
			(segment) => segment.kind === "ResolvableText",
		),
	).toHaveLength(6);
	expect(
		await tag(
			dumgen.segmentSentence({ language: "de", stitchedText: " " }),
		),
	).toBe("InvalidInput");
	const hebrew = await Effect.runPromise(
		dumgen.segmentSentence({ language: "he", stitchedText: "שלום עולם!" }),
	);
	expect(hebrew.language).toBe("he");
	expect(hebrew.segments.length).toBeGreaterThan(1);
});
