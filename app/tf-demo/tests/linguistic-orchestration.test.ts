import { expect, jest, test } from "bun:test";
import { createDumgen, DumgenFailure } from "dumgen";
import { pipelineFixture } from "dumgen/testing";
import type {
	Dumgen,
	DumgenOptions,
	Encounter,
	LexemeTarget,
	MemberRole,
	ModelExchange,
	SentenceAnalysis,
} from "dumgen/types";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import { internal } from "../convex/_generated/api";
import type { ActionCtx } from "../convex/_generated/server";
import { applyTrustedReadingKnowledgeChange } from "../convex/model/readingKnowledge";
import { createResolutionSessionLifecycle } from "../convex/resolutionSessionLifecycle";
import {
	createInspectionCapture,
	type InspectionCapture,
	inspected,
} from "../server/inspectionCapture";
import {
	createTfDemoOrchestrator,
	type OrchestrationPersistence,
	type ReusableAttestation,
} from "../server/linguisticOrchestration";
import { parseResolvedGrammar } from "../server/resolutionGrammar";
import { toStoredSentenceAnalysis } from "../server/sentenceAnalysisStorage";
import type { StoredSegment } from "../server/storedSegments";
import {
	MAX_SOURCE_SENTENCE_CHARACTERS,
	MAX_SOURCE_SENTENCES,
	MAX_SOURCE_TEXT_CHARACTERS,
} from "../server/textSubmissionLimits";
import { actionContext, createTestConvex } from "./support/convex";
import { startSession } from "./support/occurrences";

const lemma: Dumling.Lemma<"de", "Lexeme", "NOUN"> = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Bank",
	coreFeatures: { gender: "Fem", hyph: null },
};
const reading: Dumling.Reading<"de", "Lexeme", "NOUN"> = {
	unitKind: "Reading",
	lemma,
	emojiDescription: "🏦",
};
const encounter = {
	sentence: {
		id: "sentence-1",
		language: "de",
		segments: [{ kind: "ResolvableText", text: "Banken" }],
	},
	target: { family: "Lexeme", kind: "NOUN", memberSegmentIndices: [0] },
} as const satisfies Encounter<"de">;
const attestation: Dumling.Attestation<"de", "Lexeme", "NOUN"> = {
	unitKind: "Attestation",
	surface: {
		unitKind: "Surface",
		language: "de",
		lemma,
		normalizedSurface: "Banken",
		spelling: "Canonical",
		surfaceFeatures: null,
		inflectionalFeatures: { case: "Nom", number: "Plur", article: null },
	},
	realizationCoverage: "Full",
	articleEvidence: null,
	members: [{ attested: "Banken", orthography: "Standard" }],
};
const grammar = parseResolvedGrammar({ encounter, attestation });
const selection = {
	requestId: "request-1",
	visitorId: "visitor-1",
	sentenceId: "sentence-1",
	clickedSegmentIndex: 0,
};
const classification = encounter.target;
const grammarOutput = {
	memberOrthographies: ["Standard"],
	normalizedMembers: ["Banken"],
	surface: {
		spelling: "Canonical",
		surfaceFeatures: null,
		inflectionalFeatures: { case: "Nom", number: "Plur", article: null },
	},
	lemma: {
		canonicalForm: "Bank",
		coreFeatures: { gender: "Fem", hyph: null },
	},
	realizationCoverage: "Full",
	articleEvidence: null,
};
function setup(
	outputs: unknown[],
	overrides: Partial<OrchestrationPersistence> = {},
	candidates: Dumling.Reading<"de">[] = [],
	hooks: Pick<
		Parameters<typeof createTfDemoOrchestrator>[0],
		"draftKnowledge" | "draftGraceMs" | "observer"
	> & {
		inspection?: InspectionCapture;
		execute?: DumgenOptions["execute"];
		analyzeSentence?: Dumgen["analyzeSentence"];
		resolveGrammar?: Dumgen["resolveGrammar"];
	} = {},
) {
	const requests: ModelExchange["request"][] = [];
	const submitted: Parameters<
		OrchestrationPersistence["persistSubmittedText"]
	>[0][] = [];
	const writes: Parameters<
		OrchestrationPersistence["persistResolvedClick"]
	>[0][] = [];
	let occurrence: ReusableAttestation | null = null;
	const persistence: OrchestrationPersistence = {
		async persistSubmittedText(input) {
			submitted.push(input);
			return { textId: "text-1" };
		},
		async loadResolutionContext() {
			return {
				reusable: occurrence,
				lemmaCandidates: [],
				sentence: {
					sentenceId: "sentence-1",
					textId: "text-1",
					segmentedSentenceId: "sentence-1",
					language: "de",
					stitchedText: "Banken",
					segments: [
						{ index: 0, kind: "ResolvableText", text: "Banken" },
					],
				},
			};
		},
		async persistResolvedClick(input) {
			writes.push(input);
			occurrence = {
				attestationId: "attestation-1",
				grammatical: parseResolvedGrammar({
					encounter,
					attestation: input.occurrence.attestation,
				}),
				reading: input.reading,
			};
			return {
				status: "Committed",
				clickId: "click-1",
				attestationId: "attestation-1",
				readingId: "reading-1",
				deduplicated: false,
				occurrence,
			};
		},
		async persistReusedResolvedClick() {
			return {
				status: "Reused",
				clickId: "click-2",
				attestationId: "attestation-1",
				readingId: "reading-1",
				deduplicated: false,
			};
		},
		async persistUnresolvedClick() {
			return {
				status: "Unresolved",
				clickId: "click-1",
				deduplicated: false,
			};
		},
		...overrides,
	};
	const judgments: Parameters<DumgenOptions["judge"]>[0][] = [];
	const fixture = pipelineFixture(outputs);
	const production = createDumgen({
		...fixture,
		judge: (request, options) => {
			judgments.push(request);
			return fixture.judge(request, options);
		},
		...(hooks.execute ? { execute: hooks.execute } : {}),
		onModelExchange: (exchange) => requests.push(exchange.request),
		onOperation: (trace) => hooks.inspection?.operation(trace),
	});
	// Intake analysis is a separate judgment the queued fixtures do not
	// answer; it fails unless a test supplies it, and a failed analysis is
	// tolerated by design.
	const dumgen: Dumgen = {
		...production,
		analyzeSentence:
			hooks.analyzeSentence ??
			(() =>
				Effect.fail(
					new DumgenFailure(
						"NotImplemented",
						"analyzeSentence",
						"No analysis fixture",
					),
				)),
		...(hooks.resolveGrammar
			? { resolveGrammar: hooks.resolveGrammar }
			: {}),
	};
	const orchestrator = createTfDemoOrchestrator({
		draftKnowledge: hooks.draftKnowledge,
		draftGraceMs: hooks.draftGraceMs,
		observer: hooks.observer,
		dumgen,
		findStoredReadings: () => Effect.succeed(candidates),
		persistence,
	});
	return {
		// Inspection is a Tracer the action installs around its run.
		orchestrator: {
			submitText: (
				...input: Parameters<typeof orchestrator.submitText>
			) => inspected(orchestrator.submitText(...input), hooks.inspection),
			resolveSegment: (
				...input: Parameters<typeof orchestrator.resolveSegment>
			) =>
				inspected(
					orchestrator.resolveSegment(...input),
					hooks.inspection,
				),
		},
		requests,
		judgments,
		writes,
		submitted,
	};
}

