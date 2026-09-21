import { expect, test } from "bun:test";
import {
	type CommitChangesRequest,
	createDumdictService,
	type DumdictStoragePort,
	type StoreRevision,
} from "dumdict";
import { createDumgen, DumgenFailure } from "dumgen";
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
import { pipelineFixture } from "../../../battery/dumgen/tests/pipeline-fixture.js";
import { createInspectionCapture } from "../server/inspectionCapture";
import {
	applyValidatedReadingKnowledgeChange,
	createTfDemoOrchestrator,
	type OrchestrationPersistence,
	type RecordedClick,
	type ReusableAttestation,
} from "../server/linguisticOrchestration";
import { parseResolvedGrammar } from "../server/resolutionGrammar";
import { MAX_SOURCE_TEXT_CHARACTERS } from "../server/textSubmissionLimits";

const revision = "revision-0" as StoreRevision;
function createPlanningStorage(candidates: Dumling.Reading<"de">[]) {
	const commits: CommitChangesRequest<"de">[] = [];
	const storage: DumdictStoragePort<"de"> = {
		findStoredReadings() {
			return Effect.succeed({ revision, candidates: [] });
		},
		loadReadingEntryContext(request) {
			switch (request.intent) {
				case "addNewNote":
					return Effect.succeed({
						intent: request.intent,
						revision,
						existingOwnedSurfaces: [],
						explicitExistingLemmaTargets: [],
						exactPendingRelations: [],
						pendingRelationsMatchingProposedLemma: [],
						relationLemmas: [],
						relationReadings: [],
					});
				case "applyGeneratedKnowledge":
					return Effect.succeed({
						intent: request.intent,
						revision,
						exactPendingRelations: [],
						relationLemmas: [],
						relationReadings: [],
					});
				case "ensureOwnedSurface":
					return Effect.succeed({
						intent: request.intent,
						revision,
						existingLemma: candidates[0]
							? { lemma: candidates[0].lemma }
							: undefined,
						existingReading: candidates[0]
							? {
									reading: candidates[0],
									attestedTranslations: [],
									attestations: [],
									notes: "",
								}
							: undefined,
						existingOwnedSurfaces: [],
					});
				case "ensureReadingEntry":
					return Effect.succeed({ intent: request.intent, revision });
			}
		},
		commitChanges(request) {
			commits.push(request);
			return Effect.succeed({
				status: "committed",
				nextRevision: "revision-1" as StoreRevision,
			});
		},
		loadReadingForPatch() {
			return Effect.die("Unexpected Reading patch.");
		},
		getInfoForRelationsCleanup() {
			return Effect.die("Unexpected relation cleanup lookup.");
		},
		loadCleanupRelationsContext() {
			return Effect.die("Unexpected relation cleanup load.");
		},
	};
	return { commits, storage };
}

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
		"draftKnowledge" | "observer" | "inspection"
	> & {
		execute?: DumgenOptions["execute"];
		analyzeSentence?: Dumgen["analyzeSentence"];
		resolveGrammar?: Dumgen["resolveGrammar"];
	} = {},
) {
	const requests: ModelExchange["request"][] = [];
	const { storage, commits } = createPlanningStorage(candidates);
	storage.findStoredReadings = () =>
		Effect.succeed({
			revision,
			candidates: candidates.map((reading) => ({
				reading: {
					reading,
					attestedTranslations: [],
					attestations: [],
					notes: "",
				},
				lemma: { lemma: reading.lemma },
			})),
		});
	const submitted: Parameters<
		OrchestrationPersistence["persistSubmittedText"]
	>[0][] = [];
	const writes: Parameters<
		OrchestrationPersistence["persistResolvedClick"]
	>[0][] = [];
	let occurrence: ReusableAttestation | null = null;
	let recorded: RecordedClick | null = null;
	const persistence: OrchestrationPersistence = {
		async persistSubmittedText(input) {
			submitted.push(input);
			return { textId: "text-1" };
		},
		async loadResolutionContext() {
			return {
				recorded,
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
			recorded = {
				status: "Resolved",
				clickId: "click-1",
				readingId: "reading-1",
				occurrence,
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
			recorded = { status: "Unresolved", clickId: "click-1" };
			return { ...recorded, deduplicated: false };
		},
		...overrides,
	};
	const production = createDumgen({
		...pipelineFixture(outputs),
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
	return {
		orchestrator: createTfDemoOrchestrator({
			draftKnowledge: hooks.draftKnowledge,
			observer: hooks.observer,
			inspection: hooks.inspection,
			dumgen,
			dictionary: createDumdictService({ language: "de", storage }),
			persistence,
		}),
		storage,
		requests,
		writes,
		submitted,
		commits,
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
	expect(run.commits).toHaveLength(0); // The host transaction plans and commits the dictionary itself.
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

test("a globally resolved occurrence is reused without generation", async () => {
	const run = setup([], {
		async loadResolutionContext() {
			return {
				recorded: null,
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

test("Unresolved is durable and replayed; a late committed occurrence still wins", async () => {
	const run = setup([{ decision: "Unresolved" }]);
	expect(
		await Effect.runPromise(run.orchestrator.resolveSegment(selection)),
	).toMatchObject({ grammatical: { decision: "Unresolved" } });
	expect(
		await Effect.runPromise(run.orchestrator.resolveSegment(selection)),
	).toMatchObject({ deduplicated: true });
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
		expect(run.commits).toHaveLength(0);
	}
});

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
	const first = applyValidatedReadingKnowledgeChange({
		reading,
		change: {
			kind: "Contribute",
			aspect: "definition",
			value: "Financial institution",
		},
	});
	expect(first.knowledge.definition).toBe("Financial institution");
	expect(() =>
		applyValidatedReadingKnowledgeChange({
			reading,
			knowledge: first.knowledge,
			change: {
				kind: "Contribute",
				aspect: "definition",
				value: "Bench",
			},
		}),
	).toThrow("conflicts");
	expect(() =>
		applyValidatedReadingKnowledgeChange({
			reading,
			change: {
				kind: "Contribute",
				aspect: "semanticRelations",
				relation: "hyponym",
				value: [lemma],
			},
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
	expect(run.commits).toHaveLength(0);
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
			async committing() {},
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
		output: ["Hallo.", "Welt!"],
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

test("stored Lemma candidates reach grammar before headword generation, while Reading selection remains contextual", async () => {
	const run = setup(
		[classification, grammarOutput, "🏦"],
		{
			async loadResolutionContext() {
				return {
					recorded: null,
					reusable: null,
					lemmaCandidates: [lemma],
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
			async committing() {
				throw Error("Must not commit after checkpoint failure");
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
	let saved = false;
	let savedBeforeCommit: boolean | undefined;
	const run = setup(["🏦"], {}, [reading], {
		observer: {
			async grammarAvailable() {},
			async readingAvailable() {
				await checkpoint.promise;
				saved = true;
			},
			async committing() {
				savedBeforeCommit = saved;
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
	expect(savedBeforeCommit).toBe(true);
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
	};
}

/** Real segmentation and classification fixtures, with analysis and grammar under test control. */
function setupWithAnalysis(
	outputs: unknown[],
	hooks: {
		readonly analyzeSentence?: Dumgen["analyzeSentence"];
		readonly analysis?: SentenceAnalysis | null;
		readonly inspection?: ReturnType<typeof createInspectionCapture>;
	},
) {
	const encounters: Encounter<"de">[] = [];
	const run = setup(
		outputs,
		{
			async loadResolutionContext() {
				return {
					recorded: null,
					reusable: null,
					lemmaCandidates: [],
					analysis: hooks.analysis ?? null,
					sentence: {
						sentenceId: "sentence-1",
						textId: "text-1",
						segmentedSentenceId: "sentence-1",
						language: "de",
						stitchedText: verfuegungText,
						segments: verfuegungSegments,
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

// ------------------------------------------------ Sentence Analysis at click

const verfuegungSelection = { ...selection, clickedSegmentIndex: 10 };

test("a click reads the stored analysis: a Collocation over `stellt zur Verfügung` covers the fused `zur` and skips classification", async () => {
	const inspection = createInspectionCapture();
	const run = setupWithAnalysis([], {
		inspection,
		analysis: verfuegungAnalysis({ collocation: true }),
	});
	const result = await Effect.runPromise(
		run.orchestrator.resolveSegment(verfuegungSelection),
	);
	expect(result).toMatchObject({ grammatical: { decision: "Unresolved" } });
	expect(run.encounters).toHaveLength(1);
	expect(run.encounters[0]?.target).toEqual({
		family: "Phraseme",
		kind: "Collocation",
		memberSegmentIndices: [2, 8, 10],
	});
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
	const run = setupWithAnalysis(
		[{ family: "Lexeme", kind: "ADP", memberSegmentIndices: [8] }],
		{ analysis: verfuegungAnalysis({ collocation: false }) },
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
});

test("an Unresolved unit, or no stored analysis, falls back to click-time classification", async () => {
	const inspection = createInspectionCapture();
	for (const analysis of [
		verfuegungAnalysis({
			collocation: false,
			nounRoute: { Unresolved: 0.7, NOUN: 0.3 },
		}),
		null,
	]) {
		const run = setupWithAnalysis(
			[{ family: "Lexeme", kind: "NOUN", memberSegmentIndices: [10] }],
			{ analysis, inspection },
		);
		await Effect.runPromise(
			run.orchestrator.resolveSegment(verfuegungSelection),
		);
		expect(run.encounters[0]?.target).toEqual({
			family: "Lexeme",
			kind: "NOUN",
			memberSegmentIndices: [10],
		});
		expect(
			run.requests.filter(
				(request) => request.stage === "classifyTarget",
			),
		).toHaveLength(1);
	}
	const steps = inspection.steps.filter((step) =>
		step.name.startsWith("Select target"),
	);
	expect(steps.map((step) => step.name)).toEqual([
		"Select target · classified",
		"Select target · classified",
	]);
	expect(
		steps.map((step) => JSON.parse(step.payloadJson).input.hasAnalysis),
	).toEqual([true, false]);
	expect(
		steps.map((step) => JSON.parse(step.payloadJson).output.path),
	).toEqual(["classified", "classified"]);
});
