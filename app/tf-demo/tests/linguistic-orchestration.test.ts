import { describe, expect, test } from "bun:test";
import {
	type CommitChangesRequest,
	createDumdictService,
	type DumdictStoragePort,
	type StoreRevision,
} from "dumdict";
import { type AiSdk, buildDumgen, type Dumgen } from "dumgen";
import {
	lemmaKeyFor,
	readingKeyFor,
	resolutionKeyFor,
} from "../convex/model/linguisticKeys";
import { attestationIdentityKey } from "../server/attestationIdentity";
import {
	applyValidatedKnowledgeContribution,
	createTfDemoOrchestrator,
	type OrchestrationPersistence,
	type PersistedSentence,
} from "../server/linguisticOrchestration";

const revision = "revision-0" as StoreRevision;

function queueSdk(outputs: unknown[]): AiSdk {
	return {
		async structuredGeneration() {
			const output = outputs.shift();
			if (output === undefined)
				throw new Error("No queued model output.");
			return output as never;
		},
		async unstructuredGeneration() {
			throw new Error("Unexpected unstructured generation.");
		},
	};
}

function createPlanningStorage() {
	const commits: CommitChangesRequest<"de">[] = [];
	const storage: DumdictStoragePort<"de"> = {
		async findStoredReadings() {
			return { revision, candidates: [] };
		},
		async loadNewNoteContext() {
			return {
				revision,
				existingOwnedSurfaces: [],
				explicitExistingReadingTargets: [],
				existingPendingRelationsForProposedPendingTargets: [],
			};
		},
		async commitChanges(request) {
			commits.push(request);
			return {
				status: "committed",
				nextRevision: "revision-1" as StoreRevision,
			};
		},
		async loadReadingForPatch() {
			throw new Error("Unexpected Reading patch.");
		},
		async getInfoForRelationsCleanup() {
			throw new Error("Unexpected relation cleanup lookup.");
		},
		async loadCleanupRelationsContext() {
			throw new Error("Unexpected relation cleanup load.");
		},
	};
	return { commits, storage };
}