test("real segmentation, classification, grammar and emoji production reach an atomic dictionary plan", async () => {
	const run = setup([
		{
			language: "de",
			items: [
				{
					id: "0",
					decision: "Accepted",
					language: "de",
					stitchedText: "Banken",
				},
			],
		},
		classification,
		grammarOutput,
		"🏦",
	]);
	await Effect.runPromise(
		run.orchestrator.submitText({
			submissionKey: "submission-1",
			sourceText: "Banken",
		}),
	);
	const result = await Effect.runPromise(
		run.orchestrator.resolveSegment(selection),
	);
	expect(run.submitted).toHaveLength(1);
	expect(run.writes).toHaveLength(1);
	expect(run.writes[0]?.reading).toEqual(reading);
	expect(run.writes[0]?.occurrence.attestation).toEqual(attestation);
	expect(run.writes[0]?.readingDecision).toBe("New");
	expect(result).toMatchObject({
		grammatical: { encounter },
		persisted: { status: "Committed" },
	});
	expect(
		run.requests.filter((request) => request.stage === "classifyTarget"),
	).toHaveLength(1);
	await Effect.runPromise(run.orchestrator.resolveSegment(selection));
	expect(run.writes).toHaveLength(1);
	// segment, classifyTarget, resolveGrammar, generateCanonicalForm and the
	// emoji: classification is one round trip since its singleton-route
	// pre-check was folded in, and the replay above makes no request.
	expect(run.requests.map((request) => request.stage)).toEqual([
		"segment",
		"classifyTarget",
		"resolveGrammar",
		"generateCanonicalForm",
		"generateReadingEmojiDescription",
	]);
});

test("retry uses its exact Grammar checkpoint and skips classification and grammar", async () => {
	const run = setup(["🏦"]);
	await Effect.runPromise(
		run.orchestrator.resolveSegment(selection, { grammatical: grammar }),
	);
	expect(run.requests.map((request) => request.stage)).toEqual([
		"generateReadingEmojiDescription",
	]);
	expect(run.writes[0]?.reading).toEqual(reading);
});

test("stored Reading candidates are compared and reused without a new Reading plan", async () => {
	const run = setup(["🏦"], {}, [reading]);
	const result = await Effect.runPromise(
		run.orchestrator.resolveSegment(selection, { grammatical: grammar }),
	);
	expect(result).toMatchObject({ readingResolution: { decision: "Reuse" } });
	expect(run.requests).toHaveLength(1);
	expect(run.writes[0]?.readingDecision).toBe("Reuse");
});

/**
 * A click whose Grammar first answers MoreContextRequired, then the given
 * Attestation. Records each resolveGrammar input past its Encounter.
 */
function referentRun(neighbours: { before?: string; after?: string }) {
	const inputs: Record<string, unknown>[] = [];
	const resolveGrammar = ((
		input: Encounter<"de"> & Record<string, unknown>,
	) => {
		const { sentence: _sentence, target: _target, ...rest } = input;
		inputs.push(rest);
		return Effect.succeed(
			inputs.length === 1 && input.contextAvailable !== false
				? { decision: "MoreContextRequired" as const }
				: attestation,
		);
	}) as Dumgen["resolveGrammar"];
	const run = setup(
		[classification, "🏦"],
		{
			async loadResolutionContext() {
				return {
					reusable: null,
					lemmaCandidates: [],
					neighbours,
					sentence: {
						sentenceId: "sentence-1",
						textId: "text-1",
						segmentedSentenceId: "sentence-1",
						language: "de",
						stitchedText: "Banken",
						segments: [
							{
								index: 0,
								kind: "ResolvableText",
								text: "Banken",
							},
						],
					},
				};
			},
		},
		[],
		{ resolveGrammar },
	);
	return { run, inputs };
}

test("a Grammar that needs the referent is asked again with the neighbouring Sentences", async () => {
	const neighbours = { before: "Maria kommt.", after: "Sie winkt." };
	const { run, inputs } = referentRun(neighbours);
	const result = await Effect.runPromise(
		run.orchestrator.resolveSegment(selection),
	);
	expect(inputs).toEqual([{}, { context: neighbours }]);
	expect(result).toMatchObject({ persisted: { status: "Committed" } });
	expect(run.writes[0]?.occurrence.attestation).toEqual(attestation);
});

test("a Sentence alone in its Text gets one Grammar call that must answer", async () => {
	const { run, inputs } = referentRun({});
	await Effect.runPromise(run.orchestrator.resolveSegment(selection));
	expect(inputs).toEqual([{ contextAvailable: false }]);
	expect(run.writes[0]?.occurrence.attestation).toEqual(attestation);
});

test("a globally resolved occurrence is reused without generation", async () => {
	const run = setup([], {
		async loadResolutionContext() {
			return {
				sentence: null,
				lemmaCandidates: [],
				reusable: {
					attestationId: "attestation-1",
					grammatical: grammar,
					reading,
				},
			};
		},
	});
	const result = await Effect.runPromise(
		run.orchestrator.resolveSegment(selection),
	);
	expect(result).toMatchObject({
		reused: true,
		persisted: { status: "Reused" },
	});
	expect(run.requests).toHaveLength(0);
	expect(run.writes).toHaveLength(0);
});

