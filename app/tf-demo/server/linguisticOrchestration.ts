import type {
	DumdictPlan,
	DumdictService,
	Lemma,
	ReadingEntry,
	ReadingKnowledgeChange,
	StoreRevision,
	Surface,
} from "dumdict";
import { applyDumdictKnowledgeChange, makeSurfaceId } from "dumdict/runtime";
import type {
	Dumgen,
	GrammaticalResult,
	Segment,
	SegmentedSentence,
	SegmentedSentenceId,
} from "dumgen";
import { readingFingerprint } from "dumling";
import type { Reading } from "dumling/types";
import {
	type KnowledgeChange,
	parseAsKnowledgeChange,
	type ReadingKnowledge,
} from "dumrel";

import { lemmaIdentityKey } from "./linguisticIdentity";
import {
	parseGermanLemma,
	parseGermanReading,
	unwrapOperationalParse,
} from "./operationalParsing";
import { splitInSentences } from "./sentenceSplitting";

export type PersistedSentence = {
	readonly sentenceId: string;
	readonly textId: string;
	readonly segmentedSentenceId: string;
	readonly language: "de" | "he";
	readonly stitchedText: string;
	readonly segments: readonly {
		readonly index: number;
		readonly kind: string;
		readonly text: string;
	}[];
};

export type SubmittedSentence = {
	readonly segmentedSentenceId: string;
	readonly position: number;
	readonly language: "de" | "he";
	readonly stitchedText: string;
	readonly segments: readonly Segment[];
};

export type ResolvedClickPersistence = {
	readonly requestId: string;
	readonly visitorId: string;
	readonly sentenceId: string;
	readonly clickedSegmentIndex: number;
	readonly occurrence: {
		readonly memberSegmentIndices: readonly number[];
		readonly attestation: Extract<
			GrammaticalResult<"de">,
			{ decision: "Resolved" }
		>["attestation"];
		readonly surfaceKey: string;
		readonly lemmaKey: string;
	};
	readonly reading: Reading<"de">;
	readonly readingKey: string;
	readonly dictionaryPlan: DumdictPlan<"de">;
};

export type ReusableAttestation = {
	readonly attestationId: string;
	readonly grammatical: Extract<
		GrammaticalResult<"de">,
		{ decision: "Resolved" }
	>;
	readonly reading: Reading<"de">;
};

export type RecordedClick =
	| {
			readonly status: "Unresolved";
			readonly clickId: string;
	  }
	| {
			readonly status: "Resolved";
			readonly clickId: string;
			readonly readingId: string;
			readonly occurrence: ReusableAttestation;
	  };

export type UnresolvedClickCommit = {
	readonly status: "Unresolved";
	readonly clickId: string;
	readonly deduplicated: boolean;
};

export type ReusedResolvedClickCommit = {
	readonly status: "Reused";
	readonly clickId: string;
	readonly attestationId: string;
	readonly readingId: string;
	readonly deduplicated: boolean;
};

export type LateResolvedClickCommit = {
	readonly status: "Reused";
	readonly clickId: string;
	readonly attestationId: string;
	readonly readingId: string;
	readonly deduplicated: boolean;
	readonly occurrence: ReusableAttestation;
};

export type ResolvedClickCommit =
	| {
			readonly status: "Committed" | "Reused";
			readonly clickId: string;
			readonly attestationId: string;
			readonly readingId: string;
			readonly deduplicated: boolean;
			readonly occurrence: ReusableAttestation;
	  }
	| {
			readonly status: "MembershipConflict";
			readonly code: "partialOverlap";
			readonly message: string;
			readonly conflictingAttestationIds: readonly string[];
	  }
	| {
			readonly status: "DictionaryConflict";
			readonly code: "revisionConflict" | "semanticPreconditionFailed";
			readonly message: string;
			readonly latestRevision?: StoreRevision;
	  };

type ResolvedGrammatical = Extract<
	GrammaticalResult<"de">,
	{ decision: "Resolved" }
>;

type NonResolvedGrammatical = Exclude<
	GrammaticalResult<"de">,
	{ decision: "Resolved" }
>;

type ReadingResolution = {
	readonly decision: "Reuse" | "New";
	readonly emojiDescription: string;
};

