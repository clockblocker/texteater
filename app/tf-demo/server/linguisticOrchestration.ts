import {
	applyDumdictKnowledgeChange,
	type DumdictService,
	dumling,
	type Lemma,
	type LemmaRecord,
	makeSurfaceId,
	type Reading,
	type ReadingEntry,
	type ReadingKnowledgeChange,
	type StoreRevision,
	type Surface,
} from "dumdict";
import type {
	Dumgen,
	GrammaticalResult,
	Segment,
	SegmentedSentence,
	SegmentedSentenceId,
} from "dumgen";
import {
	type KnowledgeChange,
	knowledgeChangeSchema,
	type LemmaKnowledge,
	type ReadingKnowledge,
	readingReferenceSchema,
} from "dumrel";

import {
	lemmaKeyFor,
	readingKeyFor,
	resolutionKeyFor,
} from "../convex/model/linguisticKeys";

export type PersistedSentence = {
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
	readonly resolution: {
		readonly resolutionKey: string;
		readonly language: "de";
		readonly markedContext: string;
		readonly memberSegmentIndices: readonly number[];
		readonly attestation: unknown;
		readonly surfaceKey: string;
		readonly lemmaKey: string;
	};
	readonly readingKey: string;
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
	persistResolvedClick(input: ResolvedClickPersistence): Promise<unknown>;
	persistUnresolvedClick?(input: {
		readonly requestId: string;
		readonly visitorId: string;
		readonly sentenceId: string;
		readonly clickedSegmentIndex: number;
	}): Promise<unknown>;
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
}) {
	async function submitText(input: SubmitTextInput) {
		assertNonEmpty(input.submissionKey, "submissionKey");
		assertNonEmpty(input.sourceText, "sourceText");

		// Dumgen intentionally accepts caller-delimited Source Sentences, not an
		// arbitrary document. The first slice therefore submits one source sentence.
		const segmentation = await options.dumgen.segment([input.sourceText]);
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

	async function resolveSegment(input: ResolveSegmentInput) {
		assertNonEmpty(input.requestId, "requestId");
		assertNonEmpty(input.visitorId, "visitorId");
		assertNonEmpty(input.sentenceId, "sentenceId");
		if (!Number.isSafeInteger(input.clickedSegmentIndex)) {
			throw new TypeError("clickedSegmentIndex must be a safe integer.");
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
			await options.persistence.persistUnresolvedClick?.(input);
			return { grammatical };
		}

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
		const reading = readingReferenceSchema.parse({
			lemma,
			emojiDescription: readingResolution.emojiDescription,
		}) as Reading<"de">;
		const encounterText = sentence.segments
			.map(({ text }) => text)
			.join("");
		const encounterAlreadyStored = storedReadings.candidates.some(
			({ note, reading: candidate }) =>
				candidate.emojiDescription === reading.emojiDescription &&
				note.attestations.includes(encounterText),
		);

		const dictionaryMutation =
			readingResolution.decision === "Reuse" && encounterAlreadyStored
				? {
						status: "alreadyApplied" as const,
						summary: {
							message:
								"Dumdict already stores this exact string attestation.",
						},
					}
				: readingResolution.decision === "Reuse"
					? await options.dictionary.addAttestation({
							reading,
							attestation: encounterText,
						})
					: await options.dictionary.addNewNote({
							draft: {
								reading,
								note: emptyNoteWithAttestation(encounterText),
								ownedSurfaces: [
									{
										surface:
											grammatical.attestation.surface,
										note: emptyNoteWithAttestation(
											encounterText,
										),
									},
								],
							},
						});
		if (dictionaryMutation.status !== "alreadyApplied") {
			assertDumdictMutationApplied(dictionaryMutation);
		}

		const surfaceKey = surfaceIdentityKey(grammatical.attestation.surface);
		const readingKey = readingIdentityKey(reading);
		const resolutionKey = resolutionIdentityKey(
			stored.segmentedSentenceId,
			grammatical,
		);
		const persisted = await options.persistence.persistResolvedClick({
			...input,
			resolution: {
				resolutionKey,
				language: "de",
				markedContext: grammatical.markedContext,
				memberSegmentIndices:
					grammatical.interaction.memberSegmentIndices,
				attestation: grammatical.attestation,
				surfaceKey,
				lemmaKey,
			},
			readingKey,
		});

		return {
			grammatical,
			readingResolution,
			reading,
			dictionaryMutation,
			persisted,
		};
	}

	return Object.freeze({ submitText, resolveSegment });
}

export function applyValidatedKnowledgeContribution(input: {
	readonly owner:
		| {
				readonly kind: "Lemma";
				readonly lemma: unknown;
				readonly knowledge?: unknown;
		  }
		| {
				readonly kind: "Reading";
				readonly reading: unknown;
				readonly knowledge?: unknown;
		  };
	readonly change: unknown;
}): {
	readonly change: KnowledgeChange;
	readonly knowledge: LemmaKnowledge | ReadingKnowledge;
} {
	const change = knowledgeChangeSchema.parse(input.change);
	if (input.owner.kind === "Lemma") {
		const lemma = parseGermanLemma(input.owner.lemma);
		const updated = applyDumdictKnowledgeChange(
			{
				lemma,
				...(input.owner.knowledge === undefined
					? {}
					: { knowledge: input.owner.knowledge as LemmaKnowledge }),
			} satisfies LemmaRecord<"de">,
			{
				owner: { kind: "Lemma", lemma },
				change: change as Extract<
					KnowledgeChange,
					{ aspect: "transcriptions" }
				>,
			},
		);
		return { change, knowledge: updated.knowledge ?? {} };
	}

	const reading = readingReferenceSchema.parse(
		input.owner.reading,
	) as Reading<"de">;
	const record = {
		reading,
		...(input.owner.knowledge === undefined
			? {}
			: {
					knowledge: input.owner.knowledge as ReadingKnowledge<
						string,
						Reading<"de">
					>,
				}),
		attestedTranslations: [],
		attestations: [],
		notes: "",
	} satisfies ReadingEntry<"de">;
	const envelope = {
		owner: { kind: "Reading", reading },
		change: change as ReadingKnowledgeChange<"de">["change"],
	} satisfies ReadingKnowledgeChange<"de">;
	const updated = applyDumdictKnowledgeChange(record, envelope);
	return { change, knowledge: updated.knowledge ?? {} };
}

export function lemmaIdentityKey(lemma: Lemma<"de">): string {
	return lemmaKeyFor(lemma);
}

export function surfaceIdentityKey(surface: Surface<"de">): string {
	return makeSurfaceId("de", surface);
}

export function readingIdentityKey(reading: Reading<"de">): string {
	return readingKeyFor(reading);
}

function resolutionIdentityKey(
	segmentedSentenceId: string,
	grammatical: Extract<GrammaticalResult<"de">, { decision: "Resolved" }>,
): string {
	return resolutionKeyFor(
		segmentedSentenceId,
		grammatical.interaction.memberSegmentIndices,
	);
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

function parseGermanLemma(value: unknown): Lemma<"de"> {
	const parsed = dumling.de.parse.lemma(value);
	if (!parsed.success) {
		throw new Error(`Invalid German Lemma: ${parsed.error.message}`);
	}
	return parsed.data;
}

function isSegmentKind(value: string): value is Segment["kind"] {
	return (
		value === "ResolvableText" ||
		value === "OpaqueText" ||
		value === "Whitespace" ||
		value === "Punctuation"
	);
}

function emptyNoteWithAttestation(attestation: string) {
	return {
		attestedTranslations: [] as string[],
		attestations: [attestation],
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
