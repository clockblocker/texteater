/**
 * Frozen case sets. The Draft records change under a concurrent review, so
 * the lab freezes the projected cases once, with the git commit and a hash
 * of the cases, and every run reads the frozen file: arms compared case by
 * case always see the same gold. `dev` is Draft − excluded (tuning);
 * `heldout` is Reviewed − excluded, scored only for finalists.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadGold } from "../../evaluation/spec-corpus/gold.js";
import { projectCorpus } from "../../evaluation/spec-corpus/projection.js";
import {
	type SegmentInUnitsFacts,
	type SegmentInUnitsInput,
	type SegmentInUnitsOutput,
	segmentInUnits,
} from "../../evaluation/spec-corpus/segment-in-units.js";
import { ruleExampleRecords } from "../de/guide.js";
import { hashOf } from "./jev.js";

export type LabCase = {
	readonly id: string;
	readonly record: string;
	readonly input: SegmentInUnitsInput;
	readonly idealOutput: SegmentInUnitsOutput;
	readonly facts: SegmentInUnitsFacts;
	/** The Rules the record cites. */
	readonly rules: readonly string[];
	/** Whether a Rule names the record as an example (the guide may quote it). */
	readonly ruleExample: boolean;
};

export type SetName = "dev" | "heldout";

export type LabSet = {
	readonly name: SetName;
	readonly createdAt: string;
	readonly gitHead: string;
	/** Uncommitted changes under battery/dumspec/records when frozen. */
	readonly dirtyRecordFiles: number;
	readonly hash: string;
	readonly cases: readonly LabCase[];
};

const git = (args: readonly string[], cwd: string) =>
	execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

export function setPath(root: string, name: SetName): string {
	return join(root, "sets", `${name}.json`);
}

export async function freezeSets(
	root: string,
	repository: string,
): Promise<LabSet[]> {
	const gold = loadGold();
	const projected = projectCorpus(segmentInUnits, gold);
	const byId = new Map(gold.records.map((record) => [record.id, record]));
	const examples = ruleExampleRecords();
	const excluded = new Set(projected.excluded.ids);
	const gitHead = git(["rev-parse", "HEAD"], repository);
	const dirtyRecordFiles = git(
		["status", "--porcelain", "--", "battery/dumspec/records"],
		repository,
	)
		.split("\n")
		.filter(Boolean).length;
	const sets: LabSet[] = [];
	for (const [name, selection] of [
		["dev", projected.draft],
		["heldout", projected.reviewed],
	] as const) {
		const cases: LabCase[] = selection.ids.flatMap((id, index) => {
			if (excluded.has(id)) return [];
			const golden = selection.cases[index];
			const origin = projected.origins[id];
			const facts = projected.facts[id];
			if (!golden || !origin || !facts) throw Error(`Missing case ${id}`);
			const record = byId.get(origin.record);
			return [
				{
					id,
					record: origin.record,
					input: golden.input as SegmentInUnitsInput,
					idealOutput: golden.idealOutput as SegmentInUnitsOutput,
					facts,
					rules:
						record?.sources.rules.map(
							(citation) => citation.rule,
						) ?? [],
					ruleExample: examples.has(origin.record),
				},
			];
		});
		const set: LabSet = {
			name,
			createdAt: new Date().toISOString(),
			gitHead,
			dirtyRecordFiles,
			hash: hashOf(
				cases.map(({ id, input, idealOutput }) => ({
					id,
					input,
					idealOutput,
				})),
			).slice(0, 16),
			cases,
		};
		await mkdir(join(root, "sets"), { recursive: true });
		await writeFile(setPath(root, name), JSON.stringify(set));
		sets.push(set);
	}
	return sets;
}

export async function loadSet(root: string, name: SetName): Promise<LabSet> {
	return JSON.parse(await readFile(setPath(root, name), "utf8")) as LabSet;
}

/**
 * The membership focus set (#755): every dev gold unit the candidate
 * reference got wrong by majority or that flipped across repetitions. Later
 * membership experiments run on its cases and are judged on its units first.
 */
