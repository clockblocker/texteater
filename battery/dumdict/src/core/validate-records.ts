import { sameLemma, sameReading } from "dumling";
import type * as Dumling from "dumling/types";
import { directSemanticRelationValues } from "dumrel";

import type {
	LemmaRecord,
	PendingSemanticRelationRecord,
	ReadingEntry,
	SurfaceEntry,
} from "../domain-types";
import { makeSurfaceId } from "../dumling-id";
import {
	parseAsLemmaRecord,
	parseAsPendingSemanticRelationRecord,
	parseAsReadingEntry,
	parseAsSurfaceEntry,
	parseReadingForDumdictRuntime,
	parseReadingKnowledgeForDumdictRuntime,
	unwrapDumdictParse,
} from "../parsing/lightweight-parsers";
import { assertPendingSemanticRelationRecordIdentity } from "./pending";

/*
 * Each stored record a slice holds, checked as the storage contract requires.
 * Every check throws: a slice that fails one breaks the contract.
 */

export function assertNoDuplicates(values: string[], context: string) {
	if (new Set(values).size !== values.length)
		throw new Error(`${context} contains duplicates.`);
}

export function validateLemmaRecord<L extends Dumling.Language>(
	expected: L,
	record: LemmaRecord<L>,
) {
	unwrapDumdictParse(parseAsLemmaRecord(record, expected));
}

/**
 * Throws unless parsing kept a Reading's Emoji Description: Dumdict takes it
 * already normalized. A Foreign Reading has none (ADR 0045).
 */
export function assertEmojiDescriptionNormalized(
	reading: Dumling.Reading,
	parsed: Dumling.Reading,
) {
	if (
		"emojiDescription" in parsed &&
		"emojiDescription" in reading &&
		parsed.emojiDescription !== reading.emojiDescription
	)
		throw new Error("Reading emoji description must be normalized.");
}

export function validateReading<L extends Dumling.Language>(
	expected: L,
	reading: Dumling.Reading<L>,
) {
	assertEmojiDescriptionNormalized(
		reading,
		unwrapDumdictParse(parseReadingForDumdictRuntime(reading, expected)),
	);
}

export function validateReadingEntry<L extends Dumling.Language>(
	expected: L,
	entry: ReadingEntry<L>,
) {
	unwrapDumdictParse(parseAsReadingEntry(entry, expected));
	validateReading(expected, entry.reading);
	if (entry.knowledge !== undefined) {
		unwrapDumdictParse(
			parseReadingKnowledgeForDumdictRuntime(entry.knowledge),
		);
		const relations = entry.knowledge.semanticRelations;
		if (relations?.targetKind === "reading") {
			for (const target of relations.synonym ?? []) {
				validateReading(expected, target);
				if (sameReading(entry.reading, target))
					throw new Error(
						"Reading Knowledge contains a direct self relation.",
					);
			}
		} else {
			for (const relation of directSemanticRelationValues) {
				for (const target of relations?.[relation] ?? []) {
					validateLemmaRecord(expected, { lemma: target });
					if (sameLemma(entry.reading.lemma, target))
						throw new Error(
							"Reading Knowledge contains a direct same-Lemma relation.",
						);
				}
			}
		}
	}
}

export function validateSurfaceEntry<L extends Dumling.Language>(
	expected: L,
	entry: SurfaceEntry<L>,
) {
	unwrapDumdictParse(parseAsSurfaceEntry(entry, expected));
	// The parse checks id and owner on normalized forms and is discarded;
	// these check the raw entry that planning reads.
	if (entry.id !== makeSurfaceId(expected, entry.surface))
		throw new Error("surface entry id does not match its derived id.");
	if (!sameLemma(entry.ownerLemma, entry.surface.lemma))
		throw new Error(
			"surface owner Lemma does not match the realized Lemma.",
		);
}

export function validatePendingRecord<L extends Dumling.Language>(
	expected: L,
	record: PendingSemanticRelationRecord<L>,
) {
	const parsedRecord = unwrapDumdictParse(
		parseAsPendingSemanticRelationRecord(record, expected),
	);
	validateReading(expected, parsedRecord.sourceReading);
	assertPendingSemanticRelationRecordIdentity(parsedRecord);
}

export function validateRevision(value: unknown) {
	if (typeof value !== "string" || value.length === 0)
		throw new Error("Reading Entry context has an invalid revision.");
}
