/**
 * The cases the licence judge is evaluated on (ADR 0048, #1230): the gold
 * of dumcorpus's German Doublet Rule, `de/meaning-conditioned-paradigm-
 * doublets`, its records' targets whose Reading has paradigm gold.
 *
 * - A Lemma with two gold Readings, a doublet (`Bank` 🪑 `Bänke`, 🏦
 *   `Banken`), gives two cases: each Reading produced later, the other
 *   stored first with its gold forms under an explicit Licence.
 * - A Lemma with one gold Reading that takes two forms of a dimension, a
 *   Free control (`melken`, `Pizza`), gives one case: its gold forms are
 *   stored under a sibling Reading, so the judge must take them all.
 *
 * The set is frozen with the git commit and a hash beside the Knowledge
 * sets, so concurrent review never moves a run's gold.
 */
import { fileURLToPath } from "node:url";
import { isRecord } from "common-utils";
import { loadSpecRecords, rules } from "dumcorpus";
import type * as Dumcorpus from "dumcorpus/types";
import { lemmaIdentityKey, readingIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";
import {
	applyParadigmChanges,
	dimensionIdValues,
	paradigmChangesFor,
} from "dumrel";
import type * as Dumrel from "dumrel/types";
import { z } from "zod";
import { git } from "../../git.js";
import { hashOf } from "../../segmentation/harness/jev-cache.js";
import {
	germanAttestation,
	germanAttestationSchema,
	germanReading,
	germanReadingSchema,
	storedAs,
} from "../../stored-json.js";
import { loadFrozenSet, storeFrozenSet } from "../frozen-sets.js";
import type { KnowledgeCase } from "../knowledge/cases.js";

/** The Rule whose records are the gold. */
const doubletRule = "de/meaning-conditioned-paradigm-doublets";

/** The Reading a Free control's forms are stored under: never shown to the judge. */
const siblingEmoji = "🧪";

export type LicenceCase = {
	/** `<later case>@<stored case>`, or `<case>@sibling` for a Free control. */
	readonly id: string;
	readonly lemma: string;
	readonly control: boolean;
	/** The Reading produced, with its gold forms, as a Knowledge case. */
	readonly later: KnowledgeCase & {
		readonly gold: NonNullable<KnowledgeCase["gold"]>;
	};
	/** The Reading stored first, and the gold forms it licenses. */
	readonly stored: {
		readonly reading: Dumling.Reading<"de">;
		readonly paradigm: Dumcorpus.ReadingParadigm;
	};
};

export type LicenceSet = {
	readonly name: "doublets";
	readonly createdAt: string;
	readonly gitHead: string;
	readonly dirtyRecordFiles: number;
	readonly hash: string;
	readonly cases: readonly LicenceCase[];
};

const paradigmSchema = z.partialRecord(
	z.enum(dimensionIdValues),
	z.array(z.string()),
);

/** A later Reading's case as frozen: its Reading and Attestation German ones Dumling accepts. */
const laterSchema = z.custom<LicenceCase["later"]>(
	(value) =>
		isRecord(value) &&
		typeof value.id === "string" &&
		typeof value.record === "string" &&
		germanReadingSchema.safeParse(value.reading).success &&
		germanAttestationSchema.safeParse(value.attestation).success &&
		isRecord(value.sentence) &&
		isRecord(value.gold) &&
		paradigmSchema.safeParse(value.gold.paradigm).success,
	{ message: "Expected a later Reading's case with paradigm gold" },
);

const licenceCaseSchema = z.object({
	id: z.string(),
	lemma: z.string(),
	control: z.boolean(),
	later: laterSchema,
	stored: z.object({
		reading: germanReadingSchema,
		paradigm: paradigmSchema,
	}),
}) satisfies z.ZodType<LicenceCase>;

const licenceSetSchema = z.object({
	name: z.literal("doublets"),
	createdAt: z.string(),
	gitHead: z.string(),
	dirtyRecordFiles: z.number(),
	hash: z.string(),
	cases: z.array(licenceCaseSchema),
}) satisfies z.ZodType<LicenceSet>;

/** Each gold target of the Rule's records with paradigm gold, as a Knowledge case. */
function goldTargets(
	records: readonly Dumcorpus.SpecRecord[],
): LicenceCase["later"][] {
	const rule = rules.find(({ id }) => id === doubletRule);
	if (!rule) throw Error(`dumcorpus has no Rule ${doubletRule}`);
	const ids = new Set(rule.records);
	return records
		.filter((record) => ids.has(record.id))
		.flatMap((record) =>
			record.targets.flatMap((target, index) => {
				if (!target.reading || !target.paradigm) return [];
				return [
					{
						id: `${record.id}#${index}`,
						record: record.id,
						target: index,
						reading: germanReading(target.reading),
						attestation: germanAttestation(target.attestation),
						sentence: {
							segments: record.segments.map(({ text }) => ({
								text,
							})),
							target: [...target.memberSegmentIndices],
						},
						text: record.sentence,
						gold: {
							knowledge: {},
							paradigm: target.paradigm,
							coverage: target.coverage ?? {},
						},
						authored: false,
						rules: record.sources.rules.map((cited) => cited.rule),
					},
				];
			}),
		);
}

/** Whether some dimension of the forms holds two variants: a Free control's mark. */
const takesTwo = (paradigm: Dumcorpus.ReadingParadigm) =>
	Object.values(paradigm).some((forms) => (forms?.length ?? 0) > 1);

/** The Rule's cases from today's records. */
export function licenceCases(
	records: readonly Dumcorpus.SpecRecord[] = loadSpecRecords(),
): LicenceCase[] {
	const byLemma = new Map<string, LicenceCase["later"][]>();
	for (const target of goldTargets(records)) {
		const key = lemmaIdentityKey(target.reading.lemma);
		const group = byLemma.get(key) ?? [];
		if (
			!group.some(
				(other) =>
					readingIdentityKey(other.reading) ===
					readingIdentityKey(target.reading),
			)
		)
			group.push(target);
		byLemma.set(key, group);
	}
	return [...byLemma.values()].flatMap((group): LicenceCase[] => {
		const [only] = group;
		if (group.length === 1 && only && takesTwo(only.gold.paradigm))
			return [
				{
					id: `${only.id}@sibling`,
					lemma: only.reading.lemma.canonicalForm,
					control: true,
					later: only,
					stored: {
						reading: storedAs(
							germanReadingSchema,
							{ ...only.reading, emojiDescription: siblingEmoji },
							`${only.id}'s sibling Reading`,
						),
						paradigm: only.gold.paradigm,
					},
				},
			];
		if (group.length < 2) return [];
		return group.flatMap((later) =>
			group
				.filter((first) => first !== later)
				.map((first) => ({
					id: `${later.id}@${first.id}`,
					lemma: later.reading.lemma.canonicalForm,
					control: false,
					later,
					stored: {
						reading: first.reading,
						paradigm: first.gold.paradigm,
					},
				})),
		);
	});
}

/** The tracked frozen sets, beside the Knowledge sets. */
export const trackedLicenceSetsRoot = fileURLToPath(
	new URL("../../../evidence/knowledge/sets/", import.meta.url),
);

export const licenceFreezeCommand = "bun cli/knowledge.ts freeze-doublets";

/** Freezes the doublets set into `root` from today's records. */
export async function freezeLicenceSet(
	root: string,
	repository: string,
	records: readonly Dumcorpus.SpecRecord[] = loadSpecRecords(),
): Promise<LicenceSet> {
	const cases = licenceCases(records);
	const set: LicenceSet = {
		name: "doublets",
		createdAt: new Date().toISOString(),
		gitHead: git(["rev-parse", "HEAD"], repository),
		dirtyRecordFiles: git(
			["status", "--porcelain", "--", "battery/dumcorpus/records"],
			repository,
		)
			.split("\n")
			.filter(Boolean).length,
		hash: hashOf({ cases }).slice(0, 16),
		cases,
	};
	await storeFrozenSet(root, set);
	return set;
}

/** The frozen doublets set, or the replaced set of `hash`. */
export const loadLicenceSet = (
	root: string,
	_name: "doublets" = "doublets",
	hash?: string,
): Promise<LicenceSet> =>
	loadFrozenSet(
		root,
		"doublets",
		hash,
		licenceFreezeCommand,
		licenceSetSchema,
	);

/**
 * The Lemma Paradigm a case's run starts from: the stored Reading's gold
 * forms, each a variant under its explicit Licence, as Knowledge
 * Production would have written them for the Lemma's first Reading.
 */
export function storedParadigmOf(
	licenceCase: LicenceCase,
): Dumrel.LemmaParadigm {
	const { reading, paradigm } = licenceCase.stored;
	const applied = applyParadigmChanges({
		lemma: reading.lemma,
		readings: [reading],
		paradigm: { dimensions: {} },
		changes: Object.entries(paradigm).flatMap(([dimension, values]) =>
			paradigmChangesFor({
				reading,
				dimension: dimension as Dumrel.DimensionId,
				values: values ?? [],
				provenance: "Produced",
			}),
		),
	});
	if (!applied.success)
		throw Error(
			`${licenceCase.id}'s stored forms: ${applied.error.message}`,
		);
	return applied.value;
}
