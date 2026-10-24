/**
 * The lab's `compare`: two runs, or two policies of runs, side by side:
 * membership, consistency, route scores, grouping, the focus units, the
 * buckets against the noise floor and the case verdicts.
 */
import { join } from "node:path";
import { compareRuns, loadRun } from "promptsmith/storage";
import { verdictCounts } from "../../lab/evaluation/verdict-counts.js";
import {
	deltaBetween,
	focusBetween,
	loadSide,
	type Side,
} from "../../lab/segmentation/harness/compare.js";
import {
	type LabCase,
	loadSet,
	setNameOf,
	subset,
} from "../../lab/segmentation/harness/corpus.js";
import { exportPolicy } from "../../lab/segmentation/harness/export.js";
import {
	type Change,
	type FocusComparison,
	focusGroupLabel,
	focusGroups,
	rateOf,
	type UnitTally,
} from "../../lab/segmentation/harness/focus.js";
import {
	appendLedger,
	type CompareEntry,
} from "../../lab/segmentation/harness/ledger.js";
import {
	breakdown,
	byPhenomenon,
	summarizePolicy,
} from "../../lab/segmentation/harness/metrics.js";
import {
	accuracyOf,
	membershipFlipsOf,
	type OutcomeRow,
	variantsOf,
} from "../../lab/segmentation/harness/outcomes.js";
import { readRounds, roundOf } from "../../lab/segmentation/harness/round.js";
import type { LabRun } from "../../lab/segmentation/harness/run.js";
import { formatP } from "../../lab/segmentation/harness/table.js";
import {
	casesOf,
	labRoot,
	ledgerPath,
	roots,
	roundBook,
	setsRoot,
	values,
} from "./context.js";
import { focusLine, groupingLegend, groupingText, percent } from "./text.js";