test("Unresolved is durable; a late committed occurrence still wins", async () => {
	const run = setup([{ decision: "Unresolved" }]);
	expect(
		await Effect.runPromise(run.orchestrator.resolveSegment(selection)),
	).toMatchObject({
		grammatical: { decision: "Unresolved" },
		persisted: { status: "Unresolved" },
	});
	expect(run.requests).toHaveLength(1);
	expect(run.writes).toHaveLength(0);
	const late = setup(
		[
			{
				decision: "Unresolved",
				target: null,
				additionalMemberIndices: null,
			},
		],
		{
			async persistUnresolvedClick() {
				return {
					status: "Reused",
					clickId: "click-1",
					attestationId: "attestation-1",
					readingId: "reading-1",
					deduplicated: false,
					occurrence: {
						attestationId: "attestation-1",
						grammatical: grammar,
						reading,
					},
				};
			},
		},
	);
	expect(
		await Effect.runPromise(late.orchestrator.resolveSegment(selection)),
	).toMatchObject({ reused: true, reading });
});

test("invalid model output and provider failures leave no partial dictionary records", async () => {
	for (const outputs of [
		[{}],
		[classification, {}],
		[classification, grammarOutput, new Error("provider unavailable")],
	]) {
		const run = setup(outputs);
		const result = await Effect.runPromise(
			Effect.either(run.orchestrator.resolveSegment(selection)),
		);
		expect(result._tag).toBe("Left");
		expect(run.writes).toHaveLength(0);
	}
});

test.each([
	{
		name: "more sentences than allowed",
		sourceText: Array.from(
			{ length: MAX_SOURCE_SENTENCES + 1 },
			(_, index) => `Satz ${index + 1} ist hier.`,
		).join(" "),
		message: `At most ${MAX_SOURCE_SENTENCES} sentences are allowed.`,
	},
	{
		name: "a sentence over the character limit",
		sourceText: `${"a".repeat(MAX_SOURCE_SENTENCE_CHARACTERS)}.`,
		message: `Each sentence is limited to ${MAX_SOURCE_SENTENCE_CHARACTERS} characters.`,
	},
])(
	"a submission with $name fails before any segment or analyze call",
	async ({ sourceText, message }) => {
		const analysed: unknown[] = [];
		const run = setup([], {}, [], {
			analyzeSentence: (input) => {
				analysed.push(input);
				return Effect.die("analysis is not under test");
			},
		});
		await expect(
			Effect.runPromise(
				run.orchestrator.submitText({
					submissionKey: "limit",
					sourceText,
				}),
			),
		).rejects.toThrow(message);
		expect(run.judgments).toHaveLength(0);
		expect(run.requests).toHaveLength(0);
		expect(analysed).toHaveLength(0);
		expect(run.submitted).toHaveLength(0);
	},
);

test("mismatched Reading checkpoints and oversized submissions fail before writes", async () => {
	const run = setup([]);
	await expect(
		Effect.runPromise(
			run.orchestrator.submitText({
				submissionKey: "large",
				sourceText: "x".repeat(MAX_SOURCE_TEXT_CHARACTERS + 1),
			}),
		),
	).rejects.toThrow("limited");
	await expect(
		Effect.runPromise(
			run.orchestrator.resolveSegment(selection, {
				grammatical: grammar,
				reading: {
					resolution: { decision: "New", emojiDescription: "🏦" },
					reading: { ...reading, emojiDescription: "🪑" },
				},
			}),
		),
	).rejects.toThrow("does not match Grammar");
	expect(run.requests).toHaveLength(0);
	expect(run.writes).toHaveLength(0);
});

test("Knowledge changes validate against the exact tagged source Reading", () => {
	const first = applyTrustedReadingKnowledgeChange(reading, undefined, {
		kind: "Contribute",
		aspect: "definition",
		value: "Financial institution",
	});
	expect(first.definition).toBe("Financial institution");
	expect(() =>
		applyTrustedReadingKnowledgeChange(reading, first, {
			kind: "Contribute",
			aspect: "definition",
			value: "Bench",
		}),
	).toThrow("conflicts");
	expect(() =>
		applyTrustedReadingKnowledgeChange(reading, undefined, {
			kind: "Contribute",
			aspect: "semanticRelations",
			relation: "hyponym",
			value: [lemma],
		}),
	).toThrow();
});

test("a Closed route miss records its typed outcome without dictionary writes or model fallback", async () => {
	const run = setup([
		{
			family: "Lexeme",
			kind: "DET",
			memberSegmentIndices: [0],
		},
		{
			memberOrthographies: ["Standard"],
			normalizedMembers: ["Banken"],
			surface: {
				spelling: "Canonical",
				surfaceFeatures: null,
				inflectionalFeatures: null,
			},
			lemma: {
				canonicalForm: "unreviewed",
				coreFeatures: {
					case: "Nom",
					gender: null,
					number: "Plur",
					definite: "Def",
					extPos: null,
					foreign: null,
					numType: null,
					person: null,
					polite: null,
					poss: null,
					pronType: "Art",
				},
			},
			realizationCoverage: "Full",
			articleEvidence: null,
		},
	]);
	expect(
		await Effect.runPromise(run.orchestrator.resolveSegment(selection)),
	).toMatchObject({
		catalogMiss: { decision: "CatalogMiss", stage: "resolveGrammar" },
	});
	expect(run.requests).toHaveLength(3);
	expect(run.writes).toHaveLength(0);
});

test("mixed German, English and Hebrew intake persists ordered sentences without recognition", async () => {
	const source = ["Das Haus ist groß.", "The house is large.", "הבית גדול."];
	const languages = ["de", "en", "he"];
	const run = setup([
		{
			items: source.map((stitchedText, index) => ({
				id: String(index),
				decision: "Accepted",
				language: languages[index],
				stitchedText,
			})),
		},
	]);
	await Effect.runPromise(
		run.orchestrator.submitText({
			submissionKey: "mixed-intake",
			sourceText: source.join("\n"),
		}),
	);
	expect(
		run.submitted[0]?.sentences.map((sentence) => sentence.language),
	).toEqual(languages);
	expect(
		run.submitted[0]?.sentences.map((sentence) => sentence.stitchedText),
	).toEqual(source);
	expect(run.writes).toHaveLength(0);
	expect(run.requests.map((request) => request.stage)).toEqual([
		"segment",
		"segment",
		"segment",
	]);
});

