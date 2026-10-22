import { readingIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";

import { createPendingSemanticRelationRecord } from "../../core/pending";
import type {
	AttestationLink,
	PendingSemanticRelationRecord,
	SurfaceEntry,
} from "../../domain-types";
import { makeSurfaceId } from "../../dumling-id";

/**
 * `Bank`, whose bench 🪑 takes `Bänke` and whose bank 🏦 takes `Banken`
 * (system ADR 0048), with the Surfaces and links the occurrence cases record.
 */
type Noun = Dumling.Lemma<"de", "Lexeme", "NOUN">;

export const bank: Noun = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Bank",
	coreFeatures: { gender: "Fem" },
};

const readingOf = (emojiDescription: string) =>
	({ unitKind: "Reading", lemma: bank, emojiDescription }) as const;

export const bench = readingOf("🪑");
export const moneyBank = readingOf("🏦");

function surfaceOf(
	normalizedSurface: string,
	number: "Sing" | "Plur",
): Dumling.Surface<"de", "Lexeme", "NOUN"> {
	return {
		unitKind: "Surface",
		language: "de",
		lemma: bank,
		normalizedSurface,
		spelling: { kind: "Canonical" },
		surfaceFeatures: null,
		inflectionalFeatures: { case: "Nom", gender: null, number },
	};
}

export const baenke = surfaceOf("Bänke", "Plur");
export const banken = surfaceOf("Banken", "Plur");
export const bankSingular = surfaceOf("Bank", "Sing");
/** `Bänke` as a Dumling change might re-describe it, under another id. */
export const respelledBaenke: Dumling.Surface<"de", "Lexeme", "NOUN"> = {
	...baenke,
	spelling: { kind: "Variant", variantTags: ["Historical"] },
};

/** A Surface Entry of `Bank`, empty unless `note` gives it user text. */
export function surfaceEntry(
	surface: Dumling.Surface<"de">,
	note: Partial<
		Pick<SurfaceEntry<"de">, "attestedTranslations" | "notes">
	> = {},
): SurfaceEntry<"de"> {
	return {
		id: makeSurfaceId("de", surface),
		surface,
		ownerLemma: bank,
		attestedTranslations: [],
		attestations: [],
		notes: "",
		...note,
	};
}

export function linkOf(
	ref: string,
	reading: Dumling.Reading<"de">,
	surface: Dumling.Surface<"de">,
): AttestationLink<"de"> {
	return { ref, surfaceId: makeSurfaceId("de", surface), reading };
}

/** The Bank Paradigm: 🪑 licenses `Bänke`, 🏦 `Banken`. */
export const bankParadigm: Dumrel.LemmaParadigm = {
	dimensions: {
		plural: {
			variants: [
				{ id: "banken", value: "Banken", provenance: "Produced" },
				{ id: "bänke", value: "Bänke", provenance: "Produced" },
			],
			licences: {
				[readingIdentityKey(bench)]: ["bänke"],
				[readingIdentityKey(moneyBank)]: ["banken"],
			},
		},
	},
};

/** The Paradigm once 🏦 is gone: only 🪑's `Bänke`. */
export const benchParadigm: Dumrel.LemmaParadigm = {
	dimensions: {
		plural: {
			variants: [{ id: "bänke", value: "Bänke", provenance: "Produced" }],
			licences: { [readingIdentityKey(bench)]: ["bänke"] },
		},
	},
};

/** A synonym 🏦 names before its target is stored. */
export const moneyBankPending: PendingSemanticRelationRecord<"de"> =
	createPendingSemanticRelationRecord(moneyBank, {
		relation: "synonym",
		target: {
			language: "de",
			canonicalForm: "Geldinstitut",
			family: "Lexeme",
			kind: "NOUN",
		},
	});

function claimingNoun(
	canonicalForm: string,
	gender: "Fem" | "Neut",
	emojiDescription: string,
): Dumling.Reading<"de", "Lexeme", "NOUN"> {
	return {
		unitKind: "Reading",
		lemma: {
			unitKind: "Lemma",
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm,
			coreFeatures: { gender },
		},
		emojiDescription,
	};
}

/** `Sparkasse` names `Bank` as its hypernym, a Lemma-mode claim. */
export const sparkasse = claimingNoun("Sparkasse", "Fem", "🐷");
/** `Kreditinstitut` names a sense of `Bank` as its synonym, a Reading-mode claim. */
export const kreditinstitut = claimingNoun("Kreditinstitut", "Neut", "💳");
