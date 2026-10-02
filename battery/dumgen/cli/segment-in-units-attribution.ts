/**
 * Attributes the candidate reference's membership failures from cached
 * traces (#755). Replays the reference behind the lab's stages offline,
 * checks the replay reproduces the cached run exactly, and writes, per
 * bucket, why each wrong or flipping gold unit went wrong.
 *
 *   bun run segment-in-units-attribution --run <runId> [--subset all|multiword400]
 *       [--floors run|reference] [--disputed ud-drafts|none]
 *
 * The run's own set is read. `--floors` names the floors the run was made
 * under: the reference run's (#755) or the adopted ones (#762).
 * `--disputed none` counts no record as in review, as since #739 closed.
 * Cases whose run failed a repetition, a cache miss in an offline run, are
 * left out and listed.
 *
 * Reads the frozen sets, the raw run and the answer cache under
 * `.runs/segment-in-units-lab/`; writes the report under
 * `evidence/segment-in-units-attribution/`. Makes no fresh jev call: a
 * cache miss fails the replay.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
	floorsKey,
	floorsOf,
	referenceStagesUnder,
} from "../src/segment-in-units/de/arms/reference.js";
import {
	attributeUnit,
	type Bucket,
	buckets,
	type Cause,
	causes,
	type UnitAttribution,
} from "../src/segment-in-units/lab/attribution.js";
import {
	type LabCase,
	loadSet,
	type SetName,
	subset,
} from "../src/segment-in-units/lab/corpus.js";
import { type CallRecord, Jev } from "../src/segment-in-units/lab/jev.js";
import { loadLabRun } from "../src/segment-in-units/lab/run.js";
import {
	runStages,
	type StageTrace,
} from "../src/segment-in-units/lab/stages.js";

const packageRoot = resolve(import.meta.dir, "..");
const labRoot = join(packageRoot, ".runs", "segment-in-units-lab");
const evidenceRoot = join(
	packageRoot,
	"evidence",
	"segment-in-units-attribution",
);
const manifestPath = join(
	packageRoot,
	"..",
	"dumspec",
	"ud-drafts",
	"manifest.json",
);

const { values } = parseArgs({
	args: Bun.argv.slice(2),
	options: {
		run: { type: "string" },
		subset: { type: "string", default: "all" },
		floors: { type: "string", default: "run" },
		disputed: { type: "string", default: "ud-drafts" },
		concurrency: { type: "string", default: "12" },
	},
});

/** Records drafted from a UD parse whose gold is still in review (#739). */
async function disputedRecords(): Promise<Set<string>> {
	if (values.disputed === "none") return new Set();
	if (values.disputed !== "ud-drafts")
		throw Error("--disputed must be ud-drafts or none");
	const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
		texts: Record<string, { paragraphs: { sentences: string[] }[] }>;
	};
	return new Set(
		Object.values(manifest.texts).flatMap((text) =>
			text.paragraphs.flatMap((paragraph) => paragraph.sentences),
		),
	);
}

const runId = values.run;
if (!runId) throw Error("--run <runId> is required");
const original = await loadLabRun(labRoot, runId);
const set = await loadSet(labRoot, original.set as SetName, original.setHash);
const floors = floorsOf({ floors: values.floors ?? "run" });
const policy = floorsKey(floors);
const stages = referenceStagesUnder(floors);
const recorded = new Map(original.cases.map((entry) => [entry.id, entry]));
const failed = (labCase: LabCase) =>
	recorded
		.get(labCase.id)
		?.repetitions.some((repetition) => repetition.error !== undefined) ??
	false;
const uncovered = subset(set, values.subset).filter(failed);
const cases = subset(set, values.subset).filter((labCase) => !failed(labCase));
const disputed = await disputedRecords();
const jev = new Jev({
	cacheDirectory: join(labRoot, "cache"),
	concurrency: Number(values.concurrency),
	offline: true,
});
const stringify = (value: unknown) => JSON.stringify(value);
let reproduced = 0;
const mismatches: string[] = [];
const freshCalls: CallRecord[] = [];

