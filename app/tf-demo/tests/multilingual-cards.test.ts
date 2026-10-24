// Convex marks its runtime JSON getter internal and omits it from declarations.
const validatorToJson = (value: unknown): unknown =>
	(value as { readonly json: unknown }).json;

import { afterEach, expect, jest, test } from "bun:test";
import { internal } from "../convex/_generated/api";
import {
	grammaticalLanguageValidator,
	storedUnitValidator,
} from "../convex/model/validators";
import {
	lemmaIdentityKey,
	readingIdentityKey,
} from "../server/linguisticIdentity";
import { createTestConvex } from "./support/convex";

test("stored Card routes and checkpoints register Hebrew without pretending to be German", () => {
	expect(JSON.stringify(validatorToJson(storedUnitValidator))).toContain(
		'"he"',
	);
	expect(
		JSON.stringify(validatorToJson(grammaticalLanguageValidator)),
	).toContain('"he"');
});

import { parseResolvedGrammar } from "../server/resolutionGrammar";

test("Hebrew grammar checkpoints retain source language and validate exact source members", () => {
	const input = {
		encounter: {
			sentence: {
				id: "he-0",
				language: "he",
				segments: [{ kind: "ResolvableText", text: "שלום" }],
			},
			target: {
				family: "Lexeme",
				kind: "INTJ",
				memberSegmentIndices: [0],
			},
		},
		attestation: {
			unitKind: "Attestation",
			surface: shalomSurface,
			members: [{ attested: "שלום", orthography: "Standard" }],
			realizationCoverage: "Full",
		},
	};
	expect(parseResolvedGrammar(input).language).toBe("he");
	expect(() =>
		parseResolvedGrammar({
			...input,
			attestation: {
				...input.attestation,
				members: [{ attested: "שלם", orthography: "Standard" }],
			},
		}),
	).toThrow("does not match");
});

import { dumgenClickResolution } from "../server/dumgenClickResolution";

test("click adapter sends Hebrew source language through grammar and Reading resolution", async () => {
	const grammarInputs: unknown[] = [];
	const readingInputs: unknown[] = [];
	const resolution = dumgenClickResolution(() => ({
		resolve: {
			grammar: (input) => {
				grammarInputs.push(input);
				return Effect.succeed({
					_tag: "Resolved",
					attestation: {
						unitKind: "Attestation",
						surface: shalomSurface,
						members: [
							{ attested: "שלום", orthography: "Standard" },
						],
						realizationCoverage: "Full",
					},
				});
			},
			reading: (input) => {
				readingInputs.push(input);
				return Effect.succeed({ _tag: "New", emojiDescription: "👋" });
			},
		},
	}));
	const grammar = await Effect.runPromise(
		resolution.grammar({
			sentence: {
				id: "he-click",
				language: "he",
				segments: [{ kind: "ResolvableText", text: "שלום" }],
			},
			clickedSegmentIndex: 0,
			unit: {
				segments: [0],
				route: { language: "he", family: "Lexeme", kind: "INTJ" },
			},
			lemmaCandidates: [],
			neighbours: {},
		}),
	);
	expect(grammarInputs[0]).toMatchObject({
		language: "he",
		unit: { route: { language: "he" } },
	});
	if (grammar.decision !== "Resolved") throw Error("Expected grammar");
	expect(grammar.language).toBe("he");
	await Effect.runPromise(
		resolution.reading({ grammar, lemma: shalomLemma, candidates: [] }),
	);
	expect(readingInputs[0]).toMatchObject({
		attestation: { surface: { language: "he" } },
		unit: { route: { language: "he" } },
	});
});

afterEach(() => jest.useRealTimers());

const shalomLemma = {
	unitKind: "Lemma",
	language: "he",
	family: "Lexeme",
	kind: "INTJ",
	canonicalForm: "שלום",
	coreFeatures: {},
} as const;
const shalomReading = {
	unitKind: "Reading",
	lemma: shalomLemma,
	emojiDescription: "👋",
} as const;
const shalomSurface = {
	unitKind: "Surface",
	language: "he",
	lemma: shalomLemma,
	normalizedSurface: "שלום",
	spelling: { kind: "Canonical" },
	surfaceFeatures: null,
} as const;