export type FocusUnit = {
	readonly caseId: string;
	/** Index into the case's ideal units. */
	readonly unit: number;
	readonly text: string;
	readonly bucket: string;
	readonly wrongByMajority: boolean;
	readonly flips: boolean;
	readonly disputedGold: boolean;
	readonly cause?: string;
};

export type FocusSet = {
	readonly name: string;
	readonly set: { readonly name: SetName; readonly hash: string };
	readonly sourceRun: string;
	readonly policy: string;
	readonly cases: readonly string[];
	readonly units: readonly FocusUnit[];
};

export const focusPath = join(
	import.meta.dir,
	"..",
	"..",
	"..",
	"evidence",
	"segment-in-units-lab",
	"membership-focus.json",
);

/** The focus set, refused when `set` is not the frozen set it was taken from. */
export function loadFocus(set: LabSet): FocusSet {
	const focus = JSON.parse(readFileSync(focusPath, "utf8")) as FocusSet;
	if (focus.set.name !== set.name || focus.set.hash !== set.hash)
		throw Error(
			`The membership focus set was taken from ${focus.set.name}@${focus.set.hash}, not ${set.name}@${set.hash}`,
		);
	return focus;
}

const multi = (labCase: LabCase) =>
	labCase.idealOutput.units.some((unit) => unit.segments.length > 1);

/** A stable pseudo-random order: cases sorted by the hash of their id. */
const shuffled = (cases: readonly LabCase[], salt: string) =>
	[...cases].sort((a, b) =>
		hashOf(`${salt}:${a.id}`).localeCompare(hashOf(`${salt}:${b.id}`)),
	);

/**
 * Named subsets. `smoke`: 10 cases (2 Full, 4 with a multi-piece unit, 4
 * other). `slice300`: every Full case, then multi-piece and other cases
 * evenly, 300 in all; the Luna arms run on it. `focus`: the cases of the
 * membership focus set (dev only). `all`: the whole set.
 */
export function subset(set: LabSet, name: string): readonly LabCase[] {
	const full = shuffled(
		set.cases.filter((c) => c.facts.coverage === "Full"),
		name,
	);
	const withMulti = shuffled(
		set.cases.filter((c) => c.facts.coverage !== "Full" && multi(c)),
		name,
	);
	const rest = shuffled(
		set.cases.filter((c) => c.facts.coverage !== "Full" && !multi(c)),
		name,
	);
	if (name === "all") return set.cases;
	if (name === "smoke")
		return [
			...full.slice(0, 2),
			...withMulti.slice(0, 4),
			...rest.slice(0, 4),
		];
	if (name === "slice300") {
		const room = 300 - full.length;
		return [
			...full,
			...withMulti.slice(0, Math.ceil(room / 2)),
			...rest.slice(0, Math.floor(room / 2)),
		];
	}
	if (name === "full") return full;
	if (name === "multiword400") {
		// Round 2: every case with a multi-piece Locution or Saying gold unit,
		// plus controls: 45 other Full cases and 90 other cases.
		const phraseme = (labCase: LabCase) =>
			labCase.idealOutput.units.some(
				(unit) =>
					unit.segments.length > 1 &&
					unit.route !== "Unresolved" &&
					(unit.route.family === "Locution" ||
						unit.route.family === "Saying"),
			);
		const target = shuffled(set.cases.filter(phraseme), name);
		const fullControls = shuffled(
			set.cases.filter(
				(c) => !phraseme(c) && c.facts.coverage === "Full",
			),
			name,
		).slice(0, 45);
		const otherControls = shuffled(
			set.cases.filter(
				(c) => !phraseme(c) && c.facts.coverage !== "Full",
			),
			name,
		).slice(0, 400 - target.length - fullControls.length);
		return [...target, ...fullControls, ...otherControls];
	}
	if (name === "multi") return [...full, ...withMulti];
	if (name === "focus") {
		const ids = new Set(loadFocus(set).cases);
		return set.cases.filter((labCase) => ids.has(labCase.id));
	}
	throw Error(`Unknown subset ${name}`);
}
