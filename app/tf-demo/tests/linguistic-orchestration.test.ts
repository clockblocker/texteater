import { expect, test } from "bun:test";
import {
	type CommitChangesRequest,
	createDumdictService,
	type DumdictStoragePort,
	type StoreRevision,
} from "dumdict";
import { createDumgen } from "dumgen";
import type { Encounter, ModelExchange } from "dumgen/types";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import { pipelineFixture } from "../../../battery/dumgen/tests/pipeline-fixture.js";
import {
	applyValidatedReadingKnowledgeChange,
	createTfDemoOrchestrator,
	type OrchestrationPersistence,
	type PersistedSentence,
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
		inflectionalFeatures: { case: "Nom", number: "Plur" },
	},
	realizationCoverage: "Full",
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
		inflectionalFeatures: { case: "Nom", number: "Plur" },
	},
	lemma: {
		canonicalForm: "Bank",
		coreFeatures: { gender: "Fem", hyph: null },
	},
	realizationCoverage: "Full",
};
function setup(
	outputs: unknown[],
	overrides: Partial<OrchestrationPersistence> = {},
	candidates: Dumling.Reading<"de">[] = [],
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
		async getSentenceForResolution(): Promise<PersistedSentence> {
			return {
				sentenceId: "sentence-1",
				textId: "text-1",
				segmentedSentenceId: "sentence-1",
				language: "de",
				stitchedText: "Banken",
				segments: [
					{ index: 0, kind: "ResolvableText", text: "Banken" },
				],
			};
		},
		async findRecordedClick() {
			return recorded;
		},
		async findAttestation() {
			return occurrence;
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
		onModelExchange: (exchange) => requests.push(exchange.request),
	});
	return {
		orchestrator: createTfDemoOrchestrator({
			dumgen,
			dictionary: createDumdictService({ language: "de", storage }),
			persistence,
		}),
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
		{ emojiDescription: "🏦" },
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
	expect(run.requests).toHaveLength(5);
});

test("retry uses its exact Grammar checkpoint and skips classification and grammar", async () => {
	const run = setup([{ emojiDescription: "🏦" }]);
	await Effect.runPromise(
		run.orchestrator.resolveSegment(selection, { grammatical: grammar }),
	);
	expect(run.requests.map((request) => request.stage)).toEqual([
		"resolveOrGenerateReadingEmojiDescription",
	]);
	expect(run.writes[0]?.reading).toEqual(reading);
});

test("stored Reading candidates are compared and reused without a new Reading plan", async () => {
	const run = setup([{ emojiDescription: "🏦" }], {}, [reading]);
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
		async findAttestation() {
			return {
				attestationId: "attestation-1",
				grammatical: grammar,
				reading,
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
