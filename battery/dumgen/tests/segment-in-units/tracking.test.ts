import { afterAll, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { TypeSafeExecutor } from "promptsmith/typesafe";
import type {
	SegmentInUnitsInput,
	SegmentInUnitsOutput,
} from "../../src/evaluation/spec-corpus/segment-in-units.js";
import { oracleArm } from "../../src/segment-in-units/de/arms/baselines.js";
import {
	deltaBetween,
	findNoise,
	loadSide,
} from "../../src/segment-in-units/lab/compare.js";
import type { LabCase, LabSet } from "../../src/segment-in-units/lab/corpus.js";
import {
	readOutcomes,
	writeManifest,
	writeNoise,
	writeOutcomes,
} from "../../src/segment-in-units/lab/evidence.js";
import {
	hashOf,
	Jev,
	noul,
	pinnedJevModel,
	writeCache,
} from "../../src/segment-in-units/lab/jev.js";
import { summarizePolicy } from "../../src/segment-in-units/lab/metrics.js";
import {
	allBuckets,
	deltaOf,
	floorOf,
	noiseFloor,
} from "../../src/segment-in-units/lab/noise.js";
import {
	decodeOutcomes,
	encodeOutcomes,
	type OutcomeRow,
	outcomesOf,
	pairOutcomes,
	unitAccuracyOf,
} from "../../src/segment-in-units/lab/outcomes.js";
import {
	codeHashOf,
	gitState,
	provenanceOf,
	type RunManifest,
	sourceHashes,
} from "../../src/segment-in-units/lab/provenance.js";
import { type LabRun, runArm } from "../../src/segment-in-units/lab/run.js";
import {
	derivedVerdict,
	iterationTable,
} from "../../src/segment-in-units/lab/table.js";
import { segmentsOf } from "../spec-corpus/fixtures.js";

const directory = await mkdtemp(join(tmpdir(), "segment-in-units-tracking-"));
afterAll(() => rm(directory, { recursive: true, force: true }));
const packageRoot = resolve(import.meta.dir, "../..");

// Er0 _1 zog2 _3 sich4 _5 an6 .7
const input: SegmentInUnitsInput = {
	language: "de",
	segments: segmentsOf("Er zog sich an."),
};
const pron = { language: "de", family: "Lexeme", kind: "PRON" } as const;
const verb = { language: "de", family: "Lexeme", kind: "VERB" } as const;
const adj = { language: "de", family: "Lexeme", kind: "ADJ" } as const;
const gold: SegmentInUnitsOutput = {
	units: [
		{ segments: [0], route: pron },
		{ segments: [2, 4, 6], route: verb },
	],
};
const labCase: LabCase = {
	id: "de/er-zog-sich-an",
	record: "de/er-zog-sich-an",
	input,
	idealOutput: gold,
	facts: { coverage: "Full", sources: [{ target: 0 }, { target: 1 }] },
	rules: [],
	ruleExample: false,
};
const cases = new Map([[labCase.id, labCase]]);

const labRun: LabRun = {
	runId: "synthetic",
	arm: "test",
	options: {},
	set: "dev",
	setHash: "test",
	setGitHead: "test",
	subset: "all",
	gitHead: "test",
	startedAt: "",
	finishedAt: "",
	repetitions: 3,
	model: pinnedJevModel,
	cases: [
		{
			id: labCase.id,
			repetitions: [
				{ outputs: { p: gold }, primary: "p", calls: [], wallMs: 0 },
				{
					outputs: {
						p: {
							units: [
								{ segments: [0], route: pron },
								{ segments: [2, 4, 6], route: adj },
							],
						},
					},
					primary: "p",
					calls: [],
					wallMs: 0,
				},
				{ calls: [], wallMs: 0, error: "timeout" },
			],
		},
	],
};

test("outcomes keep a verdict letter per repetition and round-trip through gzip", () => {
	const rows = outcomesOf(labRun, cases);
	expect(rows).toEqual([
		{
			case: labCase.id,
			unit: 0,
			bucket: "one piece",
			gold: "Lexeme/PRON",
			text: "Er",
			stub: false,
			policies: { p: { v: "MME" } },
		},
		{
			case: labCase.id,
			unit: 1,
			bucket: "Lexeme multi-piece",
			gold: "Lexeme/VERB",
			text: "zog sich an",
			stub: false,
			policies: { p: { v: "MRE", r: [null, "Lexeme/ADJ", null] } },
		},
	]);
	expect(decodeOutcomes(encodeOutcomes(rows))).toEqual(rows);
	// The committed outcomes reproduce the summary's unit accuracy.
	expect(unitAccuracyOf(rows, "p")).toBe(
		summarizePolicy(labRun, cases, "p").rates.unitAccuracy,
	);
});

test("source hashes change with any file, and the git state sees only its scope", async () => {
	const repository = join(directory, "repository");
	await mkdir(join(repository, "src"), { recursive: true });
	await mkdir(join(repository, "other"), { recursive: true });
	await writeFile(join(repository, "src", "a.ts"), "export const a = 1;\n");
	await writeFile(join(repository, "other", "c.ts"), "c\n");
	const git = (...args: string[]) =>
		execFileSync(
			"git",
			["-c", "user.name=t", "-c", "user.email=t@t", ...args],
			{ cwd: repository, encoding: "utf8" },
		);
	git("init", "--quiet");
	git("add", ".");
	git("commit", "--quiet", "--no-verify", "-m", "init");
	const before = await sourceHashes(repository, ["src"]);
	expect(Object.keys(before)).toEqual(["src/a.ts"]);
	expect(gitState(repository, ["src"])).toMatchObject({
		dirty: [],
		patch: "",
	});

	await writeFile(join(repository, "src", "a.ts"), "export const a = 2;\n");
	await writeFile(join(repository, "src", "b.ts"), "export const b = 1;\n");
	await writeFile(join(repository, "other", "c.ts"), "changed\n");
	const after = await sourceHashes(repository, ["src"]);
	expect(codeHashOf(after)).not.toBe(codeHashOf(before));
	const state = gitState(repository, ["src"]);
	expect(state.dirty).toEqual([" M src/a.ts", "?? src/b.ts"]);
	expect(state.patch).toContain("+export const a = 2;");
	expect(state.patch).toContain("+export const b = 1;");
	expect(state.patch).not.toContain("changed");
});

test("the lab's provenance hashes its own sources and the dumspec it imports", async () => {
	const provenance = await provenanceOf({
		packageRoot,
		repository: resolve(packageRoot, "../.."),
		cli: "cli/segment-in-units-lab.ts",
	});
	expect(provenance.codeHash).toMatch(/^[0-9a-f]{64}$/u);
	expect(provenance.dumspecHash).toMatch(/^[0-9a-f]{64}$/u);
	expect(Object.keys(provenance.sourceHashes)).toEqual(
		expect.arrayContaining([
			"cli/segment-in-units-lab.ts",
			"src/segment-in-units/lab/provenance.ts",
			"src/evaluation/spec-corpus/segment-in-units-evaluation.ts",
		]),
	);
	expect(provenance.dirty).toBe(provenance.dirtyFiles.length > 0);
});

const answeringAs =
	(model: string, counter?: { calls: number }): TypeSafeExecutor =>
	async (request) => {
		if (counter) counter.calls++;
		const answers = Object.fromEntries(
			Object.entries(request.questions).map(([id, question]) => {
				if (question.type === "noul")
					return [id, { type: "noul", noul: 0.9 }];
				const keys = Object.keys(
					question.type === "choice" ? question.criteria : {},
				);
				const wanted = id.startsWith("r_")
					? (keys.find((key) => key === "Lexeme/PRON") ?? keys[0])
					: keys[keys.length - 1];
				return [
					id,
					{
						type: "choice",
						choice: wanted,
						confidence: 1,
						probabilities: Object.fromEntries(
							keys.map((key) => [key, key === wanted ? 1 : 0]),
						),
					},
				];
			}),
		);
		return {
			model,
			answers,
			usage: { input_tokens: 10, output_tokens: 0 },
		} as never;
	};

const ask = (jev: Jev) =>
	jev.ask({
		stage: "test",
		state: "A sentence",
		questions: { q: noul("Does the sentence exist?") },
		repetition: 0,
		calls: [],
	});

test("jev is pinned: aliases need consent and another version's answer fails", async () => {
	const cacheDirectory = join(directory, "pinned");
	expect(() => new Jev({ cacheDirectory, model: "jev-latest" })).toThrow(
		"floats",
	);
	expect(
		new Jev({
			cacheDirectory,
			model: "jev-latest",
			allowFloatingModel: true,
		}).model,
	).toBe("jev-latest");
	const jev = new Jev({ cacheDirectory, executor: answeringAs("jev-9.9.9") });
	expect(jev.model).toBe(pinnedJevModel);
	await expect(ask(jev)).rejects.toThrow("jev answered as jev-9.9.9");
});

test("an alias-keyed cache entry is reused only when the pinned version answered it", async () => {
	const cacheDirectory = join(directory, "legacy");
	const legacyPath = (state: string) => {
		const key = hashOf({
			model: "jev-latest",
			state,
			questions: { q: noul("Does the sentence exist?") },
			repetition: 0,
		});
		return join(cacheDirectory, "jev", key.slice(0, 2), `${key}.json`);
	};
	const entry = (model: string) => ({
		model,
		answers: { q: { type: "noul", noul: 0.25 } },
		usage: { input_tokens: 10, output_tokens: 0 },
		latencyMs: 1,
	});
	await writeCache(legacyPath("A sentence"), entry(pinnedJevModel));
	const counter = { calls: 0 };
	const jev = new Jev({
		cacheDirectory,
		executor: answeringAs(pinnedJevModel, counter),
	});
	expect(await ask(jev)).toEqual({ q: { type: "noul", noul: 0.25 } });
	expect(counter.calls).toBe(0);
	expect([...jev.resolvedModels]).toEqual([pinnedJevModel]);

	await writeCache(legacyPath("Another sentence"), entry("jev-1.12.0"));
	const answers = await jev.ask({
		stage: "test",
		state: "Another sentence",
		questions: { q: noul("Does the sentence exist?") },
		repetition: 0,
		calls: [],
	});
	expect(answers).toEqual({ q: { type: "noul", noul: 0.9 } });
	expect(counter.calls).toBe(1);
});

test("a repetition offset misses the cache while sending the same prompts", async () => {
	const cacheDirectory = join(directory, "offset");
	const counter = { calls: 0 };
	const set: LabSet = {
		name: "dev",
		createdAt: "",
		gitHead: "test",
		dirtyRecordFiles: 0,
		hash: "test",
		cases: [labCase],
	};
	const runWith = async (repetitionOffset: number) => {
		const jev = new Jev({
			cacheDirectory,
			executor: answeringAs(pinnedJevModel, counter),
		});
		const run = await runArm({
			runId: `offset-${repetitionOffset}`,
			arm: oracleArm,
			options: {},
			set,
			subset: "all",
			cases: [labCase],
			repetitions: 2,
			repetitionOffset,
			jev,
			concurrency: 1,
			gitHead: "test",
		});
		return { run, prompts: jev.promptHashes() };
	};
	const first = await runWith(0);
	const fresh = counter.calls;
	expect(fresh).toBeGreaterThan(0);
	await runWith(0);
	expect(counter.calls).toBe(fresh);
	const rerun = await runWith(1000);
	expect(counter.calls).toBe(2 * fresh);
	expect(rerun.prompts).toEqual(first.prompts);
	expect(rerun.run.repetitionOffset).toBe(1000);
	expect(rerun.run.modelResolved).toEqual([pinnedJevModel]);
});

/** A scored gold unit whose repetitions read `verdicts`. */
const row = (
	unit: number,
	bucket: string,
	verdicts: string,
	policy = "p",
): OutcomeRow => ({
	case: `case-${unit}`,
	unit: 0,
	bucket,
	gold: "Lexeme/NOUN",
	text: `unit ${unit}`,
	stub: false,
	policies: { [policy]: { v: verdicts } },
});

const manifestOf = (
	runId: string,
	overrides: Partial<RunManifest> = {},
): RunManifest => ({
	runId,
	kind: "run",
	createdAt: runId,
	parent: null,
	hypothesis: null,
	gitHead: "test",
	dirty: false,
	dirtyFiles: [],
	codeHash: "code",
	sourceHashes: {},
	dumspecHash: "dumspec",
	dumspec: { distHash: "", rulesHash: "", realizationsHash: "" },
	promptHashes: {},
	modelRequested: pinnedJevModel,
	modelResolved: [pinnedJevModel],
	arm: "test",
	options: {},
	primary: "p",
	set: { name: "dev", hash: "test" },
	subset: "all",
	limit: null,
	cases: 40,
	repetitions: 3,
	repetitionOffset: 0,
	...overrides,
});

test("noise floors count majority flips per bucket; a delta must beat them and McNemar", () => {
	const baseline = [
		...Array.from({ length: 30 }, (_, index) =>
			row(index, "one piece", "MMM"),
		),
		...Array.from({ length: 10 }, (_, index) =>
			row(30 + index, "Saying", index < 5 ? "MMX" : "XXX"),
		),
	];
	// Two one-piece units and one Saying flip with nothing changed.
	const rerun = baseline.map((entry, index) =>
		index === 0 || index === 1
			? row(index, "one piece", "XXM")
			: index === 30
				? row(index, "Saying", "XMX")
				: entry,
	);
	const floor = noiseFloor(baseline, rerun, "p");
	expect(floor["one piece"]).toEqual({ units: 30, flips: 2, rate: 2 / 30 });
	expect(floor.Saying).toEqual({ units: 10, flips: 1, rate: 0.1 });
	expect(floor[allBuckets]).toEqual({ units: 40, flips: 3, rate: 3 / 40 });
	expect(floorOf(0.1, 400)).toBeCloseTo(1.96 * Math.sqrt(40));

	const rate = { units: 400, flips: 40, rate: 0.1 };
	// +30 −2 on 400 units: p is tiny and 28 exceeds the floor of ~12.4.
	expect(deltaOf(400, 30, 2, rate).beyondNoise).toBe(true);
	// +12 −2: McNemar agrees (p ≈ 0.013) but 10 stays under the floor.
	const underFloor = deltaOf(400, 12, 2, rate);
	expect(underFloor.p).toBeLessThan(0.05);
	expect(underFloor.beyondNoise).toBe(false);
	// No noise run: no floor and no verdict.
	expect(deltaOf(400, 30, 2, undefined)).toMatchObject({
		floor: null,
		beyondNoise: null,
	});
});

test("compare pairs committed outcomes when the raw runs are gone, with the recorded noise floor", async () => {
	const evidenceRoot = join(directory, "evidence");
	const labRoot = join(directory, "no-raw-runs");
	const left = Array.from({ length: 40 }, (_, index) =>
		row(index, "one piece", index < 20 ? "MMM" : "XXX"),
	);
	const right = left.map((entry, index) =>
		index >= 20 && index < 35 ? row(index, "one piece", "MMX") : entry,
	);
	const rerun = left.map((entry, index) =>
		index === 0 ? row(index, "one piece", "XXX") : entry,
	);
	await writeManifest(evidenceRoot, manifestOf("a"), "");
	await writeManifest(evidenceRoot, manifestOf("b", { parent: "a" }), "");
	await writeManifest(
		evidenceRoot,
		manifestOf("a-noise", { kind: "noise", baseline: "a", parent: "a" }),
		"",
	);
	await writeOutcomes(evidenceRoot, "a", left);
	await writeOutcomes(evidenceRoot, "b", right);
	await writeOutcomes(evidenceRoot, "a-noise", rerun);
	await writeNoise(evidenceRoot, {
		baseline: "a",
		rerun: "a-noise",
		promptsMatch: true,
		floors: { p: noiseFloor(left, rerun, "p") },
	});
	expect(await readOutcomes(evidenceRoot, "b")).toEqual(right);

	const leftSide = await loadSide({ labRoot, evidenceRoot, runId: "a" });
	const rightSide = await loadSide({ labRoot, evidenceRoot, runId: "b" });
	expect(leftSide.raw).toBeUndefined();
	expect(leftSide.policy).toBe("p");
	const noise = await findNoise(evidenceRoot, leftSide, rightSide);
	expect(noise?.record.rerun).toBe("a-noise");
	const { paired, all } = await deltaBetween(
		evidenceRoot,
		leftSide,
		rightSide,
	);
	expect(paired).toMatchObject({ both: 20, neither: 5 });
	expect(all).toMatchObject({ units: 40, gained: 15, lost: 0 });
	expect(all.floor).toBeCloseTo(1.96 * Math.sqrt(1));
	expect(all.beyondNoise).toBe(true);
	expect(
		pairOutcomes(
			{ rows: left, policy: "p" },
			{ rows: right, policy: "p" },
			new Set(["case-25"]),
		).rightOnly,
	).toHaveLength(1);
	await expect(
		loadSide({ labRoot, evidenceRoot, runId: "a", relabeled: true }),
	).rejects.toThrow("raw run");
	await expect(
		loadSide({ labRoot, evidenceRoot, runId: "missing" }),
	).rejects.toThrow("no committed outcomes");
});

test("the iteration table shows each run against its parent", () => {
	const table = iterationTable([
		{
			runId: "r1",
			parent: null,
			hypothesis: null,
			unitAccuracy: 0.851,
			flips: 27,
			flipBase: 1166,
			jevInputTokensPerSentence: 11_800,
			delta: null,
			verdict: null,
		},
		{
			runId: "r2",
			parent: "r1",
			hypothesis: "Saying Choice | maxim",
			unitAccuracy: 0.86,
			flips: 20,
			flipBase: 1166,
			jevInputTokensPerSentence: 950,
			delta: deltaOf(1773, 24, 2, {
				units: 1773,
				flips: 30,
				rate: 30 / 1773,
			}),
			verdict: null,
		},
		{
			runId: "r3",
			parent: "r2",
			hypothesis: "trim Noul",
			unitAccuracy: null,
			flips: null,
			flipBase: null,
			jevInputTokensPerSentence: null,
			delta: deltaOf(968, 4, 14, undefined),
			verdict: "killed",
		},
	]);
	const lines = table.trimEnd().split("\n");
	expect(lines[0]).toBe(
		"| runId | parent | hypothesis | unit% | Δ vs parent (+a −b, p) | flips | jev input tokens/sentence | verdict |",
	);
	expect(lines[2]).toBe(
		"| `r1` | – | – | 85.1 | – | 27/1166 | 11.8k | root |",
	);
	expect(lines[3]).toBe(
		"| `r2` | `r1` | Saying Choice \\| maxim | 86.0 | +24 −2, p 1.0e-5 | 20/1166 | 950 | better beyond noise |",
	);
	expect(lines[4]).toBe(
		"| `r3` | `r2` | trim Noul | – | +4 −14, p 0.031 | – | – | killed |",
	);
	expect(
		derivedVerdict({ parent: "r2", delta: deltaOf(968, 4, 14, undefined) }),
	).toBe("p < 0.05, no noise floor");
	expect(
		derivedVerdict({
			parent: "r2",
			delta: deltaOf(968, 6, 4, {
				units: 968,
				flips: 20,
				rate: 20 / 968,
			}),
		}),
	).toBe("within noise");
});

test("the lab tracks tokens only: no USD in its code, committed evidence or doc", () => {
	const filesUnder = (path: string): string[] =>
		statSync(path).isDirectory()
			? readdirSync(path).flatMap((name) => filesUnder(join(path, name)))
			: [path];
	const code = [
		"cli/segment-in-units-lab.ts",
		"cli/segment-ownership-pilot.ts",
		...filesUnder(join(packageRoot, "src/segment-in-units")),
	].map((path) => resolve(packageRoot, path));
	const evidence = filesUnder(
		join(packageRoot, "evidence/segment-in-units-lab"),
	)
		.filter((path) => !path.endsWith(".gz"))
		.concat(
			join(packageRoot, "docs/reference/segment-in-units-jev-lab.md"),
		);
	// `usd` opening a word, `Usd` inside a camelCase name, or `USD`; not `Ausdruck`.
	const usd = /\busd|Usd|USD/u;
	const offenders = [
		...code.filter((path) => usd.test(readFileSync(path, "utf8"))),
		...evidence.filter((path) => {
			const text = readFileSync(path, "utf8");
			return usd.test(text) || /\$\d/u.test(text);
		}),
	];
	expect(offenders).toEqual([]);
});