/** The focus block of a comparison (#761): per unit, what changed from left to right. */
function printFocusComparison(comparison: FocusComparison) {
	const { left, right, delta } = comparison;
	console.log(
		`focus units (${left.focusSet}), membership by majority, left → right; fixed: wrong → held, broken: held → wrong, stabilised: flipping → not`,
	);
	focusLine("", [
		"units",
		"  held L → R",
		" flips L → R",
		"   tol% L → R",
		"fixed",
		"broken",
		"stabilised",
		"destabilised",
		"p",
	]);
	const arrow = (a: string, b: string, width: number) =>
		`${a} → ${b}`.padStart(width);
	const line = (
		label: string,
		[l, r]: readonly [UnitTally, UnitTally],
		change: (typeof delta)["focus"],
	) =>
		focusLine(label, [
			String(change.units).padStart(5),
			arrow(String(l.held), String(r.held), 12),
			arrow(String(l.flips), String(r.flips), 12),
			arrow(
				percent(rateOf(l, "tolerant")),
				percent(rateOf(r, "tolerant")),
				14,
			),
			String(change.fixed).padStart(5),
			String(change.broken).padStart(6),
			String(change.stabilised).padStart(10),
			String(change.destabilised).padStart(12),
			formatP(change.p),
		]);
	line("focus", [left.focus, right.focus], delta.focus);
	for (const group of focusGroups)
		line(
			`  ${focusGroupLabel(group)}`,
			[left.groups[group], right.groups[group]],
			delta.groups[group],
		);
	line(
		"guardrail: other units of the focus cases",
		[left.guardrail, right.guardrail],
		delta.guardrail,
	);
	if (delta.otherCases.units > 0)
		line(
			"guardrail: units of other cases",
			[left.otherCases, right.otherCases],
			delta.otherCases,
		);
	for (const scope of ["focus", "guardrail"] as const)
		for (const change of [
			"fixed",
			"broken",
			"stabilised",
			"destabilised",
		] as const satisfies readonly Change[]) {
			const units = comparison.changed.filter(
				(unit) =>
					(scope === "focus") === (unit.scope === "focus") &&
					unit.changes.includes(change),
			);
			if (units.length > 0)
				console.log(
					`  ${scope} ${change}: ${units
						.slice(0, Number(values.limit ?? 25))
						.map(
							(unit) =>
								`${unit.text} ${unit.gold}${unit.group ? ` (${unit.group})` : ""}`,
						)
						.join(" | ")}`,
				);
		}
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
export async function compare() {
	const [leftId = "", leftPolicy] = (values.left ?? "").split(":");
	const [rightId = "", rightPolicy] = (values.right ?? "").split(":");
	if (!leftId || !rightId) throw Error("--left and --right name runs");
	const setCases = async (setName: string, setHash: string) =>
		casesOf((await loadSet(setsRoot, setNameOf(setName), setHash)).cases);
	const side = (runId: string, policy: string | undefined) =>
		loadSide({
			...roots,
			runId,
			...(policy ? { policy } : {}),
			casesOf: setCases,
			relabeled: values.relabel !== undefined,
		});
	const left = await side(leftId, leftPolicy);
	const right = await side(rightId, rightPolicy);
	for (const entry of [left, right])
		if (!entry.raw)
			console.log(
				`${entry.runId}: raw run missing; comparing its stored outcomes`,
			);
	const only = values.subset
		? new Set(
				subset(
					await loadSet(
						setsRoot,
						setNameOf(left.setName),
						left.setHash,
					),
					values.subset,
				).map(({ id }) => id),
			)
		: undefined;
	const deltaOptions = {
		...(only ? { only } : {}),
		...(values.noise ? { noiseRun: values.noise } : {}),
	};
	// ADR 0008: membership leads; the route scores follow.
	const { paired, noise, all, buckets } = await deltaBetween(
		roots,
		left,
		right,
		deltaOptions,
	);
	const floorText = (floor: number | null, beyond: boolean | null) =>
		floor === null
			? ""
			: `  floor ${floor.toFixed(1)} ${beyond ? "BEYOND NOISE" : "within noise"}`;
	console.log(
		`membership, gold units by majority over repetitions: both hold ${paired.both}, neither ${paired.neither}, left only ${all.lost}, right only ${all.gained}`,
	);
	console.log(
		`  McNemar p = ${formatP(all.p)}${floorText(all.floor, all.beyondNoise)}`,
	);
	const scopedRows = (rows: readonly OutcomeRow[]) =>
		only ? rows.filter((row) => only.has(row.case)) : rows;
	const consistency = [left, right].map((entry) =>
		membershipFlipsOf(scopedRows(entry.rows), entry.policy),
	);
	console.log(
		`consistency, units whose membership flips between repetitions: left ${consistency[0]?.flips}/${consistency[0]?.base}, right ${consistency[1]?.flips}/${consistency[1]?.base}`,
	);
	for (const measure of ["tolerant", "strict"] as const) {
		const delta = await deltaBetween(roots, left, right, {
			...deltaOptions,
			measure,
		});
		console.log(
			`${measure === "tolerant" ? "tolerant route (ADR 0008)" : "strict (route equal)"}: left ${percent(accuracyOf(scopedRows(left.rows), left.policy, measure))}%, right ${percent(accuracyOf(scopedRows(right.rows), right.policy, measure))}%; +${delta.all.gained} −${delta.all.lost}, p ${formatP(delta.all.p)}${floorText(delta.all.floor, delta.all.beyondNoise)}`,
		);
	}
	const variantText = (entry: Side) => {
		const tally = variantsOf(scopedRows(entry.rows), entry.policy);
		return `${percent(tally.withVariants / tally.units)}%${tally.withVariants > 0 ? ` (mean ${(tally.routes / tally.withVariants).toFixed(2)} routes)` : ""}`;
	};
	console.log(
		`route variants, of unit-repetitions with membership (ADR 0008): left ${variantText(left)}, right ${variantText(right)}`,
	);
	if (left.raw && right.raw)
		await compareGrouping(
			{ raw: left.raw, policy: left.policy },
			{ raw: right.raw, policy: right.policy },
			setCases,
			only,
		);
	else
		console.log(
			"grouping (#701): needs both raw runs; the stored outcomes hold no returned units",
		);
	const focus = focusBetween(left, right, only);
	if (focus) printFocusComparison(focus);
	console.log("membership by bucket:");
	console.log(
		noise
			? `noise floor from ${noise.record.rerun} (rerun of ${noise.record.baseline})${noise.record.promptsMatch ? "" : ", WHOSE PROMPTS DIFFERED"}`
			: `no noise floor; measure one with: noise --run ${left.runId}`,
	);
	for (const [bucket, delta] of Object.entries(buckets).sort(
		(a, b) => b[1].units - a[1].units,
	)) {
		const tally = paired.buckets[bucket];
		if (!tally) continue;
		console.log(
			`  ${bucket.padEnd(24)} units ${String(delta.units).padStart(4)}  left ${percent(tally.left / tally.units).padStart(5)}  right ${percent(tally.right / tally.units).padStart(5)}  +${delta.gained} −${delta.lost}  p ${formatP(delta.p)}${floorText(delta.floor, delta.beyondNoise)}`,
		);
	}
	for (const [sideName, list] of [
		["left only", paired.leftOnly],
		["right only", paired.rightOnly],
	] as const)
		console.log(
			`  ${sideName}: ${list
				.slice(0, Number(values.limit ?? 25))
				.map((entry) => entry.text)
				.join(" | ")}`,
		);
	if (left.raw && right.raw) await compareCases(left, right, only);
	if (values.record) {
		const entry: CompareEntry = {
			at: new Date().toISOString(),
			command: "compare",
			round: roundOf(await readRounds(roundBook)).id,
			left: { runId: left.runId, policy: left.policy },
			right: { runId: right.runId, policy: right.policy },
			subset: values.subset ?? null,
			noiseRun: noise?.record.rerun ?? null,
			verdict: values.verdict ?? null,
			...all,
			buckets,
			...(focus ? { focus: focus.delta } : {}),
		};
		await appendLedger(ledgerPath, entry);
		console.log("recorded in the ledger");
	}
}

/**
 * Each side's grouping (#701) and its membership by construction: the
 * phenomenon tags of multi-piece gold units, summed over repetitions.
 */
async function compareGrouping(
	left: { readonly raw: LabRun; readonly policy: string },
	right: { readonly raw: LabRun; readonly policy: string },
	casesOfSet: (
		setName: string,
		setHash: string,
	) => Promise<ReadonlyMap<string, LabCase>>,
	only: ReadonlySet<string> | undefined,
) {
	console.log(groupingLegend);
	const sides = [
		["left", left],
		["right", right],
	] as const;
	const constructions = [];
	for (const [name, side] of sides) {
		const cases = await casesOfSet(side.raw.set, side.raw.setHash);
		console.log(
			`  ${name.padEnd(5)} ${groupingText(summarizePolicy(side.raw, cases, side.policy, only))}`,
		);
		constructions.push(
			breakdown(side.raw, cases, side.policy, byPhenomenon, only),
		);
	}
	const [before = {}, after = {}] = constructions;
	console.log(
		"membership by construction, phenomenon tags past one piece (summed over repetitions): key scored left% → right%",
	);
	for (const [key, entry] of Object.entries(before)
		.filter(([key]) => !key.startsWith("one piece"))
		.sort((a, b) => b[1].scored - a[1].scored)) {
		const other = after[key];
		console.log(
			`  ${key.padEnd(40)} ${String(entry.scored).padStart(5)} ${percent(entry.membership / entry.scored).padStart(6)} → ${other ? percent(other.membership / other.scored) : "–"}`,
		);
	}
}

/** Case verdicts through promptsmith's `compareRuns`; needs both raw runs. */
async function compareCases(
	left: Awaited<ReturnType<typeof loadSide>>,
	right: Awaited<ReturnType<typeof loadSide>>,
	only: ReadonlySet<string> | undefined,
) {
	const directory = join(labRoot, "promptsmith");
	const exported = [];
	for (const entry of [left, right]) {
		if (!entry.raw) return;
		const set = await loadSet(
			setsRoot,
			setNameOf(entry.raw.set),
			entry.raw.setHash,
		);
		const cases = new Map(
			[...casesOf(set.cases)].filter(([id]) => !only || only.has(id)),
		);
		const evaluation = await exportPolicy({
			run: entry.raw,
			cases,
			policy: entry.policy,
			directory,
		});
		exported.push(await loadRun(directory, evaluation.manifest.runId));
	}
	const [leftRun, rightRun] = exported;
	if (!leftRun || !rightRun) return;
	const comparison = compareRuns(leftRun, rightRun);
	const verdicts = comparison.cases.filter((entry) => entry.verdictChanged);
	for (const side of ["left", "right"] as const)
		console.log(
			`${side}: ${Object.entries(verdictCounts(comparison, side))
				.map(([verdict, count]) => `${verdict} ${count}`)
				.join(" ")}`,
		);
	console.log(
		`same corpus: ${comparison.sameCorpus}; changed verdicts ${verdicts.length}; changed outputs ${comparison.changedOutputs.length}`,
	);
	const cases = casesOf(
		(await loadSet(setsRoot, setNameOf(left.setName), left.setHash)).cases,
	);
	for (const entry of verdicts.slice(0, Number(values.limit ?? 40))) {
		const labCase = cases.get(entry.caseId);
		const text =
			labCase?.input.segments.map(({ text }) => text).join("") ?? "";
		console.log(
			`  ${entry.verdict.left} → ${entry.verdict.right}  ${entry.caseId}\n      ${text.slice(0, 160)}`,
		);
	}
}