export type ResolveSegmentResult =
	| {
			readonly grammatical: ResolvedGrammatical;
			readonly reading: Reading<"de">;
			readonly reused: true;
			readonly deduplicated: true;
			readonly persisted: Extract<RecordedClick, { status: "Resolved" }>;
	  }
	| {
			readonly grammatical: {
				readonly decision: "Unresolved";
				readonly language: "de";
			};
			readonly deduplicated: true;
			readonly persisted: Extract<
				RecordedClick,
				{ status: "Unresolved" }
			>;
	  }
	| {
			readonly grammatical: ResolvedGrammatical;
			readonly reading: Reading<"de">;
			readonly reused: true;
			readonly persisted: ReusedResolvedClickCommit;
	  }
	| {
			readonly grammatical: ResolvedGrammatical;
			readonly reading: Reading<"de">;
			readonly reused: true;
			readonly persisted: LateResolvedClickCommit;
	  }
	| {
			readonly grammatical: NonResolvedGrammatical;
			readonly persisted: UnresolvedClickCommit;
	  }
	| {
			readonly grammatical: ResolvedGrammatical;
			readonly readingResolution: ReadingResolution;
			readonly reading: Reading<"de">;
			readonly dictionaryPlan: DumdictPlan<"de">;
			readonly persisted: Extract<
				ResolvedClickCommit,
				{ status: "MembershipConflict" | "DictionaryConflict" }
			>;
	  }
	| {
			readonly grammatical: ResolvedGrammatical;
			readonly readingResolution: ReadingResolution;
			readonly reading: Reading<"de">;
			readonly dictionaryPlan: DumdictPlan<"de">;
			readonly reused: boolean;
			readonly persisted: Extract<
				ResolvedClickCommit,
				{ status: "Committed" | "Reused" }
			>;
	  };

export type OrchestrationPersistence = {
	persistSubmittedText(input: {
		readonly submissionKey: string;
		readonly sourceText: string;
		readonly sentences: readonly SubmittedSentence[];
	}): Promise<unknown>;
	getSentenceForResolution(input: {
		readonly sentenceId: string;
	}): Promise<PersistedSentence | null>;
	findRecordedClick(
		input: ResolveSegmentInput,
	): Promise<RecordedClick | null>;
	findAttestation(input: {
		readonly sentenceId: string;
		readonly clickedSegmentIndex: number;
	}): Promise<ReusableAttestation | null>;
	persistResolvedClick(
		input: ResolvedClickPersistence,
	): Promise<ResolvedClickCommit>;
	persistReusedResolvedClick(
		input: ResolveSegmentInput & {
			readonly attestationId: string;
		},
	): Promise<ReusedResolvedClickCommit>;
	persistUnresolvedClick(input: {
		readonly requestId: string;
		readonly visitorId: string;
		readonly sentenceId: string;
		readonly clickedSegmentIndex: number;
	}): Promise<UnresolvedClickCommit | LateResolvedClickCommit>;
};

export type SubmitTextInput = {
	readonly submissionKey: string;
	readonly sourceText: string;
};

export type ResolveSegmentInput = {
	readonly requestId: string;
	readonly visitorId: string;
	readonly sentenceId: string;
	readonly clickedSegmentIndex: number;
};

export type ResolutionProgressObserver = {
	grammarAvailable(input: {
		readonly grammatical: ResolvedGrammatical;
	}): Promise<void>;
	readingAvailable(input: { readonly reading: Reading<"de"> }): Promise<void>;
	committing(): Promise<void>;
};

export type TfDemoOrchestrator = ReturnType<typeof createTfDemoOrchestrator>;

/**
 * Composes package-owned behavior while leaving every durable write behind the
 * persistence port. The Convex action adapter is the production port; tests can
 * use a small in-memory port without changing the linguistic workflow.
 */