const traced = await Promise.all(
	cases.map(async (labCase) => {
		const run = recorded.get(labCase.id);
		if (!run) throw Error(`${runId} has no case ${labCase.id}`);
		const traces: StageTrace[] = [];
		for (
			let repetition = 0;
			repetition < original.repetitions;
			repetition++
		) {
			const calls: CallRecord[] = [];
			const { output, trace } = await runStages(stages, labCase.input, {
				jev,
				repetition,
				calls,
				options: {},
			});
			freshCalls.push(...calls.filter((call) => !call.cached));
			const cached = run.repetitions[repetition]?.outputs?.[policy];
			if (stringify(output) === stringify(cached)) reproduced++;
			else mismatches.push(`${labCase.id}#${repetition}`);
			traces.push(trace);
		}
		return { labCase, traces };
	}),
);

const units: UnitAttribution[] = traced.flatMap(({ labCase, traces }) =>
	labCase.idealOutput.units.flatMap((_, unit) => {
		const attribution = attributeUnit({
			labCase,
			unit,
			traces,
			disputedGold: disputed.has(labCase.record),
		});
		return attribution ? [attribution] : [];
	}),
);
const attributed = units.filter((unit) => unit.wrongByMajority || unit.flips);

type Row = {
	readonly bucket: Bucket | "all";
	readonly units: number;
	readonly wrong: number;
	readonly flipping: number;
	readonly causes: Readonly<Record<Cause, number>>;
	readonly disputedGold: number;
	readonly headroom: number;
};

function rowOf(bucket: Bucket | "all", of: readonly UnitAttribution[]): Row {
	const mine = attributed.filter((unit) => of.includes(unit));
	const reviewed = mine.filter((unit) => !unit.disputedGold);
	return {
		bucket,
		units: of.length,
		wrong: of.filter((unit) => unit.wrongByMajority).length,
		flipping: of.filter((unit) => unit.flips).length,
		causes: Object.fromEntries(
			causes.map((cause) => [
				cause,
				reviewed.filter((unit) => unit.cause === cause).length,
			]),
		) as Record<Cause, number>,
		disputedGold: mine.length - reviewed.length,
		headroom: reviewed.filter(
			(unit) => unit.nominated && unit.cause !== "not nominated",
		).length,
	};
}

const rows = [
	...buckets.map((bucket) =>
		rowOf(
			bucket,
			units.filter((unit) => unit.bucket === bucket),
		),
	),
	rowOf("all", units),
];

const pieceText = (unit: UnitAttribution, groups: StageTrace["final"]) => {
	const labCase = cases.find((entry) => entry.id === unit.caseId);
	const resolvable =
		labCase?.input.segments.filter(
			({ kind }) => kind === "ResolvableText",
		) ?? [];
	return groups
		.map(
			(group) =>
				`[${group.map((id) => resolvable[id - 1]?.text ?? "?").join(" ")}]`,
		)
		.join(" ");
};

const examples = Object.fromEntries(
	causes.map((cause) => [
		cause,
		attributed
			.filter((unit) => !unit.disputedGold && unit.cause === cause)
			.slice(0, 6)
			.map((unit) => {
				const wrong = unit.repetitions.find(
					(repetition) => !repetition.correct,
				);
				return `${unit.bucket}: gold [${unit.text}] → ${wrong ? pieceText(unit, wrong.groups) : "?"} (${unit.caseId})`;
			}),
	]),
);

/**
 * How near the rejected units' judgments came: per unit, the highest
 * unsupported share or Noul inside it over its wrong repetitions.
 */
