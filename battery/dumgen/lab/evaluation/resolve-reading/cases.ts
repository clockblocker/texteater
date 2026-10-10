/**
 * The cases `resolve.reading` is scored on (#873): one per target of a
 * German Spec Record whose Reading layer carries an Emoji Description,
 * with the gold Attestation, the target's Segments and route as the
 * stored unit, so the score measures the Reading step alone. Dev is the
 * Draft records, frozen once with the git commit and a hash of the cases
 * so concurrent review edits never move a run's gold; held-out is the
 * records reviewed through Reading or deeper, scored only for finalists.
 * The sidecar's exclusions leave both.
 *
 * Each case's candidate set is the gold Readings of its Lemma across the
 * whole corpus, matched by case-folded identity (#764). A case runs in up
 * to three arms, each a state the runtime meets:
 *
 * - `present`: gold's Reading among the candidates; the judge must reuse it.
 * - `removed`: gold's taken out, the Lemma's other senses stored; the judge
 *   must answer NoMatch, and Luna must write no other sense's description.
 * - `empty`: nothing stored, the Lemma's first click. Only a case whose
 *   Lemma has another gold sense runs it, since for any other `removed`
 *   already stores nothing. Luna writes at once and must not name another
 *   sense: tf-demo's first click on «auf der Bank» minted 🏦 (#1165).
 *
 * With a two-sense Lemma the arms play both orders: the other sense stored
 * first (`removed`) and this one first (`empty`). An authored Lemma's
 * Reading needs no candidate, so it runs in the first arm only.
 *
 * Folded evaluation cases (#694): existential es gibt also offers geben's
 * giving Reading, and no answer may be one of its rejected descriptions.
 */