test("Knowledge drafts start from the Lemma before the Emoji Description and are handed to persistence with the new Reading", async () => {
	const draftStarted = Promise.withResolvers<void>();
	const emojiStarted = Promise.withResolvers<void>();
	const releaseDraft = Promise.withResolvers<void>();
	const releaseEmoji = Promise.withResolvers<void>();
	const readingAvailable = Promise.withResolvers<void>();
	const draft = {
		sourceFingerprint: "fixture",
		texts: [{ aspect: "definition" as const, text: "Ein Geldinstitut." }],
	};
	let emojiSettled = false;
	const run = setup([], {}, [], {
		draftKnowledge: (input) =>
			Effect.tryPromise(async () => {
				expect(emojiSettled).toBe(false);
				expect(input.lemma).toEqual(lemma);
				expect("reading" in input).toBe(false);
				draftStarted.resolve();
				await releaseDraft.promise;
				return draft;
			}),
		execute: async () => {
			emojiStarted.resolve();
			await releaseEmoji.promise;
			emojiSettled = true;
			return { output: "🏦" };
		},
		observer: {
			async grammarAvailable() {},
			async readingAvailable() {
				readingAvailable.resolve();
			},
		},
	});
	const pending = Effect.runPromise(
		run.orchestrator.resolveSegment(selection, { grammatical: grammar }),
	);
	await Promise.all([draftStarted.promise, emojiStarted.promise]);
	expect(run.writes).toHaveLength(0);
	releaseEmoji.resolve();
	await readingAvailable.promise;
	expect(run.writes).toHaveLength(0);
	releaseDraft.resolve();
	await pending;
	expect(run.writes).toHaveLength(1);
	expect(run.writes[0]?.reading.emojiDescription).toBe("🏦");
	expect(JSON.parse(run.writes[0]?.knowledgeDraftJson ?? "null")).toEqual(
		draft,
	);
});

test("a new Reading commits after the draft grace with the leaves that finished", async () => {
	const finished = {
		aspect: "translations" as const,
		language: "en",
		text: "bank",
	};
	const run = setup(["🏦"], {}, [], {
		draftGraceMs: 20,
		draftKnowledge: ({ settle }) =>
			Effect.promise(
				() =>
					new Promise((resolve) =>
						settle.addEventListener("abort", () =>
							resolve({
								sourceFingerprint: "fixture",
								texts: [finished],
							}),
						),
					),
			),
	});
	const started = performance.now();
	await Effect.runPromise(
		run.orchestrator.resolveSegment(selection, { grammatical: grammar }),
	);
	expect(performance.now() - started).toBeLessThan(1_000);
	expect(run.writes).toHaveLength(1);
	expect(
		JSON.parse(run.writes[0]?.knowledgeDraftJson ?? "null").texts,
	).toEqual([finished]);
});

test("a draft that ignores the settle is dropped instead of holding the commit", async () => {
	let interrupted = false;
	const run = setup(["🏦"], {}, [], {
		draftGraceMs: 20,
		draftKnowledge: () =>
			Effect.never.pipe(
				Effect.onInterrupt(() =>
					Effect.sync(() => {
						interrupted = true;
					}),
				),
			),
	});
	await Effect.runPromise(
		run.orchestrator.resolveSegment(selection, { grammatical: grammar }),
	);
	expect(interrupted).toBe(true);
	expect(run.writes).toHaveLength(1);
	expect(run.writes[0]?.knowledgeDraftJson).toBeUndefined();
});

test("emoji failure interrupts an in-flight Knowledge draft and hands nothing to persistence", async () => {
	let drafts = 0;
	let interrupted = false;
	const run = setup([], {}, [], {
		draftKnowledge: () => {
			drafts++;
			return Effect.never.pipe(
				Effect.onInterrupt(() =>
					Effect.sync(() => {
						interrupted = true;
					}),
				),
			);
		},
		execute: async () => {
			throw Error("emoji failed");
		},
	});
	const result = await Effect.runPromise(
		Effect.either(
			run.orchestrator.resolveSegment(selection, {
				grammatical: grammar,
			}),
		),
	);
	expect(result._tag).toBe("Left");
	expect(drafts).toBe(1);
	expect(interrupted).toBe(true);
	expect(run.writes).toHaveLength(0);
});

test("failed Knowledge speculation does not fail Reading resolution", async () => {
	const run = setup(["🏦"], {}, [], {
		draftKnowledge: () => Effect.fail(Error("offline")),
	});
	await Effect.runPromise(
		run.orchestrator.resolveSegment(selection, { grammatical: grammar }),
	);
	expect(run.writes).toHaveLength(1);
	expect(run.writes[0]?.knowledgeDraftJson).toBeUndefined();
});

test("a defective Knowledge draft is logged as a bug and does not fail Reading resolution", async () => {
	using log = silencedConsole();
	const run = setup(["🏦"], {}, [], {
		draftKnowledge: () => Effect.die(new TypeError("draft bug")),
	});
	await Effect.runPromise(
		run.orchestrator.resolveSegment(selection, { grammatical: grammar }),
	);
	expect(run.writes).toHaveLength(1);
	expect(run.writes[0]?.knowledgeDraftJson).toBeUndefined();
	expect(log.error.mock.calls[0]?.[1]).toBeInstanceOf(TypeError);
	expect(log.warn).not.toHaveBeenCalled();
});

test("a reused Reading drops an unfinished Knowledge draft instead of waiting for it", async () => {
	let interrupted = false;
	const run = setup(
		[{ decision: "Reuse", emojiDescription: "🏦" }],
		{},
		[{ unitKind: "Reading", lemma, emojiDescription: "🏦" }],
		{
			draftKnowledge: () =>
				Effect.never.pipe(
					Effect.onInterrupt(() =>
						Effect.sync(() => {
							interrupted = true;
						}),
					),
				),
		},
	);
	await Effect.runPromise(
		run.orchestrator.resolveSegment(selection, { grammatical: grammar }),
	);
	expect(interrupted).toBe(true);
	expect(run.writes).toHaveLength(1);
	expect(run.writes[0]?.knowledgeDraftJson).toBeUndefined();
});

test("a reused Reading keeps a Knowledge draft that already finished", async () => {
	const draft = {
		sourceFingerprint: "fixture",
		texts: [{ aspect: "definition" as const, text: "Ein Geldinstitut." }],
	};
	const run = setup(
		[{ decision: "Reuse", emojiDescription: "🏦" }],
		{},
		[{ unitKind: "Reading", lemma, emojiDescription: "🏦" }],
		{ draftKnowledge: () => Effect.succeed(draft) },
	);
	await Effect.runPromise(
		run.orchestrator.resolveSegment(selection, { grammatical: grammar }),
	);
	expect(run.writes).toHaveLength(1);
	expect(JSON.parse(run.writes[0]?.knowledgeDraftJson ?? "null")).toEqual(
		draft,
	);
});