test("runs the real German Dumgen chain and the Dumdict new-Reading workflow", async () => {
	const { commits, storage } = createPlanningStorage();
	let submitted:
		| Parameters<OrchestrationPersistence["persistSubmittedText"]>[0]
		| undefined;
	let persistedClick:
		| Parameters<OrchestrationPersistence["persistResolvedClick"]>[0]
		| undefined;
	const persistence: OrchestrationPersistence = {
		async persistSubmittedText(input) {
			submitted = input;
			return { textId: "text-1", sentenceIds: ["sentence-1"] };
		},
		async getSentenceForResolution() {
			const sentence = submitted?.sentences[0];
			if (!sentence) return null;
			return {
				sentenceId: "sentence-1",
				textId: "text-1",
				segmentedSentenceId: sentence.segmentedSentenceId,
				language: sentence.language,
				stitchedText: sentence.stitchedText,
				segments: sentence.segments.map((segment, index) => ({
					index,
					...segment,
				})),
			} satisfies PersistedSentence;
		},
		async findResolvedContext() {
			return null;
		},
		async persistResolvedClick(input) {
			persistedClick = input;
			return { contextId: "context-1" };
		},
		async persistReusedResolvedClick() {
			throw new Error("A first resolution cannot reuse a context.");
		},
	};
	const dumgen = buildDumgen({
		sdk: queueSdk([
			{
				language: "de",
				items: [
					{
						id: "item-0",
						decision: "Accepted",
						language: "de",
						stitchedText: "Die Banken.",
					},
				],
			},
			{
				decision: "Resolved",
				additionalMemberIndices: [],
				target: { family: "Lexeme", kind: "NOUN" },
			},
			{
				memberOrthographies: ["Standard"],
				normalizedMembers: ["Banken"],
				surface: {
					spelling: "Canonical",
					surfaceKind: "Inflection",
					surfaceFeatures: null,
					inflectionalFeatures: { case: "Nom", number: "Plur" },
				},
				lemma: {
					canonicalForm: "Bank",
					coreFeatures: { gender: "Fem", hyph: null },
				},
			},
			{ decision: "New", emojiDescription: "🏦" },
		]),
	});
	const orchestrator = createTfDemoOrchestrator({
		dumgen,
		dictionary: createDumdictService({ language: "de", storage }),
		persistence,
	});

	const submission = await orchestrator.submitText({
		submissionKey: "submission-1",
		sourceText: "Die Banken.",
	});
	const resolution = await orchestrator.resolveSegment({
		requestId: "request-1",
		visitorId: "visitor-1",
		sentenceId: "sentence-1",
		clickedSegmentIndex: 2,
	});

	expect(submission.ok).toBe(true);
	expect(submitted?.sentences[0]?.segments).toEqual([
		{ kind: "ResolvableText", text: "Die" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "Banken" },
		{ kind: "Punctuation", text: "." },
	]);
	expect(resolution.grammatical).toMatchObject({
		decision: "Resolved",
		markedContext: "Die <TARGET>Banken</TARGET>.",
		attestation: {
			members: [{ attested: "Banken", orthography: "Standard" }],
			surface: { lemma: { canonicalForm: "Bank" } },
		},
	});
	expect(commits).toHaveLength(1);
	expect(commits[0]?.changes.map(({ type }) => type)).toEqual([
		"createLemma",
		"createReading",
		"createOwnedSurface",
	]);
	expect(
		commits[0]?.changes.find(({ type }) => type === "createReading"),
	).toMatchObject({
		entry: {
			reading: { emojiDescription: "🏦" },
			attestations: [
				attestationIdentityKey({
					sentenceId: "sentence-1",
					textId: "text-1",
				}),
			],
		},
	});
	if (resolution.grammatical.decision !== "Resolved") {
		throw new Error("Expected a resolved German click.");
	}
	const lemma = resolution.grammatical.attestation.surface.lemma;
	const reading = { lemma, emojiDescription: "🏦" };
	expect(persistedClick).toMatchObject({
		requestId: "request-1",
		visitorId: "visitor-1",
		resolution: {
			resolutionKey: resolutionKeyFor(
				submitted?.sentences[0]?.segmentedSentenceId ?? "",
				[2],
			),
			lemmaKey: lemmaKeyFor(lemma),
			memberSegmentIndices: [2],
			attestation: resolution.grammatical.attestation,
		},
		readingKey: readingKeyFor(reading),
	});
});