export function createTfDemoOrchestrator(options: {
	readonly dumgen: Dumgen;
	readonly dictionary: DumdictService<"de">;
	readonly persistence: OrchestrationPersistence;
	readonly observer?: ResolutionProgressObserver;
}) {
	async function submitText(input: SubmitTextInput) {
		assertNonEmpty(input.submissionKey, "submissionKey");
		assertNonEmpty(input.sourceText, "sourceText");

		const sourceSentences = splitInSentences(input.sourceText);
		const segmentation = await options.dumgen.segment(sourceSentences);
		if (!segmentation.ok) return segmentation;

		const sentences = segmentation.value.flatMap(
			(decision, position): SubmittedSentence[] =>
				decision.decision === "Accepted"
					? [
							{
								segmentedSentenceId: decision.sentence.id,
								position,
								language: decision.language,
								stitchedText: decision.sentence.segments
									.map(({ text }) => text)
									.join(""),
								segments: decision.sentence.segments,
							},
						]
					: [],
		);
		const persisted = await options.persistence.persistSubmittedText({
			submissionKey: input.submissionKey,
			sourceText: input.sourceText,
			sentences,
		});

		return { ...segmentation, persisted };
	}

	async function resolveSegment(
		input: ResolveSegmentInput,
	): Promise<ResolveSegmentResult> {
		assertNonEmpty(input.requestId, "requestId");
		assertNonEmpty(input.visitorId, "visitorId");
		assertNonEmpty(input.sentenceId, "sentenceId");
		if (!Number.isSafeInteger(input.clickedSegmentIndex)) {
			throw new TypeError("clickedSegmentIndex must be a safe integer.");
		}
		const recorded = await options.persistence.findRecordedClick(input);
		if (recorded) {
			return recorded.status === "Resolved"
				? {
						grammatical: recorded.occurrence.grammatical,
						reading: recorded.occurrence.reading,
						reused: true as const,
						deduplicated: true as const,
						persisted: recorded,
					}
				: {
						grammatical: {
							decision: "Unresolved" as const,
							language: "de" as const,
						},
						deduplicated: true as const,
						persisted: recorded,
					};
		}
		const reusable = await options.persistence.findAttestation({
			sentenceId: input.sentenceId,
			clickedSegmentIndex: input.clickedSegmentIndex,
		});
		if (reusable) {
			const persisted =
				await options.persistence.persistReusedResolvedClick({
					...input,
					attestationId: reusable.attestationId,
				});
			return {
				grammatical: reusable.grammatical,
				reading: reusable.reading,
				reused: true as const,
				persisted,
			};
		}

		const stored = await options.persistence.getSentenceForResolution({
			sentenceId: input.sentenceId,
		});
		if (!stored) throw new Error("The requested sentence does not exist.");
		const sentence = parseGermanSentence(stored);
		const grammatical = await options.dumgen.resolve.grammatical("de", {
			sentence,
			clickedSegmentIndex: input.clickedSegmentIndex,
		});

		if (grammatical.decision !== "Resolved") {
			const persisted =
				await options.persistence.persistUnresolvedClick(input);
			if (persisted.status === "Reused") {
				return {
					grammatical: persisted.occurrence.grammatical,
					reading: persisted.occurrence.reading,
					reused: true as const,
					persisted,
				};
			}
			return { grammatical, persisted };
		}
		await options.observer?.grammarAvailable({ grammatical });

		const lemma = parseGermanLemma(grammatical.attestation.surface.lemma);
		const lemmaKey = lemmaIdentityKey(lemma);
		const storedReadings = await options.dictionary.findStoredReadings({
			lemma,
		});
		const readingResolution = await options.dumgen.resolve.reading("de", {
			markedContext: grammatical.markedContext,
			lemma: lemma.canonicalForm,
			existingEmojiDescriptions: storedReadings.candidates.map(
				({ reading }) => reading.emojiDescription,
			),
		});
		const reading = parseGermanReading({
			lemma,
			emojiDescription: readingResolution.emojiDescription,
		});
		await options.observer?.readingAvailable({ reading });
		let dictionaryPlan: DumdictPlan<"de"> | undefined;
		const applyPlan = async (plan: DumdictPlan<"de">) => {
			if (dictionaryPlan) {
				throw new Error(
					"Dumdict produced more than one plan for one click.",
				);
			}
			dictionaryPlan = plan;
			return {
				status: "committed" as const,
				nextRevision: plan.baseRevision,
			};
		};
		const dictionaryPlanning =
			readingResolution.decision === "Reuse"
				? await options.dictionary.ensureOwnedSurface(
						{
							reading,
							ownedSurface: {
								surface: grammatical.attestation.surface,
								note: emptyNote(),
							},
						},
						{ applyPlan },
					)
				: await options.dictionary.addNewNote(
						{
							draft: {
								reading,
								note: emptyNote(),
								ownedSurfaces: [
									{
										surface:
											grammatical.attestation.surface,
										note: emptyNote(),
									},
								],
							},
						},
						{ applyPlan },
					);
		assertDumdictMutationApplied(dictionaryPlanning);
		if (!dictionaryPlan) {
			throw new Error(
				"Dumdict did not provide a plan for the resolved click.",
			);
		}

		const surfaceKey = surfaceIdentityKey(grammatical.attestation.surface);
		const readingKey = readingIdentityKey(reading);
		await options.observer?.committing();
		const persisted = await options.persistence.persistResolvedClick({
			...input,
			occurrence: {
				memberSegmentIndices:
					grammatical.interaction.memberSegmentIndices,
				attestation: grammatical.attestation,
				surfaceKey,
				lemmaKey,
			},
			reading,
			readingKey,
			dictionaryPlan,
		});
		if (
			persisted.status === "MembershipConflict" ||
			persisted.status === "DictionaryConflict"
		) {
			return {
				grammatical,
				readingResolution,
				reading,
				dictionaryPlan,
				persisted,
			};
		}

		return {
			grammatical: persisted.occurrence.grammatical,
			readingResolution,
			reading: persisted.occurrence.reading,
			dictionaryPlan,
			reused: persisted.status === "Reused",
			persisted,
		};
	}

	return Object.freeze({ submitText, resolveSegment });
}

