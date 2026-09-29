/**
 * Frozen case sets. The Draft records change under a concurrent review, so
 * the lab freezes the projected cases once, with the git commit and a hash
 * of the cases, and every run reads the frozen file: arms compared case by
 * case always see the same gold. `dev` is Draft − excluded (tuning);
 * `heldout` is Reviewed − excluded, scored only for finalists.
 */
import { execFileSync } from "node:child_process";
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
 * evenly, 300 in all; the Luna arms run on it. `all`: the whole set.
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
	if (name === "multi") return [...full, ...withMulti];
	throw Error(`Unknown subset ${name}`);
}
