import {
	lemmaIdentityKey,
	readingIdentityKey,
	sameLemma,
	sameReading,
} from "dumling";
import type * as Dumling from "dumling/types";
import { parseLemmaParadigm } from "dumrel";

import type { AttestationLink, LemmaRecord } from "../domain-types";
import type { LemmaSlice } from "../dto";
import {
	parseAsReadingEntry,
	unwrapDumdictParse,
} from "../parsing/lightweight-parsers";
import type {
	OccurrenceSlice,
	OccurrenceSliceRequest,
	RekeySurfacesSlice,
	RekeySurfacesSliceRequest,
} from "../storage";
import {
	assertNoDuplicates,
	validateLemmaRecord,
	validatePendingRecord,
	validateReading,
	validateReadingEntry,
	validateRevision,
	validateSurfaceEntry,
} from "./validate-records";

/** A Lemma's Paradigm licenses only its listed Readings, as Dumrel checks it. */
function validateParadigmReadings<L extends Dumling.Language>(
	record: LemmaRecord<L>,
	readings: readonly Dumling.Reading<L>[],
) {
	if (record.paradigm === undefined) return;
	const parsed = parseLemmaParadigm({
		lemma: record.lemma,
		paradigm: record.paradigm,
		readings,
	});
	if (!parsed.success)
		throw new Error(
			`stored Lemma Paradigm does not fit the Lemma's Readings: ${parsed.error.message}`,
		);
}

/**
 * Every stored Reading of one Lemma, each once, which the Lemma's stored
 * Paradigm, when the slice holds it, licenses.
 */
export function validateLemmaReadings<L extends Dumling.Language>(
	expected: L,
	lemma: Dumling.Lemma<L>,
	readings: readonly Dumling.Reading<L>[],
	record: LemmaRecord<L> | undefined,
) {
	for (const reading of readings) {
		validateReading(expected, reading);
		if (!sameLemma(reading.lemma, lemma))
			throw new Error("Lemma Reading belongs to another Lemma.");
	}
	assertNoDuplicates(readings.map(readingIdentityKey), "Lemma Readings");
	if (record) validateParadigmReadings(record, readings);
}

/** Stored Attestation Links, each with a requested ref. */
export function validateLinksWithRefs<L extends Dumling.Language>(
	expected: L,
	links: readonly AttestationLink<L>[],
	refs: readonly string[],
) {
	for (const link of links) {
		unwrapDumdictParse(
			parseAsReadingEntry(
				{
					reading: link.reading,
					attestedTranslations: [],
					attestationLinks: [link],
					notes: "",
				},
				expected,
			),
		);
		if (!refs.includes(link.ref))
			throw new Error(
				"Attestation Link was not requested by this workflow.",
			);
	}
}

/**
 * One whole Lemma: its records parse, each belongs to it once, its Paradigm
 * licenses only its Readings, and each link names a Surface it owns or none.
 */
export function validateLemmaSlice<L extends Dumling.Language>(
	expected: L,
	slice: LemmaSlice<L>,
) {
	const { lemma } = slice.lemmaRecord;
	validateLemmaRecord(expected, slice.lemmaRecord);
	for (const entry of slice.readingEntries)
		validateReadingEntry(expected, entry);
	for (const entry of slice.ownedSurfaceEntries) {
		validateSurfaceEntry(expected, entry);
		if (!sameLemma(entry.ownerLemma, lemma))
			throw new Error("Lemma Slice Surface belongs to another Lemma.");
	}
	assertNoDuplicates(
		slice.ownedSurfaceEntries.map(({ id }) => id),
		"Lemma Slice Surfaces",
	);
	validateLemmaReadings(
		expected,
		lemma,
		slice.readingEntries.map(({ reading }) => reading),
		slice.lemmaRecord,
	);
	const surfaceIds = new Set<string>(
		slice.ownedSurfaceEntries.map(({ id }) => id),
	);
	for (const entry of slice.readingEntries)
		for (const { surfaceId } of entry.attestationLinks)
			if (surfaceId !== null && !surfaceIds.has(surfaceId))
				throw new Error(
					"Attestation Link names a Surface its Lemma does not own.",
				);
	for (const record of slice.pendingRelations) {
		validatePendingRecord(expected, record);
		if (
			!slice.readingEntries.some((entry) =>
				sameReading(entry.reading, record.sourceReading),
			)
		)
			throw new Error(
				"Lemma Slice pending relation has a source outside the Lemma.",
			);
	}
}

/** Each Lemma once and whole, each holding a link with a requested ref. */
export function validateOccurrenceSlice<L extends Dumling.Language>(
	expected: L,
	slice: OccurrenceSlice<L>,
	request: OccurrenceSliceRequest,
) {
	validateRevision(slice.revision);
	assertNoDuplicates(
		slice.lemmas.map(({ lemmaRecord }) =>
			lemmaIdentityKey(lemmaRecord.lemma),
		),
		"occurrence Lemmas",
	);
	for (const lemma of slice.lemmas) {
		validateLemmaSlice(expected, lemma);
		if (
			!lemma.readingEntries.some((entry) =>
				entry.attestationLinks.some(({ ref }) =>
					request.refs.includes(ref),
				),
			)
		)
			throw new Error(
				"occurrence Lemma was not requested by this workflow.",
			);
	}
}

function validateStringList(value: unknown, context: string) {
	if (!Array.isArray(value) || value.some((item) => typeof item !== "string"))
		throw new Error(`${context} is not a list of strings.`);
}

/**
 * Each requested Surface's id, owner and note, once, and each Reading whose
 * links name one of them.
 */
export function validateRekeySurfacesSlice<L extends Dumling.Language>(
	expected: L,
	slice: RekeySurfacesSlice<L>,
	request: RekeySurfacesSliceRequest<L>,
) {
	validateRevision(slice.revision);
	const requested = new Set<string>(request.surfaceIds);
	for (const entry of slice.surfaces) {
		if (!requested.has(entry.id))
			throw new Error(
				"stored Surface was not requested by this workflow.",
			);
		validateLemmaRecord(expected, { lemma: entry.ownerLemma });
		validateStringList(entry.attestedTranslations, "Surface translations");
		validateStringList(entry.attestations, "Surface attestations");
		if (typeof entry.notes !== "string")
			throw new Error("Surface notes are not a string.");
	}
	assertNoDuplicates(
		slice.surfaces.map(({ id }) => id),
		"re-keyed Surfaces",
	);
	for (const entry of slice.readings) {
		validateReadingEntry(expected, entry);
		if (
			!entry.attestationLinks.some(
				({ surfaceId }) =>
					surfaceId !== null && requested.has(surfaceId),
			)
		)
			throw new Error(
				"re-keyed Reading was not requested by this workflow.",
			);
	}
	assertNoDuplicates(
		slice.readings.map(({ reading }) => readingIdentityKey(reading)),
		"re-keyed Readings",
	);
}
