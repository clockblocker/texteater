import { describe, expect, test } from "bun:test";
import {
	type CommitChangesRequest,
	createDumdictService,
	type DumdictStoragePort,
	type StoreRevision,
} from "dumdict";
import { type AiSdk, buildDumgen, type Dumgen } from "dumgen";
import { readingFingerprint } from "dumling";
import { lemmaIdentityKey } from "../server/linguisticIdentity";
import {
	applyValidatedReadingKnowledgeChange,
	createTfDemoOrchestrator,
	type OrchestrationPersistence,
	type PersistedSentence,
	type ReusableAttestation,
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
				explicitExistingLemmaTargets: [],
				existingPendingRelationsForProposedPendingTargets: [],
				pendingRelationsMatchingProposedLemma: [],
				relationLemmas: [],
				relationReadings: [],
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
		async findRecordedClick() {
			return null;
		},
		async findAttestation() {
			return null;
		},
		async persistResolvedClick(input) {
			persistedClick = input;
			const createReading = input.dictionaryPlan.changes.find(
				(change) => change.type === "createReading",
			);
			if (!createReading) throw new Error("Expected a Reading plan.");
			const sentence = submitted?.sentences[0];
			if (!sentence) throw new Error("Expected a submitted Sentence.");
			return {
				status: "Committed",
				clickId: "click-1",
				attestationId: "attestation-1",
				readingId: "reading-1",
				deduplicated: false,
				occurrence: {
					attestationId: "attestation-1",
					grammatical: {
						decision: "Resolved",
						language: "de",
						markedContext: "Die <TARGET>Banken</TARGET>.",
						attestation: input.occurrence.attestation,
						interaction: {
							segmentedSentenceId: sentence.segmentedSentenceId,
							clickedSegmentIndex: input.clickedSegmentIndex,
							memberSegmentIndices:
								input.occurrence.memberSegmentIndices,
						},
					},
					reading: createReading.entry.reading,
				},
			};
		},
		async persistReusedResolvedClick() {
			throw new Error("A first resolution cannot reuse an Attestation.");
		},
		async persistUnresolvedClick() {
			throw new Error("Expected a resolved click.");
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
	expect(commits).toHaveLength(0);
	expect(
		persistedClick?.dictionaryPlan.changes.map(({ type }) => type),
	).toEqual(["createLemma", "createReading", "createOwnedSurface"]);
	expect(
		persistedClick?.dictionaryPlan.changes.find(
			({ type }) => type === "createReading",
		),
	).toMatchObject({
		entry: {
			reading: { emojiDescription: "🏦" },
			attestations: [],
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
		occurrence: {
			lemmaKey: lemmaIdentityKey(lemma),
			memberSegmentIndices: [2],
			attestation: resolution.grammatical.attestation,
		},
		readingKey: readingFingerprint(reading),
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
								attestations: [],
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
			async ensureOwnedSurface(_request, options) {
				if (!options?.applyPlan)
					throw new Error("Expected host plan capture.");
				await options.applyPlan({
					baseRevision: revision,
					changes: [],
				});
				return {
					status: "applied",
					baseRevision: revision,
					nextRevision: revision,
					affected: {},
					summary: { message: "Already stored." },
				};
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
			async findRecordedClick() {
				return null;
			},
			async findAttestation() {
				contextLookups += 1;
				return contextLookups === 1
					? null
					: {
							attestationId: "attestation-1",
							grammatical: grammaticalResult,
							reading,
						};
			},
			async persistResolvedClick() {
				persisted = true;
				return {
					status: "Committed",
					clickId: "click-1",
					attestationId: "attestation-1",
					readingId: "reading-1",
					deduplicated: false,
					occurrence: {
						attestationId: "attestation-1",
						grammatical: grammaticalResult,
						reading,
					},
				};
			},
			async persistReusedResolvedClick() {
				persisted = true;
				return {
					status: "Reused",
					clickId: "click-2",
					attestationId: "attestation-1",
					readingId: "reading-1",
					deduplicated: false,
				};
			},
			async persistUnresolvedClick() {
				throw new Error("Expected a resolved click.");
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

	expect(result.dictionaryPlan.changes).toEqual([]);
	expect(persisted).toBe(true);
	expect(grammaticalCalls).toBe(1);
	expect(readingCalls).toBe(1);
});

for (const order of [
	[4, 6],
	[6, 4],
] as const) {
	test(`sequential ${order[0] === 4 ? "sind → geöffnet" : "geöffnet → sind"} clicks share one occurrence and one Dumgen resolution`, async () => {
		const lemma = {
			canonicalForm: "Bank",
			coreFeatures: { gender: "Fem", hyph: null },
			family: "Lexeme",
			kind: "NOUN",
			language: "de",
		} as const;
		const surface = {
			language: "de",
			normalizedSurface: "Banken",
			spelling: "Canonical",
			surfaceKind: "Inflection",
			surfaceFeatures: null,
			inflectionalFeatures: { case: "Nom", number: "Plur" },
			lemma,
		} as const;
		const reading = { lemma, emojiDescription: "🏦" } as const;
		const segments = [
			{ index: 0, kind: "ResolvableText", text: "Die" },
			{ index: 1, kind: "Whitespace", text: " " },
			{ index: 2, kind: "ResolvableText", text: "Banken" },
			{ index: 3, kind: "Whitespace", text: " " },
			{ index: 4, kind: "ResolvableText", text: "sind" },
			{ index: 5, kind: "Whitespace", text: " " },
			{ index: 6, kind: "ResolvableText", text: "geöffnet" },
		] as const;
		let grammaticalCalls = 0;
		let readingCalls = 0;
		let committed: ReusableAttestation | null = null;
		const visitorClicks: string[] = [];
		const { storage } = createPlanningStorage();
		const orchestrator = createTfDemoOrchestrator({
			dumgen: {
				async segment() {
					throw new Error("Unexpected segmentation.");
				},
				resolve: {
					async grammatical(_language, input) {
						grammaticalCalls += 1;
						return {
							decision: "Resolved",
							language: "de",
							markedContext:
								"Die Banken <TARGET>sind</TARGET> <TARGET>geöffnet</TARGET>",
							attestation: {
								members: [
									{
										attested: "sind",
										orthography: "Standard",
									},
									{
										attested: "geöffnet",
										orthography: "Standard",
									},
								],
								realizationCoverage: "Full",
								surface,
							},
							interaction: {
								segmentedSentenceId: "segmented-1",
								clickedSegmentIndex: input.clickedSegmentIndex,
								memberSegmentIndices: [4, 6],
							},
						} as const;
					},
					async reading() {
						readingCalls += 1;
						return {
							decision: "New",
							emojiDescription: "🏦",
						} as const;
					},
				},
			} as Dumgen,
			dictionary: createDumdictService({ language: "de", storage }),
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
						stitchedText: "Die Banken sind geöffnet",
						segments,
					};
				},
				async findRecordedClick() {
					return null;
				},
				async findAttestation({ clickedSegmentIndex }) {
					if (!committed) return null;
					return {
						...committed,
						grammatical: {
							...committed.grammatical,
							interaction: {
								...committed.grammatical.interaction,
								clickedSegmentIndex,
							},
						},
					};
				},
				async persistResolvedClick(input) {
					visitorClicks.push(input.visitorId);
					committed = {
						attestationId: "attestation-1",
						grammatical: {
							decision: "Resolved",
							language: "de",
							markedContext:
								"Die Banken <TARGET>sind</TARGET> <TARGET>geöffnet</TARGET>",
							attestation: input.occurrence.attestation,
							interaction: {
								segmentedSentenceId: "segmented-1",
								clickedSegmentIndex: input.clickedSegmentIndex,
								memberSegmentIndices: [4, 6],
							},
						},
						reading,
					};
					return {
						status: "Committed",
						clickId: "click-1",
						attestationId: committed.attestationId,
						readingId: "reading-1",
						deduplicated: false,
						occurrence: committed,
					};
				},
				async persistReusedResolvedClick(input) {
					visitorClicks.push(input.visitorId);
					return {
						status: "Reused",
						clickId: "click-2",
						attestationId: input.attestationId,
						readingId: "reading-1",
						deduplicated: false,
					};
				},
				async persistUnresolvedClick() {
					throw new Error("Expected a resolved click.");
				},
			},
		});

		const first = await orchestrator.resolveSegment({
			requestId: "request-1",
			visitorId: "visitor-1",
			sentenceId: "sentence-1",
			clickedSegmentIndex: order[0],
		});
		const second = await orchestrator.resolveSegment({
			requestId: "request-2",
			visitorId: "visitor-2",
			sentenceId: "sentence-1",
			clickedSegmentIndex: order[1],
		});

		expect(grammaticalCalls).toBe(1);
		expect(readingCalls).toBe(1);
		expect(first.persisted.attestationId).toBe("attestation-1");
		expect(second.grammatical.attestation).toEqual(
			first.grammatical.attestation,
		);
		expect(second.reading).toEqual(first.reading);
		expect(visitorClicks).toEqual(["visitor-1", "visitor-2"]);
	});
}

test("replays a recorded unresolved Click without invoking Dumgen or dictionary work", async () => {
	const orchestrator = createTfDemoOrchestrator({
		dumgen: {
			async segment() {
				throw new Error("A request retry must not invoke Dumgen.");
			},
			resolve: {
				async grammatical() {
					throw new Error("A request retry must not invoke Dumgen.");
				},
				async reading() {
					throw new Error("A request retry must not invoke Dumgen.");
				},
			},
		} as Dumgen,
		dictionary: {
			findStoredReadings() {
				throw new Error("A request retry must not consult Dumdict.");
			},
		} as never,
		persistence: {
			async persistSubmittedText() {
				throw new Error("Unexpected submission.");
			},
			async getSentenceForResolution() {
				throw new Error(
					"A request retry must not reload the Sentence.",
				);
			},
			async findRecordedClick() {
				return { status: "Unresolved", clickId: "click-1" };
			},
			async findAttestation() {
				throw new Error(
					"A request retry must stop before membership lookup.",
				);
			},
			async persistResolvedClick() {
				throw new Error("A request retry must not write.");
			},
			async persistReusedResolvedClick() {
				throw new Error("A request retry must not write.");
			},
			async persistUnresolvedClick() {
				throw new Error("A request retry must not write.");
			},
		},
	});

	const result = await orchestrator.resolveSegment({
		requestId: "request-1",
		visitorId: "visitor-1",
		sentenceId: "sentence-1",
		clickedSegmentIndex: 0,
	});

	expect(result).toEqual({
		grammatical: { decision: "Unresolved", language: "de" },
		deduplicated: true,
		persisted: { status: "Unresolved", clickId: "click-1" },
	});
});

test("persists a fresh unresolved Click with a discriminated result", async () => {
	const orchestrator = createTfDemoOrchestrator({
		dumgen: {
			async segment() {
				throw new Error("Unexpected segmentation.");
			},
			resolve: {
				async grammatical() {
					return { decision: "Unresolved", language: "de" } as const;
				},
				async reading() {
					throw new Error("An unresolved click has no Reading.");
				},
			},
		} as Dumgen,
		dictionary: {} as never,
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
					stitchedText: "qzxv",
					segments: [
						{ index: 0, kind: "ResolvableText", text: "qzxv" },
					],
				};
			},
			async findRecordedClick() {
				return null;
			},
			async findAttestation() {
				return null;
			},
			async persistResolvedClick() {
				throw new Error("An unresolved click has no occurrence.");
			},
			async persistReusedResolvedClick() {
				throw new Error(
					"An unresolved click cannot reuse an occurrence.",
				);
			},
			async persistUnresolvedClick() {
				return {
					status: "Unresolved",
					clickId: "click-1",
					deduplicated: false,
				};
			},
		},
	});

	const result = await orchestrator.resolveSegment({
		requestId: "request-1",
		visitorId: "visitor-1",
		sentenceId: "sentence-1",
		clickedSegmentIndex: 0,
	});

	expect(result).toEqual({
		grammatical: { decision: "Unresolved", language: "de" },
		persisted: {
			status: "Unresolved",
			clickId: "click-1",
			deduplicated: false,
		},
	});
});

