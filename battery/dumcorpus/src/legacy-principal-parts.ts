/**
 * The size past which `bun run check:file-tokens` refuses to stage a file:
 * 5,000 tokens of 4 bytes.
 */
const fileTokenLimitBytes = 20_000;

/** The principal-part aspects Reading Knowledge held before ADR 0048. */
const legacyAspects = [
	"plural",
	"conjugationClass",
	"preterite",
	"presentSingular",
	"pastParticiple",
	"subjunctivePast",
] as const;
/** The aspects that move to a dimension of the same name. */
const sameName = [
	"plural",
	"preterite",
	"pastParticiple",
	"subjunctivePast",
] as const;
const persons = [
	["first", "present1"],
	["second", "present2"],
	["third", "present3"],
] as const;
const dimensionOrder = [
	"plural",
	"preterite",
	"present1",
	"present2",
	"present3",
	"pastParticiple",
	"subjunctivePast",
];

type Json = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	value !== null && typeof value === "object" && !Array.isArray(value);

const readingsOf = (record: unknown): Json[] =>
	isRecord(record) && Array.isArray(record.targets)
		? record.targets.flatMap((target: unknown) =>
				isRecord(target) && isRecord(target.reading)
					? [target.reading]
					: [],
			)
		: [];

const holdsLegacy = (value: unknown) =>
	isRecord(value) && legacyAspects.some((aspect) => aspect in value);

/**
 * Whether a record's targets still hold principal parts as Reading Knowledge
 * or its coverage, as records did before ADR 0048.
 */
function holdsLegacyPrincipalParts(record: unknown): boolean {
	return readingsOf(record).some(
		(reading) =>
			holdsLegacy(reading.knowledge) || holdsLegacy(reading.coverage),
	);
}

/**
 * The record as a loader reads it. A record over the file-token limit can't
 * be staged until it is split, so it keeps the principal parts it stored as
 * Reading Knowledge before ADR 0048 (Dumcorpus ADR 0002), and it reads as
 * the other records were migrated: each part moves to `reading.paradigm`
 * under the dimension of the same name, the Präsens singular splits into
 * `present1`, `present2` and `present3`, a conjugation class is dropped,
 * since code derives classes from forms, and the coverage moves to
 * `coverage.paradigm` alike. A record under the limit that still holds them
 * answers why instead, so the old shape can't spread.
 */
export function currentRecordJson(
	record: unknown,
	bytes: number,
): { readonly record: unknown } | { readonly issue: string } {
	if (!holdsLegacyPrincipalParts(record)) return { record };
	if (bytes <= fileTokenLimitBytes)
		return {
			issue: "Move each target's principal parts out of reading.knowledge into reading.paradigm, and their coverage into coverage.paradigm (ADR 0048); only a record over the file-token limit keeps them until it is split",
		};
	const copy = structuredClone(record);
	for (const reading of readingsOf(copy)) migrateReading(reading);
	return { record: copy };
}

/** Moves one Reading's legacy principal parts into its paradigm, in place. */
function migrateReading(reading: Record<string, unknown>): void {
	const knowledge = isRecord(reading.knowledge) ? reading.knowledge : {};
	const coverage = isRecord(reading.coverage) ? reading.coverage : {};
	const paradigm: Record<string, unknown> = {};
	const covered: Record<string, unknown> = {};
	for (const aspect of sameName) {
		const value = knowledge[aspect];
		if (value !== undefined)
			paradigm[aspect] = typeof value === "string" ? [value] : value;
		if (coverage[aspect] !== undefined) covered[aspect] = coverage[aspect];
	}
	const present = knowledge.presentSingular;
	for (const [person, dimension] of persons) {
		if (isRecord(present) && present[person] !== undefined)
			paradigm[dimension] = present[person];
		if (coverage.presentSingular !== undefined)
			covered[dimension] = coverage.presentSingular;
	}
	for (const aspect of legacyAspects) {
		delete knowledge[aspect];
		delete coverage[aspect];
	}
	if (Object.keys(paradigm).length > 0) reading.paradigm = ordered(paradigm);
	if (Object.keys(covered).length > 0)
		reading.coverage = { ...coverage, paradigm: ordered(covered) };
}

const ordered = (dimensions: Record<string, unknown>) =>
	Object.fromEntries(
		dimensionOrder.flatMap((dimension) =>
			dimensions[dimension] === undefined
				? []
				: [[dimension, dimensions[dimension]]],
		),
	);
