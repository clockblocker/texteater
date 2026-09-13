import { expect, test } from "bun:test";
import {
	createDumgen,
	selectGrammaticalAlternatives,
	validateEncounter,
} from "dumgen";
import type { Encounter, ModelRequest } from "dumgen/types";
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { Effect } from "effect";
import { authoredMembers } from "../src/concrete-lang/de/authored/inventory.js";
import nounCases from "../src/concrete-lang/de/grammatical-resolution/lexeme/noun/corpus.json";
import verbCases from "../src/concrete-lang/de/grammatical-resolution/lexeme/verb/corpus.json";

const nounOutput = nounCases["grammar-de-noun-demo-citation-haus"].idealOutput;
const noun: Dumling.Lemma<"de", "Lexeme", "NOUN"> = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Bank",
	coreFeatures: { gender: "Fem", hyph: null },
};
const encounter: Encounter<"de"> = {
	sentence: {
		id: "test",
		language: "de",
		segments: [{ kind: "ResolvableText", text: "Bank" }],
	},
	target: { family: "Lexeme", kind: "NOUN", memberSegmentIndices: [0] },
};
function controlled(output: unknown) {
	const calls: ModelRequest[] = [];
	return {
		calls,
		dumgen: createDumgen({
			execute: async (request) => {
				calls.push(request);
				return output;
			},
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
	const calls: ModelRequest[] = [];
	const dumgen = createDumgen({
		execute: async (request) => {
			calls.push(request);
			return request.stage === "classifyTarget"
				? {
						decision: "Resolved",
						target: { family: "Lexeme", kind: "NOUN" },
						additionalMemberIndices: [],
					}
				: nounOutput;
		},
	});
	const sentence = {
		...encounter.sentence,
		segments: [{ kind: "ResolvableText" as const, text: "Haus" }],
	};
	const target = await Effect.runPromise(
		dumgen.classifyTarget({ sentence, clickedSegmentIndex: 0 }),
	);
	const result = await Effect.runPromise(
		dumgen.resolveGrammar({ sentence, target }),
	);
	expect(calls.map((call) => call.stage)).toEqual([
		"classifyTarget",
		"resolveGrammar",
	]);
	expect(result.surface.lemma.canonicalForm).toBe("Haus");
	expect(parseUnit(result).success).toBe(true);
	expect(
		await Effect.runPromise(dumgen.resolveGrammar({ sentence, target })),
	).toEqual(result);
	expect(calls[2]?.input).toEqual(calls[1]?.input);
});
test("invalid encounters fail before execution; unsupported, unresolved and provider failures differ", async () => {
	const { dumgen, calls } = controlled(null);
	for (const indices of [[], [0, 0], [1], [1, 0]])
		expect(
			await tag(
				dumgen.resolveGrammar({
					...encounter,
					target: {
						...encounter.target,
						memberSegmentIndices: indices,
					},
				} as unknown as Encounter<"de">),
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
			}),
		),
	).toBe("NotImplemented");
	expect(
		await tag(
			controlled({ decision: "Unresolved" }).dumgen.resolveGrammar(
				encounter,
			),
		),
	).toBe("Unresolved");
	expect(
		await tag(
			createDumgen({
				execute: async () => {
					throw Error("offline");
				},
			}).resolveGrammar(encounter),
		),
	).toBe("ProviderFailure");
	expect(await tag(dumgen.resolveGrammar(encounter))).toBe(
		"InvalidModelOutput",
	);
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
			dumgen.generateReadingEmojiDescription({ encounter, lemma: noun }),
		),
	).toBe("💰");
	expect(calls[2]?.input).not.toHaveProperty("existingEmojiDescriptions");
	expect(
		await tag(
			dumgen.generateReadingEmojiDescription({
				encounter,
				lemma: {
					...noun,
					kind: "ADJ",
				} as unknown as Dumling.Lemma<"de">,
			}),
		),
	).toBe("InvalidInput");
});
test("Knowledge carries a supplied encounter and code-owned target language and Family", async () => {
	const reading: Dumling.Reading<"de"> = {
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
	expect(calls).toHaveLength(1);
	expect(
		await tag(
			dumgen.produceKnowledge({ reading, request } as Parameters<
				typeof dumgen.produceKnowledge
			>[0]),
		),
	).toBe("InvalidInput");
	expect(calls).toHaveLength(1);
	expect(
		await tag(
			controlled({
				semanticRelations: {
					synonym: [{ canonicalForm: "x", kind: "Idiom" }],
				},
			}).dumgen.produceKnowledge({ encounter, reading, request }),
		),
	).toBe("InvalidModelOutput");
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
	const member = authoredMembers.find(
		(member) => member.lemma.kind === "DET",
	)!;
	const fixedEncounter = validateEncounter({
		...encounter,
		target: { family: "Lexeme", kind: "DET", memberSegmentIndices: [0] },
	});
	const { dumgen, calls } = controlled({ emojiDescription: "✨" });
	expect(
		await Effect.runPromise(
			dumgen.generateReadingEmojiDescription({
				encounter: fixedEncounter,
				lemma: member.lemma,
			}),
		),
	).toBe(member.reading.emojiDescription);
	expect(calls).toHaveLength(0);
	expect(
		await tag(
			dumgen.generateReadingEmojiDescription({
				encounter: fixedEncounter,
				lemma: { ...member.lemma, canonicalForm: "unreviewed" },
			}),
		),
	).toBe("CatalogMiss");
	expect(calls).toHaveLength(0);
	const pron = authoredMembers.find(
		(member) => member.lemma.kind === "PRON",
	)!;
	const openEncounter = validateEncounter({
		...encounter,
		target: { family: "Lexeme", kind: "PRON", memberSegmentIndices: [0] },
	});
	expect(
		await Effect.runPromise(
			dumgen.generateReadingEmojiDescription({
				encounter: openEncounter,
				lemma: { ...pron.lemma, canonicalForm: "unreviewed" },
			}),
		),
	).toBe("✨");
	expect(calls).toHaveLength(1);
});
test("feature navigation preserves Case and compares unmarked values literally", () => {
	const find = (form: string, grammaticalCase: string) =>
		authoredMembers.find(
			(member) =>
				member.lemma.kind === "PRON" &&
				member.lemma.canonicalForm === form &&
				member.lemma.coreFeatures.case === grammaticalCase,
		)!.lemma as Dumling.Lemma<"de", "Lexeme", "PRON">;
	const mich = find("mich", "Acc");
	expect(
		selectGrammaticalAlternatives({ source: mich, vary: ["case"] }).some(
			(reading) => reading.lemma.canonicalForm === "mir",
		),
	).toBe(true);
	expect(
		selectGrammaticalAlternatives({
			source: mich,
			vary: ["referenceNumber", "number"],
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
test("segmentation preserves ordered inputs, supports existing Hebrew, and rejects text changes", async () => {
	const calls: ModelRequest[] = [];
	const dumgen = createDumgen({
		execute: async (request) => {
			calls.push(request);
			const { items } = request.input as {
				items: { id: string; sourceText: string }[];
			};
			return {
				language: "de",
				items: items.map((item) => ({
					id: item.id,
					stitchedText: item.sourceText,
					decision: "Accepted",
					language: "de",
				})),
			};
		},
	});
	const sentences = [
		"Guten Morgen.",
		...Array.from({ length: 10 }, (_, index) => `Satz ${index}.`),
	] as [string, ...string[]];
	const result = await Effect.runPromise(
		dumgen.segment({ sourceSentences: sentences }),
	);
	expect(calls).toHaveLength(2);
	expect(result).toHaveLength(11);
	for (const [index, decision] of result.entries()) {
		if (decision.decision !== "Accepted")
			throw Error("Expected accepted input");
		expect(
			decision.sentence.segments.map((segment) => segment.text).join(""),
		).toBe(sentences[index]!);
	}
	expect(await tag(dumgen.segment({ sourceSentences: ["   "] }))).toBe(
		"InvalidInput",
	);
	expect(calls).toHaveLength(2);
	const bad = controlled({
		language: "de",
		items: [
			{
				id: "0",
				stitchedText: "Hallo!",
				decision: "Accepted",
				language: "de",
			},
		],
	});
	expect(await tag(bad.dumgen.segment({ sourceSentences: ["Hallo."] }))).toBe(
		"InvalidModelOutput",
	);
	const hebrew = controlled({
		language: "he",
		items: [
			{
				id: "0",
				stitchedText: "שלום!",
				decision: "Accepted",
				language: "he",
			},
		],
	});
	expect(
		await Effect.runPromise(
			hebrew.dumgen.segment({ sourceSentences: ["שלום!"] }),
		),
	).toMatchObject([{ decision: "Accepted", language: "he" }]);
});