export function applyValidatedReadingKnowledgeChange(input: {
	readonly reading: unknown;
	readonly knowledge?: unknown;
	readonly change: unknown;
}): {
	readonly change: KnowledgeChange;
	readonly knowledge: ReadingKnowledge;
} {
	const change = unwrapOperationalParse<KnowledgeChange>(
		parseAsKnowledgeChange(input.change),
	);
	const reading = parseGermanReading(input.reading);
	const record = {
		reading,
		...(input.knowledge === undefined
			? {}
			: {
					knowledge: input.knowledge as ReadingKnowledge<
						string,
						Lemma<"de">
					>,
				}),
		attestedTranslations: [],
		attestations: [],
		notes: "",
	} satisfies ReadingEntry<"de">;
	const envelope = {
		reading,
		change: change as ReadingKnowledgeChange<"de">["change"],
	} satisfies ReadingKnowledgeChange<"de">;
	const updated = applyDumdictKnowledgeChange(record, envelope);
	return { change, knowledge: updated.knowledge ?? {} };
}

export function surfaceIdentityKey(surface: Surface<"de">): string {
	return makeSurfaceId("de", surface);
}

export function readingIdentityKey(reading: Reading<"de">): string {
	return readingFingerprint(reading);
}

function parseGermanSentence(
	stored: PersistedSentence,
): SegmentedSentence<"de"> {
	if (stored.language !== "de") {
		throw new Error("Only German click resolution is enabled in tf-demo.");
	}
	const ordered = [...stored.segments].sort(
		(left, right) => left.index - right.index,
	);
	const segments = ordered.map(({ index, kind, text }, expectedIndex) => {
		if (index !== expectedIndex) {
			throw new Error(
				"Persisted Segment indices must be contiguous and zero-based.",
			);
		}
		if (
			!isSegmentKind(kind) ||
			typeof text !== "string" ||
			text.length === 0
		) {
			throw new Error("Persisted Segment data is invalid.");
		}
		return Object.freeze({ kind, text });
	});
	if (segments.map(({ text }) => text).join("") !== stored.stitchedText) {
		throw new Error(
			"Persisted Segments do not reconstruct the Stitched Text.",
		);
	}
	return Object.freeze({
		id: stored.segmentedSentenceId as SegmentedSentenceId,
		language: "de",
		segments: Object.freeze(segments),
	});
}

function isSegmentKind(value: string): value is Segment["kind"] {
	return (
		value === "ResolvableText" ||
		value === "OpaqueText" ||
		value === "Whitespace" ||
		value === "Punctuation"
	);
}

function emptyNote() {
	return {
		attestedTranslations: [] as string[],
		attestations: [] as string[],
		notes: "",
	};
}

function assertDumdictMutationApplied(result: {
	readonly status: string;
	readonly code?: string;
	readonly message?: string;
	readonly baseRevision?: StoreRevision;
}): void {
	if (result.status === "applied") return;
	throw new Error(
		`Dumdict mutation ${result.status}${result.code ? ` (${result.code})` : ""}${result.message ? `: ${result.message}` : ""}`,
	);
}

function assertNonEmpty(value: string, field: string): void {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new TypeError(`${field} must be a non-empty string.`);
	}
}
