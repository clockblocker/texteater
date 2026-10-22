import { isRecord } from "common-utils";
import type * as Dumling from "dumling/types";
import { migratePrincipalParts } from "dumrel";

import type {
	AttestationLink,
	ReadingEntry,
	SurfaceEntry,
} from "../domain-types";
import type { SerializedDictionaryNote } from "../dto";
import {
	type DumdictParse,
	ParsingError,
	parseAsLemmaRecord,
	parseAsPendingSemanticRelationRecord,
	parseAsReadingEntry,
	parseAsSurfaceEntry,
	parseReadingForDumdictRuntime,
} from "../parsing/lightweight-parsers";
import {
	reconcileAttestationLinks,
	sameAttestationLink,
} from "./occurrence/links";
import { storedParadigm } from "./occurrence/paradigm";
import { validateLemmaSlice } from "./validate-occurrence-slice";

type Path = (string | number)[];

const issue = (path: Path, message: string) =>
	new ParsingError([{ code: "custom", path, message }]);

function prefixed(error: ParsingError, path: Path): ParsingError {
	return new ParsingError(
		error.issues.map((entry) => ({
			...entry,
			path: [...path, ...entry.path],
		})),
	);
}

function list(value: unknown, path: Path): unknown[] | ParsingError {
	return Array.isArray(value) ? value : issue(path, "Expected a list");
}

function strings(value: unknown, path: Path): string[] | ParsingError {
	return Array.isArray(value) &&
		value.every((item) => typeof item === "string")
		? [...value]
		: issue(path, "Expected a list of strings");
}

/**
 * The links of a version 1 Reading's attestation strings, each ref once. A
 * ref one owned Surface's own attestation strings list names that Surface;
 * any other has none.
 */
function linksOf<L extends Dumling.Language>(
	reading: Dumling.Reading<L>,
	refs: readonly string[],
	surfaces: readonly SurfaceEntry<L>[],
): AttestationLink<L>[] {
	return [...new Set(refs)].map((ref) => {
		const recorded = surfaces.filter(({ attestations }) =>
			attestations.includes(ref),
		);
		return {
			ref,
			surfaceId: recorded.length === 1 ? (recorded[0]?.id ?? null) : null,
			reading,
		};
	});
}

/**
 * Migrates a version 1 dictionary note to version 2, deterministically
 * (system ADR 0048, ADR 0049):
 *
 * - the principal parts its Readings stored as Reading Knowledge become its
 *   Lemma Paradigm through Dumrel's `migratePrincipalParts`: one variant per
 *   pooled form, an explicit Licence for each Reading that stored the
 *   dimension, Unstated for one that stored none, and a conjugation class
 *   without forms dropped;
 * - each Reading's attestation strings become Attestation Links, each ref
 *   once. A link names the Surface whose own attestation strings alone list
 *   its ref, and no Surface otherwise. A ref two Readings list stays with
 *   the code-unit-smaller `readingIdentityKey`, as
 *   `reconcileAttestationLinks` merges links.
 *
 * Surface Entries and pending records carry over unchanged. The note comes
 * back parsed, or the first reason it is no version 1 note, with no partial
 * value.
 */
export function migrateV1toV2<const L extends Dumling.Language>(
	note: unknown,
	language: L,
): DumdictParse<SerializedDictionaryNote<L>> {
	if (!isRecord(note) || note.schemaVersion !== 1)
		return issue(["schemaVersion"], "Expected a version 1 dictionary note");
	if (!isRecord(note.lemmaRecord))
		return issue(["lemmaRecord"], "Expected a Lemma Record");
	const record = parseAsLemmaRecord(note.lemmaRecord, language);
	if (record instanceof ParsingError)
		return prefixed(record, ["lemmaRecord"]);
	const surfaces = parseEach(
		note.ownedSurfaceEntries,
		"ownedSurfaceEntries",
		(input) => parseAsSurfaceEntry(input, language),
	);
	if (surfaces instanceof ParsingError) return surfaces;
	const pendingRelations = parseEach(
		note.pendingRelations,
		"pendingRelations",
		(input) => parseAsPendingSemanticRelationRecord(input, language),
	);
	if (pendingRelations instanceof ParsingError) return pendingRelations;
	const readings = parseEach(note.readingEntries, "readingEntries", (input) =>
		readV1Reading(input, language),
	);
	if (readings instanceof ParsingError) return readings;
	const migrated = migratePrincipalParts({
		lemma: record.lemma,
		readings: readings.map(({ reading, knowledge }) => ({
			reading,
			knowledge,
		})),
	});
	if (!migrated.success) return prefixed(migrated.error, ["readingEntries"]);
	const links = readings.map(({ reading, refs }) =>
		linksOf(reading, refs, surfaces),
	);
	const { kept } = reconcileAttestationLinks(links.flat());
	const readingEntries: ReadingEntry<L>[] = [];
	for (const [index, { reading, rest }] of readings.entries()) {
		const knowledge = migrated.value.readings[index]?.knowledge ?? {};
		const entry = parseAsReadingEntry(
			{
				...rest,
				reading,
				...(Object.keys(knowledge).length > 0 && { knowledge }),
				attestationLinks: (links[index] ?? []).filter((link) =>
					kept.some((other) => sameAttestationLink(other, link)),
				),
			},
			language,
		);
		if (entry instanceof ParsingError)
			return prefixed(entry, ["readingEntries", index]);
		readingEntries.push(entry);
	}
	const paradigm = storedParadigm(migrated.value.paradigm);
	return checked(language, {
		schemaVersion: 2,
		lemmaRecord: { lemma: record.lemma, ...(paradigm && { paradigm }) },
		readingEntries,
		ownedSurfaceEntries: surfaces,
		pendingRelations,
	});
}

/** Each item parsed, or the first failure, its path under `key`. */
function parseEach<Output>(
	input: unknown,
	key: string,
	parse: (item: unknown) => Output | ParsingError,
): Output[] | ParsingError {
	const items = list(input, [key]);
	if (items instanceof ParsingError) return items;
	const parsed: Output[] = [];
	for (const [index, item] of items.entries()) {
		const value = parse(item);
		if (value instanceof ParsingError) return prefixed(value, [key, index]);
		parsed.push(value);
	}
	return parsed;
}

/** A version 1 Reading Entry's parsed Reading, raw Knowledge, refs and rest. */
function readV1Reading<L extends Dumling.Language>(
	input: unknown,
	language: L,
) {
	if (!isRecord(input)) return issue([], "Expected a Reading Entry");
	const { reading, knowledge, attestations, ...rest } = input;
	const parsed = parseReadingForDumdictRuntime(reading, language);
	if (parsed instanceof ParsingError) return prefixed(parsed, ["reading"]);
	const refs = strings(attestations, ["attestations"]);
	if (refs instanceof ParsingError) return refs;
	return { reading: parsed, knowledge: knowledge ?? {}, refs, rest };
}

/** The migrated note, checked whole as a Lemma Slice. */
function checked<L extends Dumling.Language>(
	language: L,
	note: SerializedDictionaryNote<L>,
): DumdictParse<SerializedDictionaryNote<L>> {
	try {
		validateLemmaSlice(language, note);
	} catch (error) {
		return error instanceof ParsingError
			? error
			: issue([], error instanceof Error ? error.message : String(error));
	}
	return note;
}