test("reuses a globally resolved Segment without invoking Dumgen again", async () => {
	const lemma = {
		canonicalForm: "Bank",
		coreFeatures: { gender: "Fem", hyph: null },
		family: "Lexeme",
		kind: "NOUN",
		language: "de",
	} as const;
	const reading = { lemma, emojiDescription: "🏦" };
	const surface = {
		language: "de",
		normalizedSurface: "Banken",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		surfaceFeatures: null,
		inflectionalFeatures: { case: "Nom", number: "Plur" },
		lemma,
	} as const;
	const grammaticalResult = {
		decision: "Resolved",
		language: "de",
		markedContext: "Die <TARGET>Banken</TARGET>.",
		attestation: {
			members: [{ attested: "Banken", orthography: "Standard" }],
			realizationCoverage: "Full",
			surface,
		},
		interaction: {
			segmentedSentenceId: "segmented-1",
			clickedSegmentIndex: 2,
			memberSegmentIndices: [2],
		},
	} as const;
	let persisted = false;
	let contextLookups = 0;
	let grammaticalCalls = 0;
	let readingCalls = 0;
	const orchestrator = createTfDemoOrchestrator({
		dumgen: {
			async segment() {
				throw new Error("Unexpected segmentation.");
			},
			resolve: {
				async grammatical() {
					grammaticalCalls += 1;
					return grammaticalResult;
				},
				async reading() {
					readingCalls += 1;
					return { decision: "Reuse", emojiDescription: "🏦" };
				},
			},
		} as Dumgen,
		dictionary: {
			async findStoredReadings() {
				return {
					revision,
					candidates: [
						{
							reading,
							note: {
								attestedTranslations: [],
								attestations: [
									attestationIdentityKey({
										sentenceId: "sentence-1",
										textId: "text-1",
									}),
								],
								notes: "",
							},
						},
					],
				};
			},
			async addAttestation() {
				throw new Error("Duplicate evidence must not be appended.");
			},
			async addNewNote() {
				throw new Error("An existing Reading must not be recreated.");
			},
			async getInfoForRelationsCleanup() {
				throw new Error("Unexpected cleanup.");
			},
			async cleanupRelations() {
				throw new Error("Unexpected cleanup.");
			},
		},
		persistence: {
			async persistSubmittedText() {
				throw new Error("Unexpected submission.");
			},
			async getSentenceForResolution() {
				return {
					sentenceId: "sentence-1",
					textId: "text-1",
					segmentedSentenceId: "segmented-1",
					language: "de",
					stitchedText: "Die Banken.",
					segments: [
						{ index: 0, kind: "ResolvableText", text: "Die" },
						{ index: 1, kind: "Whitespace", text: " " },
						{ index: 2, kind: "ResolvableText", text: "Banken" },
						{ index: 3, kind: "Punctuation", text: "." },
					],
				};
			},
			async findResolvedContext() {
				contextLookups += 1;
				return contextLookups === 1
					? null
					: {
							resolvedContextId: "resolved-context-1",
							grammatical: grammaticalResult,
							reading,
						};
			},
			async persistResolvedClick() {
				persisted = true;
				return {};
			},
			async persistReusedResolvedClick() {
				persisted = true;
				return {};
			},
		},
	});

	const result = await orchestrator.resolveSegment({
		requestId: "request-repeat",
		visitorId: "visitor-1",
		sentenceId: "sentence-1",
		clickedSegmentIndex: 2,
	});
	await orchestrator.resolveSegment({
		requestId: "request-repeat-again",
		visitorId: "visitor-2",
		sentenceId: "sentence-1",
		clickedSegmentIndex: 2,
	});

	expect(result.dictionaryMutation.status).toBe("alreadyApplied");
	expect(persisted).toBe(true);
	expect(grammaticalCalls).toBe(1);
	expect(readingCalls).toBe(1);
});

describe("Dumrel Knowledge Contribution seam", () => {
	test("validates a Reading Change and applies it through Dumdict", () => {
		const reading = {
			lemma: {
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "Bank",
				coreFeatures: { gender: "Fem", hyph: null },
			},
			emojiDescription: "🏦",
		};

		expect(
			applyValidatedKnowledgeContribution({
				owner: { kind: "Reading", reading },
				change: {
					kind: "Contribute",
					aspect: "definition",
					value: "Ein Geldinstitut.",
				},
			}),
		).toEqual({
			change: {
				kind: "Contribute",
				aspect: "definition",
				value: "Ein Geldinstitut.",
			},
			knowledge: { definition: "Ein Geldinstitut." },
		});
	});

	test("connects one stored Reading reference to another", () => {
		const bank = {
			lemma: {
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "Bank",
				coreFeatures: { gender: "Fem", hyph: null },
			},
			emojiDescription: "🏦",
		} as const;
		const institute = {
			lemma: {
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "Institut",
				coreFeatures: { gender: "Neut", hyph: null },
			},
			emojiDescription: "🏢",
		} as const;

		expect(
			applyValidatedKnowledgeContribution({
				owner: { kind: "Reading", reading: institute },
				change: {
					kind: "Contribute",
					aspect: "semanticRelations",
					relation: "hypernym",
					value: [bank],
				},
			}),
		).toEqual({
			change: {
				kind: "Contribute",
				aspect: "semanticRelations",
				relation: "hypernym",
				value: [bank],
			},
			knowledge: {
				semanticRelations: { hypernym: [bank] },
			},
		});
	});
});
