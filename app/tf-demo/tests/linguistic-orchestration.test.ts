import { expect, test } from "bun:test";
import {
	type CommitChangesRequest,
	createDumdictService,
	type DumdictStoragePort,
	type StoreRevision,
} from "dumdict";
import { createDumgen } from "dumgen";
import type { DumgenOptions, Encounter, ModelExchange } from "dumgen/types";
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
	> & { execute?: DumgenOptions["execute"] } = {},
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
	const dumgen = createDumgen({
		...pipelineFixture(outputs),
		...(hooks.execute ? { execute: hooks.execute } : {}),
		onModelExchange: (exchange) => requests.push(exchange.request),
		onOperation: (trace) => hooks.inspection?.operation(trace),
	});
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
	expect(
		run.writes[0]?.dictionaryPlan.changes.map((change) => change.type),
	).toEqual(["createLemma", "createReading", "createOwnedSurface"]);
	expect(run.commits).toHaveLength(0); // The host transaction receives the whole plan.
	expect(result).toMatchObject({
		grammatical: { encounter },
		persisted: { status: "Committed" },
	});
	expect(
		run.requests.filter((request) => request.stage === "classifyTarget"),
	).toHaveLength(1);
	await Effect.runPromise(run.orchestrator.resolveSegment(selection));
	expect(run.writes).toHaveLength(1);
	expect(run.requests).toHaveLength(6);
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
	expect(
		run.writes[0]?.dictionaryPlan.changes.some(
			(change) => change.type === "createReading",
		),
	).toBe(false);
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

test("Knowledge drafts start only after the Emoji Description and receive it as the sense anchor", async () => {
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
				expect(emojiSettled).toBe(true);
				expect(input.reading).toEqual({
					unitKind: "Reading",
					lemma,
					emojiDescription: "🏦",
				});
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
	await emojiStarted.promise;
	expect(run.writes).toHaveLength(0);
	releaseEmoji.resolve();
	await Promise.all([draftStarted.promise, readingAvailable.promise]);
	expect(run.writes).toHaveLength(0);
	releaseDraft.resolve();
	await pending;
	expect(run.writes).toHaveLength(1);
	expect(run.writes[0]?.reading.emojiDescription).toBe("🏦");
	expect(JSON.parse(run.writes[0]?.knowledgeDraftJson ?? "null")).toEqual(
		draft,
	);
});

test("emoji failure never starts Knowledge drafting or hands anything to persistence", async () => {
	let drafts = 0;
	const run = setup([], {}, [], {
		draftKnowledge: () => {
			drafts++;
			return Effect.succeed({ sourceFingerprint: "unused", texts: [] });
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
	expect(drafts).toBe(0);
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

test("existing Reading candidates bypass Knowledge speculation", async () => {
	let drafts = 0;
	const run = setup(
		[{ decision: "Reuse", emojiDescription: "🏦" }],
		{},
		[{ unitKind: "Reading", lemma, emojiDescription: "🏦" }],
		{
			draftKnowledge: () => {
				drafts++;
				return Effect.succeed({
					sourceFingerprint: "unused",
					texts: [],
				});
			},
		},
	);
	await Effect.runPromise(
		run.orchestrator.resolveSegment(selection, { grammatical: grammar }),
	);
	expect(drafts).toBe(0);
	expect(run.writes[0]?.knowledgeDraftJson).toBeUndefined();
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

test("a failed dictionary read waits for the in-flight checkpoint before failure handling", async () => {
	const checkpoint = Promise.withResolvers<void>();
	const readStarted = Promise.withResolvers<void>();
	let saved = false;
	let settled = false;
	const run = setup(["🏦"], {}, [reading], {
		observer: {
			async grammarAvailable() {},
			async readingAvailable() {
				await checkpoint.promise;
				saved = true;
			},
			async committing() {
				throw Error("Must not commit failed preparation");
			},
		},
	});
	run.storage.loadReadingEntryContext = () =>
		Effect.sync(() => {
			readStarted.resolve();
			throw Error("Read failed while checkpoint was in flight");
		});
	const outcome = Effect.runPromise(
		run.orchestrator.resolveSegment(selection, { grammatical: grammar }),
	).then(
		() => {
			settled = true;
			return "Success";
		},
		() => {
			settled = true;
			return "Failure";
		},
	);
	try {
		await readStarted.promise;
		await Bun.sleep(0);
		expect(settled).toBe(false);
	} finally {
		checkpoint.resolve();
	}
	expect(await outcome).toBe("Failure");
	expect(saved).toBe(true);
	expect(run.writes).toHaveLength(0);
});
