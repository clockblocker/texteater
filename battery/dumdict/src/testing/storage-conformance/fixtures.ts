import type * as Dumling from "dumling/types";

import { createPendingSemanticRelationRecord } from "../../core/pending";
import type {
	ChangePrecondition,
	PendingSemanticRelationRecord,
	PlannedChangeOp,
	ReadingEntry,
	ReadingKnowledgeChange,
	SurfaceEntry,
} from "../../domain-types";
import { makeSurfaceId } from "../../dumling-id";

/**
 * German values the conformance suite drives through a store. They avoid
 * articles and contractions, so a host that completes reviewed grammatical
 * members adds nothing beside them.
 */
const verbFeatures = { lexicallyReflexive: null, hasSepPrefix: null };

type Verb = Dumling.Lemma<"de", "Lexeme", "VERB">;

function verbLemma(canonicalForm: string): Verb {
	return {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "VERB",
		canonicalForm,
		coreFeatures: { ...verbFeatures },
	};
}

function readingOf(
	lemma: Verb,
	emojiDescription: string,
): Dumling.Reading<"de", "Lexeme", "VERB"> {
	return { unitKind: "Reading", lemma, emojiDescription };
}

export const gehen = verbLemma("gehen");
export const laufen = verbLemma("laufen");
export const springen = verbLemma("springen");
export const gehenReading = readingOf(gehen, "🚶");
export const laufenReading = readingOf(laufen, "🏃");
export const springenReading = readingOf(springen, "🦘");

export function readingEntry(
	reading: Dumling.Reading<"de">,
	content: Partial<Omit<ReadingEntry<"de">, "reading">> = {},
): ReadingEntry<"de"> {
	return {
		reading,
		attestedTranslations: ["go"],
		attestations: [],
		notes: "conformance",
		...content,
	};
}

export const gehenSurface: Dumling.Surface<"de", "Lexeme", "VERB"> = {
	unitKind: "Surface",
	language: "de",
	lemma: gehen,
	normalizedSurface: "gehen",
	spelling: { kind: "Canonical" },
	surfaceFeatures: null,
	inflectionalFeatures: null,
};

export const gehenSurfaceEntry: SurfaceEntry<"de"> = {
	id: makeSurfaceId("de", gehenSurface),
	surface: gehenSurface,
	ownerLemma: gehen,
	attestedTranslations: ["go"],
	attestations: [],
	notes: "conformance",
};

/** A synonym of `gehen` the dictionary does not hold yet. */
export const schreitenPending = {
	relation: "synonym",
	target: {
		language: "de",
		canonicalForm: "schreiten",
		family: "Lexeme",
		kind: "VERB",
	},
} as const;

export const schreiten = verbLemma("schreiten");

export const gehenPendingRecord: PendingSemanticRelationRecord<"de"> =
	createPendingSemanticRelationRecord(gehenReading, schreitenPending);

/** A pending relation the suite never stores. */
export const gehenUnstoredPendingRecord: PendingSemanticRelationRecord<"de"> =
	createPendingSemanticRelationRecord(gehenReading, {
		...schreitenPending,
		relation: "antonym",
	});

export const createLemma = (
	lemma: Dumling.Lemma<"de">,
	preconditions: ChangePrecondition<"de">[] = [
		{ kind: "lemmaMissing", lemma },
	],
): PlannedChangeOp<"de"> => ({
	type: "createLemma",
	record: { lemma },
	preconditions,
});

export const createReading = (
	entry: ReadingEntry<"de">,
	preconditions: ChangePrecondition<"de">[] = [
		{ kind: "lemmaExists", lemma: entry.reading.lemma },
		{ kind: "readingMissing", reading: entry.reading },
	],
): PlannedChangeOp<"de"> => ({
	type: "createReading",
	entry,
	preconditions,
});

export const createOwnedSurface = (
	entry: SurfaceEntry<"de">,
	preconditions: ChangePrecondition<"de">[] = [
		{ kind: "lemmaExists", lemma: entry.ownerLemma },
		{ kind: "surfaceMissing", surfaceId: entry.id },
	],
): PlannedChangeOp<"de"> => ({
	type: "createOwnedSurface",
	entry,
	preconditions,
});

export const patchKnowledge = (
	reading: Dumling.Reading<"de">,
	changes: ReadingKnowledgeChange<"de">["change"][],
	preconditions: ChangePrecondition<"de">[] = [
		{ kind: "readingExists", reading },
	],
): PlannedChangeOp<"de"> => ({
	type: "patchReading",
	reading,
	ops: changes.map((change) => ({
		kind: "applyKnowledgeChange",
		envelope: { reading, change },
	})),
	preconditions,
});

export const createPending = (
	record: PendingSemanticRelationRecord<"de">,
	preconditions: ChangePrecondition<"de">[] = [
		{ kind: "readingExists", reading: record.sourceReading },
		{ kind: "pendingRelationMissing", record },
	],
): PlannedChangeOp<"de"> => ({
	type: "createPendingSemanticRelation",
	record,
	preconditions,
});

export const deletePending = (
	record: PendingSemanticRelationRecord<"de">,
	preconditions: ChangePrecondition<"de">[] = [
		{ kind: "pendingRelationExists", record },
	],
): PlannedChangeOp<"de"> => ({
	type: "deletePendingSemanticRelation",
	record,
	preconditions,
});