test("submission inspection captures sentence boundaries and segmentation inputs and outputs", async () => {
	const inspection = createInspectionCapture();
	const run = setup(
		[
			{
				language: "de",
				items: [
					{
						id: "0",
						decision: "Accepted",
						language: "de",
						stitchedText: "Hallo.",
					},
					{
						id: "1",
						decision: "Accepted",
						language: "de",
						stitchedText: "Welt!",
					},
				],
			},
		],
		{},
		[],
		{ inspection },
	);
	await Effect.runPromise(
		run.orchestrator.submitText({
			submissionKey: "inspected",
			sourceText: "Hallo. Welt!",
		}),
	);
	const split = inspection.steps.find(
		(step) => step.name === "Split text into sentences",
	);
	expect(split?.status).toBe("Success");
	expect(JSON.parse(split?.payloadJson ?? "null")).toEqual({
		input: { sourceText: "Hallo. Welt!" },
		output: [["Hallo.", "Welt!"]],
	});
	expect(inspection.steps.some((step) => step.kind === "TypeSafe")).toBe(
		true,
	);
	expect(
		inspection.steps.some(
			(step) =>
				step.owner === "battery/dumgen" &&
				step.payloadJson.includes("Hallo."),
		),
	).toBe(true);
	expect(run.submitted).toHaveLength(1);
});

test("submission stores the paragraph each sentence reads in", async () => {
	const run = setup([
		{
			language: "de",
			items: ["Hallo.", "Welt!", "Tschüss."].map((stitchedText, id) => ({
				id: id.toString(),
				decision: "Accepted",
				language: "de",
				stitchedText,
			})),
		},
	]);
	await Effect.runPromise(
		run.orchestrator.submitText({
			submissionKey: "paragraphs",
			sourceText: "Hallo. Welt!\n\nTschüss.",
		}),
	);
	expect(
		run.submitted[0]?.sentences.map(({ position, paragraph }) => [
			position,
			paragraph,
		]),
	).toEqual([
		[0, 0],
		[1, 0],
		[2, 1],
	]);
});

test("stored Lemma candidates reach grammar before headword generation, while Reading selection remains contextual", async () => {
	const run = setup(
		[classification, grammarOutput, "🏦"],
		{
			async loadResolutionContext() {
				return {
					reusable: null,
					lemmaCandidates: [{ lemma, foundUnder: ["Banken"] }],
					sentence: {
						sentenceId: "sentence-1",
						textId: "text-1",
						segmentedSentenceId: "sentence-1",
						language: "de",
						stitchedText: "Banken",
						segments: [
							{
								index: 0,
								kind: "ResolvableText",
								text: "Banken",
							},
						],
					},
				};
			},
		},
		[reading],
		{
			execute: async () => {
				throw Error(
					"Existing headword and Reading need no text generation",
				);
			},
		},
	);
	const result = await Effect.runPromise(
		run.orchestrator.resolveSegment(selection),
	);
	expect(result).toMatchObject({
		readingResolution: { decision: "Reuse" },
		reading,
	});
	expect(
		run.requests.some(
			(request) => request.stage === "generateCanonicalForm",
		),
	).toBe(false);
	expect(
		run.requests.some(
			(request) =>
				request.stage === "resolveOrGenerateReadingEmojiDescription",
		),
	).toBe(true);
	expect(run.writes).toHaveLength(1);
});

test("a failed Reading checkpoint prevents occurrence commit", async () => {
	const run = setup(["🏦"], {}, [reading], {
		observer: {
			async grammarAvailable() {},
			async readingAvailable() {
				throw Error("Checkpoint unavailable");
			},
		},
	});
	await expect(
		Effect.runPromise(
			run.orchestrator.resolveSegment(selection, {
				grammatical: grammar,
			}),
		),
	).rejects.toThrow();
	expect(run.writes).toHaveLength(0);
});

test("the occurrence commit waits for the in-flight Reading checkpoint", async () => {
	const checkpoint = Promise.withResolvers<void>();
	let commitsWhenSaved: number | undefined;
	const run = setup(["🏦"], {}, [reading], {
		observer: {
			async grammarAvailable() {},
			async readingAvailable() {
				await checkpoint.promise;
				commitsWhenSaved = run.writes.length;
			},
		},
	});
	const outcome = Effect.runPromise(
		run.orchestrator.resolveSegment(selection, { grammatical: grammar }),
	);
	await Bun.sleep(0);
	expect(run.writes).toHaveLength(0);
	checkpoint.resolve();
	await outcome;
	expect(commitsWhenSaved).toBe(0);
	expect(run.writes).toHaveLength(1);
});

// ------------------------------------------------ Sentence Analysis at intake

const verfuegungText = "Er stellt das Auto zur Verfügung.";
const verfuegungSegments = [
	"Er",
	" ",
	"stellt",
	" ",
	"das",
	" ",
	"Auto",
	" ",
	"zur",
	" ",
	"Verfügung",
	".",
].map((text, index) => ({
	index,
	kind:
		text === " "
			? ("Whitespace" as const)
			: text === "."
				? ("Punctuation" as const)
				: ("ResolvableText" as const),
	text,
}));
const word = (offset: number, text: string, surface = text) => ({
	offset,
	kind: "ResolvableText" as const,
	text,
	surface,
});
const gap = (offset: number) => ({
	offset,
	kind: "Whitespace" as const,
	text: " ",
	surface: " ",
});
function verfuegungAnalysis(options: {
	readonly collocation: boolean;
	readonly nounRoute?: Record<string, number>;
}): SentenceAnalysis {
	const lexeme = (
		id: string,
		members: { offset: number; role: MemberRole }[],
		kind: string,
	): LexemeTarget => ({
		id,
		members,
		routeMass: { [kind]: 0.9, Unresolved: 0.1 },
		identity: null,
		provenance: "vote",
	});
	return {
		sentenceId: "sentence-1",
		language: "de",
		stitchedText: verfuegungText,
		segments: [
			word(0, "Er"),
			gap(2),
			word(3, "stellt"),
			gap(9),
			word(10, "das"),
			gap(13),
			word(14, "Auto"),
			gap(18),
			word(19, "zu"),
			word(21, "r", "der"),
			gap(22),
			word(23, "Verfügung"),
			{ offset: 32, kind: "Punctuation", text: ".", surface: "." },
		],
		targets: [
			lexeme("er", [{ offset: 0, role: "Head" }], "PRON"),
			lexeme("stellt", [{ offset: 3, role: "Head" }], "VERB"),
			lexeme("das", [{ offset: 10, role: "Head" }], "DET"),
			lexeme("auto", [{ offset: 14, role: "Head" }], "NOUN"),
			lexeme("zu", [{ offset: 19, role: "Head" }], "ADP"),
			{
				...lexeme(
					"verfuegung",
					[
						{ offset: 21, role: "Article" },
						{ offset: 23, role: "Head" },
					],
					"NOUN",
				),
				...(options.nounRoute ? { routeMass: options.nounRoute } : {}),
			},
		],
		phrasemes: options.collocation
			? [
					{
						id: "p1",
						members: ["stellt", "zu", "verfuegung"],
						kindMass: { Collocation: 0.8, None: 0.2 },
						fixedness: 2.5,
						provenance: "vote",
					},
				]
			: [],
		fusions: [
			{
				offset: 19,
				form: "zur",
				components: [
					{ offset: 19, span: "zu", surface: "zu", role: "ADP" },
					{ offset: 21, span: "r", surface: "der", role: "Article" },
				],
			},
		],
		government: [],
	};
}

