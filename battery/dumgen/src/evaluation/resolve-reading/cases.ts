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
 * whole corpus, matched by case-folded identity (#764). A case runs in two
 * arms: with its gold Reading among the candidates the judge must reuse
 * it, and with it removed the judge must answer NoMatch. An authored
 * Lemma's Reading needs no candidate, so it runs in the first arm only.
 *
 * Folded evaluation cases (#694): existential es gibt also offers geben's
 * giving Reading, and no answer may be one of its rejected descriptions.
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { lemmaIdentityKey, parseUnit, readingIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";
import { isReviewed, loadSpecRecords } from "dumspec";
import { authoredFor } from "dumspec/inventories";
import type * as Dumspec from "dumspec/types";
import type {
	Route,
	SegmentedSentence,
	Unit,
} from "../../segment/segmented-sentence.js";
import { hashOf } from "../../segment-in-units/lab/jev-cache.js";
import { loadFrozenSet, storeFrozenSet } from "../frozen-sets.js";
import { readSidecar } from "../spec-corpus/gold.js";

/** With the gold Reading among the candidates, or removed from them. */
export type ReadingArm = "present" | "removed";

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
	/** Whether dumspec authors the Lemma (ADR 0021). */
	readonly authored: boolean;
	/** The Rules the record cites, for slicing. */
	readonly rules: readonly string[];
};

export type ReadingSetName = "dev" | "heldout";

export type ReadingSet = {
	readonly name: ReadingSetName;
	readonly createdAt: string;
	readonly gitHead: string;
	/** Uncommitted changes under battery/dumspec/records when frozen. */
	readonly dirtyRecordFiles: number;
	readonly hash: string;
	readonly cases: readonly ReadingCase[];
};

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
			(surface as { inflectionalFeatures?: { expletive?: unknown } })
				.inflectionalFeatures?.expletive === "Subject",
		extra: ["🎁"],
		rejected: ["🎁", "👉🎁"],
	},
];

/** The arms a case runs in. */
export const armsOf = (goldCase: ReadingCase): readonly ReadingArm[] =>
	goldCase.authored ? ["present"] : ["present", "removed"];

/** A Reading's identity, as Dumling compares descriptions (ADR 0031). */
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

/** The stored Emoji Descriptions the case offers in `arm`, distinct. */
export function candidatesOf(
	goldCase: ReadingCase,
	arm: ReadingArm,
): readonly string[] {
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

type Target = Dumspec.SpecRecord["targets"][number];

/** A target's Lemma and gold description, when its Reading layer has one. */
function goldOf(target: Target):
	| {
			readonly lemma: Dumling.Lemma<"de">;
			readonly emojiDescription: string;
	  }
	| undefined {
	const reading = (target as { reading?: { emojiDescription?: unknown } })
		.reading;
	const lemma = target.attestation?.surface.lemma as
		| Dumling.Lemma<"de">
		| undefined;
	if (!lemma || typeof reading?.emojiDescription !== "string")
		return undefined;
	const parsed = parseUnit({
		unitKind: "Reading",
		lemma,
		emojiDescription: reading.emojiDescription,
	});
	if (!parsed.success) return undefined;
	return {
		lemma,
		emojiDescription: (parsed.chain.value as { emojiDescription: string })
			.emojiDescription,
	};
}

const routeOf = (route: Dumspec.SpecRoute): Route =>
	({ language: "de", family: route.family, kind: route.kind }) as Route;

/** Every gold description of each Lemma across `records`, by its identity key. */
export function lemmaReadingsOf(
	records: readonly Dumspec.SpecRecord[],
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
export function casesOf(
	record: Dumspec.SpecRecord,
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
			route: routeOf(target.route),
		})),
	};
	return record.targets.flatMap((target, index) => {
		const gold = goldOf(target);
		if (!gold) return [];
		const attestation = target.attestation as Dumling.Attestation<"de">;
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
					route: routeOf(target.route),
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
	records: readonly Dumspec.SpecRecord[] = loadSpecRecords(),
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

const git = (args: readonly string[], cwd: string) =>
	execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

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
		["status", "--porcelain", "--", "battery/dumspec/records"],
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
	loadFrozenSet<ReadingSet>(
		root,
		name,
		hash,
		"bun cli/resolve-reading.ts freeze",
	);