test("an unresolved model result yields to membership committed during model work", async () => {
	const lemma = {
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "Bank",
		coreFeatures: { gender: "Fem", hyph: null },
	} as const;
	const surface = {
		language: "de",
		normalizedSurface: "Banken",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		surfaceFeatures: null,
		inflectionalFeatures: { case: "Nom", number: "Plur" },
		lemma,
	} as const;
	const winner: ReusableAttestation = {
		attestationId: "attestation-1",
		grammatical: {
			decision: "Resolved",
			language: "de",
			markedContext: "Die <TARGET>Banken</TARGET>",
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
		},
		reading: { lemma, emojiDescription: "🏦" },
	};
	const orchestrator = createTfDemoOrchestrator({
		dumgen: {
			async segment() {
				throw new Error("Unexpected segmentation.");
			},
			resolve: {
				async grammatical() {
					return { decision: "Unresolved", language: "de" } as const;
				},
				async reading() {
					throw new Error("The losing result has no Reading.");
				},
			},
		} as Dumgen,
		dictionary: {} as never,
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
					stitchedText: "Die Banken",
					segments: [
						{ index: 0, kind: "ResolvableText", text: "Die" },
						{ index: 1, kind: "Whitespace", text: " " },
						{ index: 2, kind: "ResolvableText", text: "Banken" },
					],
				};
			},
			async findRecordedClick() {
				return null;
			},
			async findAttestation() {
				return null;
			},
			async persistResolvedClick() {
				throw new Error("The losing result is unresolved.");
			},
			async persistReusedResolvedClick() {
				throw new Error("No membership existed before model work.");
			},
			async persistUnresolvedClick() {
				return {
					status: "Reused",
					clickId: "click-1",
					attestationId: winner.attestationId,
					readingId: "reading-1",
					deduplicated: false,
					occurrence: winner,
				};
			},
		},
	});

	const result = await orchestrator.resolveSegment({
		requestId: "request-1",
		visitorId: "visitor-1",
		sentenceId: "sentence-1",
		clickedSegmentIndex: 2,
	});

	expect(result).toMatchObject({
		grammatical: { decision: "Resolved" },
		reading: { emojiDescription: "🏦" },
		reused: true,
		persisted: { status: "Reused", attestationId: "attestation-1" },
	});
});

describe("Dumrel Knowledge Change seam", () => {
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
			applyValidatedReadingKnowledgeChange({
				reading,
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

	test("connects Reading Knowledge to a Lemma target", () => {
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
			applyValidatedReadingKnowledgeChange({
				reading: institute,
				change: {
					kind: "Contribute",
					aspect: "semanticRelations",
					relation: "hypernym",
					value: [bank.lemma],
				},
			}),
		).toEqual({
			change: {
				kind: "Contribute",
				aspect: "semanticRelations",
				relation: "hypernym",
				value: [bank.lemma],
			},
			knowledge: {
				semanticRelations: { hypernym: [bank.lemma] },
			},
		});
	});
});