test("Hebrew occurrence atomically commits canonical dictionary, Visitor context and Knowledge scheduling", async () => {
	jest.useFakeTimers();
	const t = createTestConvex();
	const { sentenceIds } = await t.mutation(
		internal.persistence.persistSubmittedScroll,
		{
			submissionKey: "shalom",
			targetLanguage: "he",
			sourceText: "שלום.",
			sentences: [
				{
					segmentedSentenceId: "shalom:0",
					position: 0,
					paragraph: 0,
					language: "he",
					stitchedText: "שלום.",
					segments: [
						{ kind: "ResolvableText", text: "שלום" },
						{ kind: "Punctuation", text: "." },
					],
					units: [
						{
							segments: [0],
							route: {
								language: "he",
								family: "Lexeme",
								kind: "INTJ",
							},
						},
					],
				},
			],
		},
	);
	const sentenceId = sentenceIds[0];
	if (!sentenceId) throw Error("Missing sentence");
	const selection = {
		requestId: "he-click",
		visitorId: "he-visitor",
		sentenceId,
		clickedSegmentIndex: 0,
	};
	const { makeSurfaceId } = await import("dumdict/planning");
	const { startSession } = await import("./support/occurrences");
	const { loadSourceContextPage } = await import(
		"../convex/modules/notes/readingNote"
	);
	const guard = await startSession(t, selection);
	const result = await t.mutation(internal.persistence.persistResolvedClick, {
		...selection,
		sessionGuard: guard,
		reading: shalomReading,
		readingKey: readingIdentityKey(shalomReading),
		readingDecision: "New",
		readingCandidates: [],
		occurrence: {
			memberSegmentIndices: [0],
			lemmaKey: lemmaIdentityKey(shalomLemma),
			surfaceKey: makeSurfaceId("he", shalomSurface),
			attestation: {
				unitKind: "Attestation",
				surface: shalomSurface,
				members: [{ attested: "שלום", orthography: "Standard" }],
				realizationCoverage: "Full",
			},
		},
	});
	expect(result.status).toBe("Committed");
	if (result.status !== "Committed")
		throw Error("Expected committed Hebrew occurrence");
	const snapshot = await t.run(async (ctx) => ({
		lemmas: await ctx.db.query("lemmas").collect(),
		readings: await ctx.db.query("readings").collect(),
		surfaces: await ctx.db.query("surfaces").collect(),
		segments: await ctx.db.query("segments").collect(),
		attempts: await ctx.db.query("knowledgeGenerationAttempts").collect(),
		scheduled: await ctx.db.system.query("_scheduled_functions").collect(),
	}));
	expect(snapshot.lemmas).toHaveLength(1);
	expect(snapshot.lemmas[0]).toMatchObject({
		language: "he",
		canonicalForm: "שלום",
	});
	expect(snapshot.readings).toHaveLength(1);
	expect(snapshot.surfaces[0]).toMatchObject({ language: "he" });
	expect(snapshot.segments[0]?.attestationMembership?.attestationId).toBe(
		result.attestationId,
	);
	expect(snapshot.attempts[0]?.readingId).toBe(result.readingId);
	expect(
		snapshot.scheduled.filter(
			(row) =>
				row.name ===
				"knowledgeGenerationActions:runKnowledgeGeneration",
		),
	).toHaveLength(1);
	const contexts = await t.run((ctx) =>
		loadSourceContextPage(
			ctx,
			result.readingId,
			readingIdentityKey(shalomReading),
			"he-visitor",
		),
	);
	expect(contexts.page).toHaveLength(1);
	expect(contexts.page[0]).toMatchObject({
		attestationId: result.attestationId,
		sentenceSnippet: "שלום.",
		memberSegmentIndices: [0],
	});
	const strangers = await t.run((ctx) =>
		loadSourceContextPage(
			ctx,
			result.readingId,
			readingIdentityKey(shalomReading),
			"stranger",
		),
	);
	expect(strangers.page).toHaveLength(0);
});

import { extractPastedText } from "dumgen";
import * as Effect from "effect/Effect";
import {
	createIntake,
	type IntakeDumgen,
	unsupportedLanguageMessage,
} from "../server/intake";
import { isPlainSentence } from "../shared/supported-target-language";

test("registered Hebrew intake sends its real language to segmentation and preserves source Segments", async () => {
	const sourceText = "שלום.";
	let segmentedLanguage: string | undefined;
	const dumgen: IntakeDumgen = {
		language: {
			detect: () =>
				Effect.succeed({
					paragraphs: [
						{ sentences: [{ text: sourceText, language: "he" }] },
					],
				}),
		},
		segment: {
			inUnits: (input) => {
				segmentedLanguage = input.language;
				return Effect.succeed({
					language: input.language,
					paragraphs: [
						{
							sentences: [
								{
									text: sourceText,
									segments: [
										{
											kind: "ResolvableText",
											text: "שלום",
										},
										{ kind: "Punctuation", text: "." },
									],
									units: [
										{
											segments: [0],
											route: {
												language: "he",
												family: "Lexeme",
												kind: "NOUN",
											},
										},
									],
								},
							],
						},
					],
				});
			},
		},
	};
	const intake = createIntake({
		dumgen,
		persistence: {
			persistSubmittedScroll: async () => ({ scrollId: "scroll-he" }),
		},
	});
	const result = await Effect.runPromise(
		intake.submitText({
			submissionKey: "he-intake",
			sourceText,
			extractedText: extractPastedText(sourceText),
			language: "he",
		}),
	);
	expect(segmentedLanguage).toBe("he");
	expect(result.submission.sentences[0]).toMatchObject({
		language: "he",
		stitchedText: sourceText,
		units: [{ segments: [0], route: { language: "he" } }],
	});
	expect(unsupportedLanguageMessage("he")).toBeUndefined();
	expect(isPlainSentence("he")).toBe(false);
	expect(isPlainSentence("en")).toBe(true);
});
