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
const verbFeatures = { hasSepPrefix: null };

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

export function readingEntry(
	reading: Dumling.Reading<"de">,
	content: Partial<Omit<ReadingEntry<"de">, "reading">> = {},
): ReadingEntry<"de"> {
	return {
		reading,
		attestedTranslations: ["go"],
		attestationLinks: [],
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
export const durchlaufenPending = {
	relation: "synonym",
	target: {
		language: "de",
		canonicalForm: "durchlaufen",
		family: "Lexeme",
		kind: "VERB",
	},
} as const;

export const durchlaufen = verbLemma("durchlaufen");
export const durchlaufenReading = readingOf(durchlaufen, "🔁");

/**
 * A second `durchlaufen` Lemma on the same route and Canonical Form, the
 * separable one ('seep through') beside 'pass through', so a `durchlaufen`
 * Shadow matches two Lemmas once both are stored.
 */
export const separableDurchlaufen: Verb = {
	...durchlaufen,
	coreFeatures: { hasSepPrefix: "durch" },
};

export const gehenPendingRecord: PendingSemanticRelationRecord<"de"> =
	createPendingSemanticRelationRecord(gehenReading, durchlaufenPending);

/** The same pending synonym, from `laufen`. */
export const laufenPendingRecord: PendingSemanticRelationRecord<"de"> =
	createPendingSemanticRelationRecord(laufenReading, durchlaufenPending);

/**
 * A pending synonym from `gehen` whose Shadow differs from the `durchlaufen`
 * Lemma only by kind, so creating that Lemma must not match it.
 */
export const gehenNounPendingRecord: PendingSemanticRelationRecord<"de"> =
	createPendingSemanticRelationRecord(gehenReading, {
		relation: "synonym",
		target: {
			...durchlaufenPending.target,
			canonicalForm: "Durchlaufen",
			kind: "NOUN",
		},
	});

/** A pending relation the suite never stores. */
export const gehenUnstoredPendingRecord: PendingSemanticRelationRecord<"de"> =
	createPendingSemanticRelationRecord(gehenReading, {
		...durchlaufenPending,
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

type Noun = Dumling.Lemma<"de", "Lexeme", "NOUN">;

function nounLemma(
	canonicalForm: string,
	gender: "Masc" | "Fem" | "Neut",
): Noun {
	return {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm,
		coreFeatures: { gender },
	};
}

function nounReading(
	lemma: Noun,
	emojiDescription: string,
): Dumling.Reading<"de", "Lexeme", "NOUN"> {
	return { unitKind: "Reading", lemma, emojiDescription };
}

/** der See, the lake, and die See, the sea: one Shadow matches both. */
export const derSee = nounLemma("See", "Masc");
export const dieSee = nounLemma("See", "Fem");
export const derSeeReading = nounReading(derSee, "💧");
export const dieSeeReading = nounReading(dieSee, "🚢");

/** The Shadow a generated relation names when it means some `See`. */
export const seeShadow = {
	language: "de",
	canonicalForm: "See",
	family: "Lexeme",
	kind: "NOUN",
} as const;

export const meer = nounLemma("Meer", "Neut");
export const ozean = nounLemma("Ozean", "Masc");
export const teich = nounLemma("Teich", "Masc");
export const meerReading = nounReading(meer, "🌊");
export const ozeanReading = nounReading(ozean, "🌍");
export const teichReading = nounReading(teich, "🦆");

/** `Meer` and `Ozean` each name some `See` as a synonym. */
export const meerSeePendingRecord: PendingSemanticRelationRecord<"de"> =
	createPendingSemanticRelationRecord(meerReading, {
		relation: "synonym",
		target: seeShadow,
	});
export const ozeanSeePendingRecord: PendingSemanticRelationRecord<"de"> =
	createPendingSemanticRelationRecord(ozeanReading, {
		relation: "synonym",
		target: seeShadow,
	});