/** Real segmentation and classification fixtures, with analysis and grammar under test control. */
function setupWithAnalysis(
	outputs: unknown[],
	hooks: {
		readonly analyzeSentence?: Dumgen["analyzeSentence"];
		readonly analysis?: SentenceAnalysis | null;
		readonly inspection?: ReturnType<typeof createInspectionCapture>;
		/** Stored Segments; the unsplit words by default. */
		readonly segments?: readonly StoredSegment[];
	},
) {
	const encounters: Encounter<"de">[] = [];
	const run = setup(
		outputs,
		{
			async loadResolutionContext() {
				return {
					reusable: null,
					lemmaCandidates: [],
					analysis: hooks.analysis ?? null,
					sentence: {
						sentenceId: "sentence-1",
						textId: "text-1",
						segmentedSentenceId: "sentence-1",
						language: "de",
						stitchedText: verfuegungText,
						segments: hooks.segments ?? verfuegungSegments,
					},
				};
			},
		},
		[],
		{
			inspection: hooks.inspection,
			...(hooks.analyzeSentence
				? { analyzeSentence: hooks.analyzeSentence }
				: {}),
			resolveGrammar: (encounter) => {
				encounters.push(encounter as Encounter<"de">);
				return Effect.fail(
					new DumgenFailure(
						"Unresolved",
						"resolveGrammar",
						"Grammar is not under test",
					),
				);
			},
		},
	);
	return { ...run, encounters };
}

test("intake analyses every accepted German sentence, stores each analysis with its sentence and tolerates a failed one", async () => {
	const inspection = createInspectionCapture();
	const analysed: string[] = [];
	const run = setup(
		[
			{
				language: "de",
				items: [
					{
						id: "0",
						decision: "Accepted",
						language: "de",
						stitchedText: "Hallo.",
					},
					{
						id: "1",
						decision: "Accepted",
						language: "de",
						stitchedText: "Welt!",
					},
				],
			},
		],
		{},
		[],
		{
			inspection,
			analyzeSentence: ({ sentence }) => {
				const stitchedText = sentence.segments
					.map(({ text }) => text)
					.join("");
				analysed.push(stitchedText);
				return stitchedText === "Hallo."
					? Effect.succeed({
							...verfuegungAnalysis({ collocation: false }),
							sentenceId: sentence.id,
							stitchedText,
						})
					: Effect.fail(
							new DumgenFailure(
								"ProviderFailure",
								"analyzeSentence",
								"model unavailable",
							),
						);
			},
		},
	);
	const result = await Effect.runPromise(
		run.orchestrator.submitText({
			submissionKey: "analysed",
			sourceText: "Hallo. Welt!",
		}),
	);
	expect(result.persisted.textId).toBe("text-1");
	expect(analysed.sort()).toEqual(["Hallo.", "Welt!"]);
	const sentences = run.submitted[0]?.sentences ?? [];
	expect(sentences).toHaveLength(2);
	expect(sentences[0]?.analysis?.sentenceId).toBe(
		sentences[0]?.segmentedSentenceId,
	);
	expect(sentences[0]?.analysis?.stitchedText).toBe("Hallo.");
	expect(sentences[1]?.analysis).toBeUndefined();
	const steps = inspection.steps.filter(
		(step) => step.name === "Analyze sentence",
	);
	expect(steps.map((step) => step.status).sort()).toEqual([
		"Failure",
		"Success",
	]);
	expect(
		steps.find((step) => step.status === "Failure")?.payloadJson,
	).toContain("model unavailable");
});

test("intake never analyses sentences in other languages", async () => {
	const analysed: string[] = [];
	const run = setup(
		[
			{
				items: [
					{
						id: "0",
						decision: "Accepted",
						language: "en",
						stitchedText: "The house.",
					},
					{
						id: "1",
						decision: "Accepted",
						language: "de",
						stitchedText: "Das Haus.",
					},
				],
			},
		],
		{},
		[],
		{
			analyzeSentence: ({ sentence }) => {
				analysed.push(
					`${sentence.segments.map(({ text }) => text).join("")}:${sentence.language}`,
				);
				return Effect.fail(
					new DumgenFailure("Unresolved", "analyzeSentence", "none"),
				);
			},
		},
	);
	await Effect.runPromise(
		run.orchestrator.submitText({
			submissionKey: "mixed-analysis",
			sourceText: "The house.\nDas Haus.",
		}),
	);
	expect(analysed).toEqual(["Das Haus.:de"]);
});

function silencedConsole() {
	const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
	const error = jest.spyOn(console, "error").mockImplementation(() => {});
	return {
		warn,
		error,
		[Symbol.dispose]() {
			warn.mockRestore();
			error.mockRestore();
		},
	};
}

/** The queued fixture consumes its outputs, so each test takes a fresh copy. */
const twoGermanSentences = () => [
	{
		items: [
			{
				id: "0",
				decision: "Accepted",
				language: "de",
				stitchedText: "Hallo.",
			},
			{
				id: "1",
				decision: "Accepted",
				language: "de",
				stitchedText: "Welt!",
			},
		],
	},
];