import { fileURLToPath } from "node:url";
import { isReviewed, loadSpecRecords } from "dumcorpus";
import { authoredFor } from "dumcorpus/inventories";
import type * as Dumcorpus from "dumcorpus/types";
import { lemmaIdentityKey, parseUnit, readingIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";
import { z } from "zod";
import type {
	SegmentedSentence,
	Unit,
} from "../../../src/segment/segmented-sentence.js";
import { git } from "../../git.js";
import { hashOf } from "../../segmentation/harness/jev-cache.js";
import {
	germanAttestation,
	germanAttestationSchema,
	segmentedSentenceSchema,
	unitSchema,
} from "../../stored-json.js";
import { loadFrozenSet, storeFrozenSet } from "../frozen-sets.js";
import { goldRouteOf, readSidecar } from "../spec-corpus/gold.js";

/** The arms, in the order a case runs them. */
export const readingArms = ["present", "removed", "empty"] as const;

/** Gold's Reading among the candidates, removed from them, or nothing stored. */
export type ReadingArm = (typeof readingArms)[number];

export type ReadingCase = {
	/** `<record>#<target>`. */
	readonly id: string;
	readonly record: string;
	readonly target: number;
	readonly sentence: SegmentedSentence;
	readonly unit: Unit;
	readonly attestation: Dumling.Attestation<"de">;
	/** Gold's Emoji Description, as Dumling parses it. */
	readonly ideal: string;
	/** The gold descriptions of the Lemma across the corpus, distinct, gold's own first. */
	readonly lemmaReadings: readonly string[];
	/** Stored candidates a folded case adds beside gold's (#694). */
	readonly extra: readonly string[];
	/** Descriptions no answer may give (#694). */
	readonly rejected: readonly string[];
	/** Whether dumcorpus authors the Lemma (ADR 0021). */
	readonly authored: boolean;
	/** The Rules the record cites, for slicing. */
	readonly rules: readonly string[];
};

export type ReadingSetName = "dev" | "heldout";

export type ReadingSet = {
	readonly name: ReadingSetName;
	readonly createdAt: string;
	readonly gitHead: string;
	/** Uncommitted changes under battery/dumcorpus/records when frozen. */
	readonly dirtyRecordFiles: number;
	readonly hash: string;
	readonly cases: readonly ReadingCase[];
};

/** A frozen resolve.reading set as `freezeReadingSets` keeps it. */
const readingSetSchema = z.object({
	name: z.enum(["dev", "heldout"]),
	createdAt: z.string(),
	gitHead: z.string(),
	dirtyRecordFiles: z.number(),
	hash: z.string(),
	cases: z.array(
		z.object({
			id: z.string(),
			record: z.string(),
			target: z.number(),
			sentence: segmentedSentenceSchema,
			unit: unitSchema,
			attestation: germanAttestationSchema,
			ideal: z.string(),
			lemmaReadings: z.array(z.string()),
			extra: z.array(z.string()),
			rejected: z.array(z.string()),
			authored: z.boolean(),
			rules: z.array(z.string()),
		}),
	),
}) satisfies z.ZodType<ReadingSet>;

/** A Surface's expletive feature, if its bag sets one. */
function expletiveOf(surface: Dumling.Surface): unknown {
	const bag: Readonly<Record<string, unknown>> | null =
		"inflectionalFeatures" in surface ? surface.inflectionalFeatures : null;
	return bag?.expletive;
}

/**
 * Existential es gibt (Sys ADR 0022): its giving Reading is offered too, and
 * neither the judge nor Luna may answer with the giving descriptions #694
 * names.
 */
const foldedCases: readonly {
	readonly matches: (attestation: Dumling.Attestation<"de">) => boolean;
	readonly extra: readonly string[];
	readonly rejected: readonly string[];
}[] = [
	{
		matches: ({ surface }) =>
			surface.lemma.family === "Lexeme" &&
			surface.lemma.kind === "VERB" &&
			surface.lemma.canonicalForm === "geben" &&
			expletiveOf(surface) === "Subject",
		extra: ["🎁"],
		rejected: ["🎁", "👉🎁"],
	},
];

/** The arms a case runs in. */
export const armsOf = (goldCase: ReadingCase): readonly ReadingArm[] =>
	goldCase.authored
		? ["present"]
		: otherSensesOf(goldCase).length > 0
			? ["present", "removed", "empty"]
			: ["present", "removed"];

/**
 * A Reading's identity, as Dumling compares descriptions (ADR 0031).
 * TypeScript can't pair a Lemma union with each route's Reading, so the
 * cast stays; the key reads only the Lemma's identity and the description.
 */
const keyFor = (lemma: Dumling.Lemma, emojiDescription: string) =>
	readingIdentityKey({
		unitKind: "Reading",
		lemma,
		emojiDescription,
	} as Dumling.Reading<"de">);

/** A description's identity for the case's Lemma. */
export const descriptionKey = (
	goldCase: Pick<ReadingCase, "attestation">,
	emojiDescription: string,
) => keyFor(goldCase.attestation.surface.lemma, emojiDescription);

/** The gold descriptions of the case's Lemma other than its own: its other senses. */
export function otherSensesOf(goldCase: ReadingCase): readonly string[] {
	const ideal = descriptionKey(goldCase, goldCase.ideal);
	return goldCase.lemmaReadings.filter(
		(description) => descriptionKey(goldCase, description) !== ideal,
	);
}

/** The stored Emoji Descriptions the case offers in `arm`, distinct. */
export function candidatesOf(
	goldCase: ReadingCase,
	arm: ReadingArm,
): readonly string[] {
	if (arm === "empty") return [];
	const ideal = descriptionKey(goldCase, goldCase.ideal);
	const seen = new Set<string>();
	return [...goldCase.lemmaReadings, ...goldCase.extra].filter(
		(description) => {
			const key = descriptionKey(goldCase, description);
			if (seen.has(key) || (arm === "removed" && key === ideal))
				return false;
			seen.add(key);
			return true;
		},
	);
}

type Target = Dumcorpus.SpecRecord["targets"][number];

/** A target's Lemma and gold description, when its Reading layer has one. */
function goldOf(target: Target):
	| {
			readonly lemma: Dumling.Lemma<"de">;
			readonly emojiDescription: string;
	  }
	| undefined {
	const { reading } = target;
	const emojiDescription =
		reading && "emojiDescription" in reading
			? reading.emojiDescription
			: undefined;
	if (typeof emojiDescription !== "string") return undefined;
	const lemma = germanAttestation(target.attestation).surface.lemma;
	const parsed = parseUnit({ unitKind: "Reading", lemma, emojiDescription });
	if (!parsed.success || parsed.chain.unitKind !== "Reading")
		return undefined;
	const parsedReading = parsed.chain.value;
	if (!("emojiDescription" in parsedReading)) return undefined;
	return { lemma, emojiDescription: parsedReading.emojiDescription };
}

/** Every gold description of each Lemma across `records`, by its identity key. */
function lemmaReadingsOf(
	records: readonly Dumcorpus.SpecRecord[],
): ReadonlyMap<string, readonly string[]> {
	const byLemma = new Map<string, string[]>();
	for (const record of records)
		for (const target of record.targets) {
			const gold = goldOf(target);
			if (!gold) continue;
			const key = lemmaIdentityKey(gold.lemma);
			const readings = byLemma.get(key) ?? [];
			const reading = keyFor(gold.lemma, gold.emojiDescription);
			if (
				!readings.some((other) => keyFor(gold.lemma, other) === reading)
			)
				readings.push(gold.emojiDescription);
			byLemma.set(key, readings);
		}
	return byLemma;
}

/** The cases of one record, one per target whose Reading has a description. */
function casesOf(
	record: Dumcorpus.SpecRecord,
	lemmaReadings: ReadonlyMap<string, readonly string[]>,
): ReadingCase[] {
	const sentence: SegmentedSentence = {
		text: record.segments.map(({ text }) => text).join(""),
		segments: record.segments.map(({ kind, text, surface }) => ({
			kind,
			text,
			...(surface === undefined ? {} : { surface }),
		})),
		units: record.targets.map((target) => ({
			segments: [...target.memberSegmentIndices],
			route: goldRouteOf(target.route),
		})),
	};
	return record.targets.flatMap((target, index) => {
		const gold = goldOf(target);
		if (!gold) return [];
		const attestation = germanAttestation(target.attestation);
		const folded = foldedCases.filter(({ matches }) =>
			matches(attestation),
		);
		const own = keyFor(gold.lemma, gold.emojiDescription);
		const others = (
			lemmaReadings.get(lemmaIdentityKey(gold.lemma)) ?? []
		).filter((description) => keyFor(gold.lemma, description) !== own);
		return [
			{
				id: `${record.id}#${index}`,
				record: record.id,
				target: index,
				sentence,
				unit: {
					segments: [...target.memberSegmentIndices],
					route: goldRouteOf(target.route),
				},
				attestation,
				ideal: gold.emojiDescription,
				lemmaReadings: [gold.emojiDescription, ...others],
				extra: folded.flatMap(({ extra }) => extra),
				rejected: folded.flatMap(({ rejected }) => rejected),
				authored: authoredFor(gold.lemma).length > 0,
				rules: record.sources.rules.map(({ rule }) => rule),
			},
		];
	});
}

/** The German records that carry the Reading layer, split by review. */
export function readingCases(
	records: readonly Dumcorpus.SpecRecord[] = loadSpecRecords(),
	excluded: ReadonlySet<string> = new Set(
		Object.keys(readSidecar().exclusions),
	),
): Readonly<Record<ReadingSetName, readonly ReadingCase[]>> {
	const german = records.filter(
		(record) => record.language === "de" && !excluded.has(record.id),
	);
	const lemmaReadings = lemmaReadingsOf(german);
	const cases = (reviewed: boolean) =>
		german
			.filter((record) => isReviewed(record, "Reading") === reviewed)
			.flatMap((record) => casesOf(record, lemmaReadings));
	return { dev: cases(false), heldout: cases(true) };
}

/** The tracked frozen sets (`frozen-sets.ts`). */
export const trackedReadingSetsRoot = fileURLToPath(
	new URL("../../../evidence/resolve-reading/sets/", import.meta.url),
);

/**
 * Freezes into `root` dev and held-out from today's records. A refreeze keeps the set
 * it replaces beside it under its hash, so a run is always scored against
 * the set it ran on.
 */
export async function freezeReadingSets(
	root: string,
	repository: string,
	cases = readingCases(),
): Promise<ReadingSet[]> {
	const gitHead = git(["rev-parse", "HEAD"], repository);
	const dirtyRecordFiles = git(
		["status", "--porcelain", "--", "battery/dumcorpus/records"],
		repository,
	)
		.split("\n")
		.filter(Boolean).length;
	const sets: ReadingSet[] = [];
	for (const name of ["dev", "heldout"] as const) {
		const set: ReadingSet = {
			name,
			createdAt: new Date().toISOString(),
			gitHead,
			dirtyRecordFiles,
			hash: hashOf(cases[name]).slice(0, 16),
			cases: cases[name],
		};
		await storeFrozenSet(root, set);
		sets.push(set);
	}
	return sets;
}

/** The frozen set `name`, or the replaced set of `hash`. */
export const loadReadingSet = (
	root: string,
	name: ReadingSetName,
	hash?: string,
): Promise<ReadingSet> =>
	loadFrozenSet(
		root,
		name,
		hash,
		"bun cli/resolve-reading.ts freeze",
		readingSetSchema,
	);