const nearBands = [
	{ label: "under 0.1", below: 0.1 },
	{ label: "0.1 to 0.3", below: 0.3 },
	{ label: "0.3 to 0.5", below: 0.5 },
	{ label: "0.5 and over", below: Number.POSITIVE_INFINITY },
] as const;
const rejected = attributed.filter(
	(unit) => !unit.disputedGold && unit.cause === "rejected",
);
const nearestOf = (unit: UnitAttribution) =>
	Math.max(
		0,
		...unit.repetitions.map((repetition) => repetition.nearest ?? 0),
	);
const nearTable = [
	`| Bucket | ${nearBands.map((band) => band.label).join(" | ")} |`,
	`|---|${"---|".repeat(nearBands.length)}`,
	...[...buckets, "all" as const].map((bucket) => {
		const mine = rejected.filter(
			(unit) => bucket === "all" || unit.bucket === bucket,
		);
		return `| ${bucket} | ${nearBands
			.map(
				(band, index) =>
					mine.filter(
						(unit) =>
							nearestOf(unit) < band.below &&
							nearestOf(unit) >=
								(nearBands[index - 1]?.below ?? 0),
					).length,
			)
			.join(" | ")} |`;
	}),
].join("\n");

const table = [
	`| Bucket | Gold units | Wrong by majority | Flipping | ${causes.join(" | ")} | Disputed gold (#739) | Headroom for #754 |`,
	`|---|${"---|".repeat(6 + causes.length)}`,
	...rows.map(
		(row) =>
			`| ${row.bucket} | ${row.units} | ${row.wrong} | ${row.flipping} | ${causes
				.map((cause) => row.causes[cause])
				.join(" | ")} | ${row.disputedGold} | ${row.headroom} |`,
	),
].join("\n");

const report = [
	`# Membership attribution: ${runId}, ${set.name} ${values.subset}`,
	"",
	`Reference policy \`${policy}\` replayed behind the lab's stages: ${reproduced} of ${reproduced + mismatches.length} case-repetitions reproduce the cached outputs exactly, with ${freshCalls.length} fresh jev calls (model ${[...jev.resolvedModels].sort().join(", ")}).${uncovered.length > 0 ? ` ${uncovered.length} cases whose run failed a repetition are left out.` : ""}`,
	"",
	"Units counted under a cause are the wrong-by-majority or flipping ones outside the records in review (#739); those are counted apart, not relabelled. Headroom counts those whose exact gold arrangement was nominated and that failed later, in judgment or assembly.",
	"",
	table,
	"",
	"## How near the rejected judgments came",
	"",
	"Per rejected unit, the highest share or Noul among the unsupported judged connections inside it, over its wrong repetitions. The floors are 0.5 to 0.7.",
	"",
	nearTable,
	"",
	"## Examples",
	"",
	...causes.flatMap((cause) => [
		`### ${cause}`,
		"",
		...(examples[cause]?.length
			? (examples[cause] ?? []).map((line) => `- ${line}`)
			: ["- none"]),
		"",
	]),
].join("\n");

await mkdir(evidenceRoot, { recursive: true });
const base = join(evidenceRoot, `${runId}--${set.name}--${values.subset}`);
await writeFile(`${base}.md`, `${report}\n`);
await writeFile(
	`${base}.json`,
	`${JSON.stringify(
		{
			runId,
			set: { name: set.name, hash: set.hash },
			subset: values.subset,
			policy,
			reproduced,
			mismatches,
			...(uncovered.length > 0
				? { uncovered: uncovered.map(({ id }) => id) }
				: {}),
			freshCalls: freshCalls.length,
			rows,
			units: attributed.map(({ repetitions, ...unit }) => ({
				...unit,
				repetitions: repetitions.map(
					({ correct, cause, split, enlarged, nearest }) => ({
						correct,
						split,
						enlarged,
						...(cause ? { cause } : {}),
						...(nearest === undefined ? {} : { nearest }),
					}),
				),
			})),
		},
		null,
		"\t",
	)}\n`,
);
console.log(report);
if (mismatches.length > 0 || freshCalls.length > 0) process.exitCode = 1;