test("a defect in Sentence Analysis still stores the sentence and is logged as a bug", async () => {
	using log = silencedConsole();
	const run = setup(twoGermanSentences(), {}, [], {
		analyzeSentence: ({ sentence }) =>
			sentence.segments.map(({ text }) => text).join("") === "Hallo."
				? Effect.die(new TypeError("analysis bug"))
				: Effect.fail(
						new DumgenFailure(
							"ProviderFailure",
							"analyzeSentence",
							"model unavailable",
						),
					),
	});
	await Effect.runPromise(
		run.orchestrator.submitText({
			submissionKey: "defective-analysis",
			sourceText: "Hallo. Welt!",
		}),
	);
	const sentences = run.submitted[0]?.sentences ?? [];
	expect(sentences.map((sentence) => sentence.stitchedText)).toEqual([
		"Hallo.",
		"Welt!",
	]);
	expect(sentences.every((sentence) => !sentence.analysis)).toBe(true);
	expect(log.error).toHaveBeenCalledTimes(1);
	expect(String(log.error.mock.calls[0]?.[0])).toContain("hit a bug");
	expect(log.error.mock.calls[0]?.[1]).toBeInstanceOf(TypeError);
	expect(log.warn).toHaveBeenCalledTimes(1);
});

test("interrupting a submission during Sentence Analysis propagates, stores nothing and logs nothing", async () => {
	using log = silencedConsole();
	const started = Promise.withResolvers<void>();
	const run = setup(twoGermanSentences(), {}, [], {
		analyzeSentence: () =>
			Effect.zipRight(
				Effect.sync(() => started.resolve()),
				Effect.never,
			),
	});
	const fiber = Effect.runFork(
		run.orchestrator.submitText({
			submissionKey: "interrupted-analysis",
			sourceText: "Hallo. Welt!",
		}),
	);
	await started.promise;
	const exit = await Effect.runPromise(Fiber.interrupt(fiber));
	expect(Exit.isInterrupted(exit)).toBe(true);
	expect(run.submitted).toHaveLength(0);
	expect(log.warn).not.toHaveBeenCalled();
	expect(log.error).not.toHaveBeenCalled();
});

// ------------------------------------------------ Sentence Analysis at click

const verfuegungSelection = { ...selection, clickedSegmentIndex: 10 };

test("a click reads the stored analysis: a Collocation over `stellt zur Verfügung` covers the fused `zur` and skips classification; refused, it falls to the clicked word", async () => {
	const inspection = createInspectionCapture();
	const run = setupWithAnalysis([], {
		inspection,
		analysis: verfuegungAnalysis({ collocation: true }),
	});
	const result = await Effect.runPromise(
		run.orchestrator.resolveSegment(verfuegungSelection),
	);
	expect(result).toMatchObject({ grammatical: { decision: "Unresolved" } });
	expect(run.encounters.map((encounter) => encounter.target)).toEqual([
		{
			family: "Phraseme",
			kind: "Collocation",
			memberSegmentIndices: [2, 8, 10],
		},
		{ family: "Lexeme", kind: "NOUN", memberSegmentIndices: [10] },
	]);
	expect(
		inspection.steps.some(
			(step) => step.name === "Select target · analysis word",
		),
	).toBe(true);
	expect(
		run.requests.filter((request) => request.stage === "classifyTarget"),
	).toHaveLength(0);
	const step = inspection.steps.find((step) =>
		step.name.startsWith("Select target"),
	);
	expect(step?.name).toBe("Select target · analysis");
	expect(JSON.parse(step?.payloadJson ?? "null")).toMatchObject({
		input: { hasAnalysis: true },
		output: { path: "analysis" },
	});
});

test("a NOUN whose Article is the `r` of `zur` leaves the stored `zur` outside its target", async () => {
	const run = setupWithAnalysis([], {
		analysis: verfuegungAnalysis({ collocation: false }),
	});
	await Effect.runPromise(
		run.orchestrator.resolveSegment(verfuegungSelection),
	);
	expect(run.encounters[0]?.target).toEqual({
		family: "Lexeme",
		kind: "NOUN",
		memberSegmentIndices: [10],
	});
	expect(run.requests).toHaveLength(0);
});

test("a click on the fused `zur` itself cannot be expressed by a sub-word unit and is classified", async () => {
	const inspection = createInspectionCapture();
	const run = setupWithAnalysis(
		[{ family: "Lexeme", kind: "ADP", memberSegmentIndices: [8] }],
		{ analysis: verfuegungAnalysis({ collocation: false }), inspection },
	);
	await Effect.runPromise(
		run.orchestrator.resolveSegment({
			...selection,
			clickedSegmentIndex: 8,
		}),
	);
	expect(run.encounters[0]?.target).toEqual({
		family: "Lexeme",
		kind: "ADP",
		memberSegmentIndices: [8],
	});
	expect(
		run.requests.filter((request) => request.stage === "classifyTarget"),
	).toHaveLength(1);
	const step = inspection.steps.find((step) =>
		step.name.startsWith("Select target"),
	);
	expect(JSON.parse(step?.payloadJson ?? "null")).toMatchObject({
		input: { reason: "clickedNotMember" },
	});
});

/** `zur` stored as intake splits it: `zu` standing for `zu`, `r` standing for `der`. */
const splitVerfuegungSegments: StoredSegment[] = [
	...verfuegungSegments.slice(0, 8),
	{ index: 8, kind: "ResolvableText", text: "zu", surface: "zu" },
	{ index: 9, kind: "ResolvableText", text: "r", surface: "der" },
	...verfuegungSegments
		.slice(9)
		.map((segment) => ({ ...segment, index: segment.index + 1 })),
];

test("a click on the `zu` of a split `zur` reads its ADP from the analysis and resolves `zu der`", async () => {
	const run = setupWithAnalysis([], {
		analysis: verfuegungAnalysis({ collocation: false }),
		segments: splitVerfuegungSegments,
	});
	await Effect.runPromise(
		run.orchestrator.resolveSegment({
			...selection,
			clickedSegmentIndex: 8,
		}),
	);
	expect(run.requests).toHaveLength(0);
	const encounter = run.encounters[0];
	expect(encounter?.sentence.segments.map(({ text }) => text).join("")).toBe(
		"Er stellt das Auto zu der Verfügung.",
	);
	expect(encounter?.target).toEqual({
		family: "Lexeme",
		kind: "ADP",
		memberSegmentIndices: [8],
	});
});

