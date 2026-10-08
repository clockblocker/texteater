/**
 * The cases `resolve.grammar` is scored on (#873): one per target of a
 * German Spec Record whose Attestation layer passes, with the target's
 * Segments and route fed in as the stored unit, so the score measures the
 * click step alone. Dev is the Draft records, frozen once with the git
 * commit and a hash of the cases so concurrent review edits never move a
 * run's gold; held-out is the records reviewed through Attestation or
 * deeper, scored only for finalists. The sidecar's exclusions leave both.
 *
 * A closed-class target gets the identity its gold Lemma names, as intake
 * would have stored it (#864): gold units are the headline input. The
 * end-to-end line feeds intake's own units instead.
 */
import { fileURLToPath } from "node:url";
import { isReviewed, loadSpecRecords } from "dumcorpus";
import type * as Dumcorpus from "dumcorpus/types";
import type * as Dumling from "dumling/types";
import type {
	ClosedClassIdentity,
	SegmentedSentence,
	Unit,
} from "../../../src/segment/segmented-sentence.js";
import { git } from "../../git.js";
import { hashOf } from "../../segmentation/harness/jev-cache.js";
import { loadFrozenSet, storeFrozenSet } from "../frozen-sets.js";
import { goldRouteOf, readSidecar } from "../spec-corpus/gold.js";

export type GrammarCase = {
	/** `<record>#<target>`. */
	readonly id: string;
	readonly record: string;
	readonly target: number;
	readonly sentence: SegmentedSentence;
	readonly unit: Unit;
	readonly ideal: Dumling.Attestation<"de">;
	/** The Rules the record cites, for slicing. */
	readonly rules: readonly string[];
};

export type GrammarSetName = "dev" | "heldout";

export type GrammarSet = {
	readonly name: GrammarSetName;
	readonly createdAt: string;
	readonly gitHead: string;
	/** Uncommitted changes under battery/dumcorpus/records when frozen. */
	readonly dirtyRecordFiles: number;
	readonly hash: string;
	readonly cases: readonly GrammarCase[];
};

/** The identity intake stores for a closed-class Lemma (#864), none for another. */
function identityOf(lemma: Dumling.Lemma): ClosedClassIdentity | undefined {
	if (
		lemma.language !== "de" ||
		lemma.family !== "Lexeme" ||
		(lemma.kind !== "DET" && lemma.kind !== "PRON")
	)
		return undefined;
	const core = lemma.coreFeatures as Readonly<Record<string, unknown>>;
	return {
		kind: lemma.kind,
		canonicalForm: lemma.canonicalForm,
		pronType: typeof core.pronType === "string" ? core.pronType : null,
		...(core.poss === "Yes" ? { poss: "Yes" as const } : {}),
	};
}

/** The cases of one record, one per target with an Attestation. */
function casesOf(record: Dumcorpus.SpecRecord): GrammarCase[] {
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
	return record.targets.map((target, index) => {
		const identity = identityOf(target.attestation.surface.lemma);
		return {
			id: `${record.id}#${index}`,
			record: record.id,
			target: index,
			sentence,
			unit: {
				segments: [...target.memberSegmentIndices],
				route: goldRouteOf(target.route),
				...(identity ? { identity } : {}),
			},
			ideal: target.attestation as Dumling.Attestation<"de">,
			rules: record.sources.rules.map(({ rule }) => rule),
		};
	});
}

/** The German records that carry the Attestation layer, split by review. */
export function grammarCases(
	records: readonly Dumcorpus.SpecRecord[] = loadSpecRecords(),
	excluded: ReadonlySet<string> = new Set(
		Object.keys(readSidecar().exclusions),
	),
): Readonly<Record<GrammarSetName, readonly GrammarCase[]>> {
	const german = records.filter(
		(record) => record.language === "de" && !excluded.has(record.id),
	);
	return {
		dev: german
			.filter((record) => !isReviewed(record, "Attestation"))
			.flatMap(casesOf),
		heldout: german
			.filter((record) => isReviewed(record, "Attestation"))
			.flatMap(casesOf),
	};
}

/** The tracked frozen sets (`frozen-sets.ts`). */
export const trackedGrammarSetsRoot = fileURLToPath(
	new URL("../../../evidence/resolve-grammar/sets/", import.meta.url),
);

/**
 * Freezes dev and held-out from today's records into `root`. A refreeze
 * keeps the set it replaces beside it under its hash, so a run is always
 * scored against the set it ran on.
 */
export async function freezeGrammarSets(
	root: string,
	repository: string,
	cases = grammarCases(),
): Promise<GrammarSet[]> {
	const gitHead = git(["rev-parse", "HEAD"], repository);
	const dirtyRecordFiles = git(
		["status", "--porcelain", "--", "battery/dumcorpus/records"],
		repository,
	)
		.split("\n")
		.filter(Boolean).length;
	const sets: GrammarSet[] = [];
	for (const name of ["dev", "heldout"] as const) {
		const set: GrammarSet = {
			name,
			createdAt: new Date().toISOString(),
			gitHead,
			dirtyRecordFiles,
			hash: hashOf(
				cases[name].map(({ id, sentence, unit, ideal }) => ({
					id,
					sentence,
					unit,
					ideal,
				})),
			).slice(0, 16),
			cases: cases[name],
		};
		await storeFrozenSet(root, set);
		sets.push(set);
	}
	return sets;
}

/** The frozen set `name`, or the replaced set of `hash`. */
export const loadGrammarSet = (
	root: string,
	name: GrammarSetName,
	hash?: string,
): Promise<GrammarSet> =>
	loadFrozenSet<GrammarSet>(
		root,
		name,
		hash,
		"bun cli/resolve-grammar.ts freeze",
	);