test("a click on the `r` of a split `zur` selects the NOUN it articles, in Encounter indices", async () => {
	const run = setupWithAnalysis([], {
		analysis: verfuegungAnalysis({ collocation: false }),
		segments: splitVerfuegungSegments,
	});
	await Effect.runPromise(
		run.orchestrator.resolveSegment({
			...selection,
			clickedSegmentIndex: 9,
		}),
	);
	expect(run.requests).toHaveLength(0);
	const encounter = run.encounters[0];
	expect(encounter?.target).toEqual({
		family: "Lexeme",
		kind: "NOUN",
		memberSegmentIndices: [10, 12],
	});
	expect(
		encounter?.target.memberSegmentIndices.map(
			(index) => encounter.sentence.segments[index]?.text,
		),
	).toEqual(["der", "Verfügung"]);
});

test("an Unresolved unit, a Miss identity, a lone AUX identity, or no stored analysis, falls back to click-time classification and names why", async () => {
	const inspection = createInspectionCapture();
	const plain = verfuegungAnalysis({ collocation: false });
	// `stellt` read as a Selected AUX identity: ADR 0026 forbids AUX targets.
	const loneAux: SentenceAnalysis = {
		...plain,
		targets: plain.targets.map((target) =>
			target.id === "stellt"
				? {
						...target,
						identity: {
							candidates: [
								{
									key: "AUX:haben:null",
									kind: "AUX",
									headword: "haben",
									pronType: null,
									cells: [],
									definition: "",
								},
							],
							mass: { "AUX:haben:null": 0.9, NoMatch: 0.1 },
						},
					}
				: target,
		),
	};
	const cases = [
		{
			analysis: verfuegungAnalysis({
				collocation: false,
				nounRoute: { Unresolved: 0.7, NOUN: 0.3 },
			}),
			target: {
				family: "Lexeme",
				kind: "NOUN",
				memberSegmentIndices: [10],
			},
		},
		{
			// `das` is routed DET with no authored candidate: a Miss.
			analysis: plain,
			target: {
				family: "Lexeme",
				kind: "DET",
				memberSegmentIndices: [4],
			},
		},
		{
			analysis: loneAux,
			target: {
				family: "Lexeme",
				kind: "VERB",
				memberSegmentIndices: [2],
			},
		},
		{
			analysis: null,
			target: {
				family: "Lexeme",
				kind: "NOUN",
				memberSegmentIndices: [10],
			},
		},
	] as const;
	for (const { analysis, target } of cases) {
		const run = setupWithAnalysis([target], { analysis, inspection });
		await Effect.runPromise(
			run.orchestrator.resolveSegment({
				...selection,
				clickedSegmentIndex: target.memberSegmentIndices[0],
			}),
		);
		expect(run.encounters).toHaveLength(1);
		expect(run.encounters[0]?.target).toEqual(target);
		expect(
			run.requests.filter(
				(request) => request.stage === "classifyTarget",
			),
		).toHaveLength(1);
	}
	const steps = inspection.steps.filter((step) =>
		step.name.startsWith("Select target"),
	);
	expect(steps.map((step) => step.name)).toEqual(
		cases.map(() => "Select target · classified"),
	);
	expect(
		steps.map((step) => JSON.parse(step.payloadJson).input),
	).toMatchObject([
		{ hasAnalysis: true, definitionText: false, reason: "noResolvedUnit" },
		{ hasAnalysis: true, definitionText: false, reason: "identityMiss" },
		{ hasAnalysis: true, definitionText: false, reason: "auxSingleton" },
		{ hasAnalysis: false, definitionText: false, reason: "noAnalysis" },
	]);
	expect(
		steps.map((step) => JSON.parse(step.payloadJson).output.path),
	).toEqual(cases.map(() => "classified"));
});

test("a Resolution Session run restores the stored analysis to record masses and its click selects from the analysis", async () => {
	const analysis = verfuegungAnalysis({ collocation: true });
	jest.useFakeTimers();
	const t = createTestConvex();
	const { sentenceIds } = await t.mutation(
		internal.persistence.persistSubmittedText,
		{
			submissionKey: "verfuegung",
			sourceText: verfuegungText,
			sentences: [
				{
					segmentedSentenceId: "verfuegung:0",
					position: 0,
					paragraph: 0,
					language: "de",
					stitchedText: verfuegungText,
					segments: verfuegungSegments.map(({ kind, text }) => ({
						kind,
						text,
					})),
					analysis: toStoredSentenceAnalysis(analysis),
				},
			],
		},
	);
	const sentenceId = sentenceIds[0];
	if (!sentenceId) throw new Error("Expected a stored Sentence.");
	const guard = await startSession(t, {
		...verfuegungSelection,
		sentenceId,
	});
	const input = await createResolutionSessionLifecycle(
		actionContext(t) as unknown as ActionCtx,
		guard,
	)
		.begin()
		.finally(() => jest.useRealTimers());
	// begin() claimed the run through the real beginRun mutation.
	expect(
		await t.run(async (ctx) => {
			const claimed = await ctx.db
				.query("resolutionSessions")
				.withIndex("by_request_id", (q) =>
					q.eq("requestId", guard.requestId),
				)
				.unique();
			return claimed?.lifecycle;
		}),
	).toEqual({
		state: "Active",
		progress: "RouteAvailable",
		activity: "Running",
	});

	if (!input?.context) throw new Error("Expected a restored context.");
	expect(input.context.analysis?.targets[0]?.routeMass).toEqual({
		PRON: 0.9,
		Unresolved: 0.1,
	});
	expect(input.context.analysis?.phrasemes[0]?.kindMass).toEqual({
		Collocation: 0.8,
		None: 0.2,
	});
	expect(input.context.analysis).toEqual(analysis);

	const inspection = createInspectionCapture();
	const run = setupWithAnalysis([], { inspection });
	await Effect.runPromise(
		run.orchestrator.resolveSegment(
			input.selection,
			input.checkpoints,
			input.context,
		),
	);
	expect(run.encounters[0]?.target).toEqual({
		family: "Phraseme",
		kind: "Collocation",
		memberSegmentIndices: [2, 8, 10],
	});
	expect(
		run.requests.filter((request) => request.stage === "classifyTarget"),
	).toHaveLength(0);
	expect(
		inspection.steps.find((step) => step.name.startsWith("Select target"))
			?.name,
	).toBe("Select target · analysis");
});
