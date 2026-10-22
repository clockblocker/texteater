/**
 * The lab's `report`: one run's scores, grouping, cost, breakdowns and
 * calibration, written as its summary.
 */
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import {
	focusOf,
	loadSet,
	setNameOf,
	subset,
} from "../../lab/segmentation/harness/corpus.js";
import {
	readManifest,
	summaryPath,
	writeSummary,
} from "../../lab/segmentation/harness/evidence.js";
import {
	type FocusScore,
	focusGroupLabel,
	focusGroups,
	rateOf,
	scoreFocus,
	type UnitTally,
} from "../../lab/segmentation/harness/focus.js";
import {
	breakdown,
	byGoldRoute,
	byPhenomenon,
	byRule,
	byShape,
	calibration,
	confusions,
	groupingExamples,
	policiesOf,
	primaryOf,
	summarizeCost,
	summarizePolicy,
} from "../../lab/segmentation/harness/metrics.js";
import {
	outcomesOf,
	pickScore,
} from "../../lab/segmentation/harness/outcomes.js";
import { rerouted } from "../../lab/segmentation/harness/ruling734.js";
import { loadLabRun } from "../../lab/segmentation/harness/run.js";
import { casesOf, evidenceRoot, labRoot, setsRoot, values } from "./context.js";
import {
	exampleLine,
	focusLine,
	groupingLegend,
	groupingText,
	hoverText,
	percent,
} from "./text.js";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
export async function report(runId: string) {
	const labRun = await loadLabRun(labRoot, runId);
	const set = await loadSet(setsRoot, setNameOf(labRun.set), labRun.setHash);
	const cases = casesOf(set.cases);
	if (values.relabel === "734")
		console.log(
			`read against the #734 ruling: ${rerouted(set.cases)} one-piece gold units re-routed`,
		);
	const only =
		values.subset && values.run
			? new Set(subset(set, values.subset).map(({ id }) => id))
			: undefined;
	const policies = policiesOf(labRun);
	const primary = values.policy ?? primaryOf(labRun);
	const rows = policies.map((policy) =>
		summarizePolicy(labRun, cases, policy, only),
	);
	const cost = summarizeCost(labRun, only);
	console.log(
		`\n${runId} (${rows[0]?.cases ?? 0} cases × ${labRun.repetitions}, set ${labRun.set}@${labRun.setHash})`,
	);
	// ADR 0008: membership first, then its consistency, then the route.
	console.log(
		`${"policy".padEnd(30)}   mem% ${"hover P/R/F1".padStart(14)} multiMem% singleMem%  memFlips   tol% route|mem tol%  strict% route|mem%   var%     k   case%     full% caseFlips varying  M/A/R/S/Mi/Stub  split/merged/crossed  mem% by rep`,
	);
	for (const row of rows) {
		const { rates, tally } = row;
		console.log(
			[
				row.policy.padEnd(30),
				percent(rates.membership).padStart(6),
				hoverText(
					rates.hoverPrecision,
					rates.hoverRecall,
					rates.hoverF1,
				).padStart(14),
				percent(rates.multiMembership).padStart(9),
				percent(rates.singleMembership).padStart(10),
				`${row.membershipFlips}/${row.membershipFlipBase}`.padStart(9),
				percent(rates.tolerantUnitAccuracy).padStart(6),
				percent(rates.tolerantRouteGivenMembership).padStart(13),
				percent(rates.unitAccuracy).padStart(8),
				percent(rates.routeGivenMembership).padStart(10),
				percent(rates.variantRate).padStart(6),
				(Number.isNaN(rates.meanVariants)
					? "–"
					: rates.meanVariants.toFixed(2)
				).padStart(5),
				percent(rates.casePass).padStart(7),
				`${percent(rates.fullPass)}(${tally.fullCases / row.repetitions})`.padStart(
					9,
				),
				`${row.flips}/${row.flipBase}`.padStart(9),
				String(row.varyingOutputs).padStart(7),
				` ${tally.match}/${tally.toleratedRoute}/${tally.wrongRoute - tally.toleratedRoute}/${tally.wrongSegments}/${tally.missing}/${tally.stub}`.padEnd(
					17,
				),
				`${tally.split}/${tally.merged}/${tally.crossed}`.padEnd(21),
				row.membershipByRepetition.map(percent).join(" "),
			].join(" "),
		);
	}
	console.log(
		"mem%: gold Segment set exact, any route; hover P/R/F1: B-cubed of what hovering each Segment of a scored gold unit highlights (grouping below); memFlips: units whose membership differs between repetitions; tol%: membership with an acceptable route, the same, a tolerated confusion or the gold among the variants (ADR 0008); strict%: same route too, a borderline unit's first; var%: units with membership that carry route variants, k their mean count; case%: contract (membership) passes",
	);
	console.log(groupingLegend);
	for (const row of rows)
		console.log(`  ${row.policy.padEnd(30)} ${groupingText(row)}`);
	const examples = groupingExamples(labRun, cases, primary, only);
	const merges = {
		over: examples
			.filter((example) => example.kind === "over")
			.map(exampleLine),
		under: examples
			.filter((example) => example.kind === "under")
			.map(exampleLine),
	};
	for (const kind of ["over", "under"] as const) {
		const lines = merges[kind];
		const shown = Math.min(lines.length, Number(values.limit ?? 12));
		console.log(
			`${kind}-merges (${primary}): ${lines.length} distinct, first ${shown}; repetitions in brackets`,
		);
		for (const line of lines.slice(0, shown)) console.log(`  ${line}`);
	}
	const outcomeRows = outcomesOf(labRun, cases);
	// The click-time pick (#760), on the units that carried variants.
	const pickCalls = labRun.cases
		.filter((caseRun) => !only || only.has(caseRun.id))
		.flatMap((caseRun) => caseRun.repetitions)
		.map((repetition) =>
			repetition.calls
				.filter((call) => call.stage === "pick")
				.reduce((total, call) => total + call.inputTokens, 0),
		);
	const picks = policies
		.filter(
			(policy) =>
				policy.endsWith("+pick") &&
				policies.includes(policy.slice(0, -"+pick".length)),
		)
		.map((policy) => {
			const scope = only
				? outcomeRows.filter((row) => only.has(row.case))
				: outcomeRows;
			const score = pickScore(
				scope,
				policy.slice(0, -"+pick".length),
				policy,
			);
			console.log(
				`pick (${policy}): ${score.units} unit-repetitions carried variants; gold among them ${percent(score.among / score.units)}%, picked exactly ${percent(score.strict / score.units)}%, picked acceptably ${percent(score.tolerant / score.units)}%; pick input ${(pickCalls.reduce((total, tokens) => total + tokens, 0) / Math.max(1, pickCalls.length)).toFixed(0)} jev tokens/sentence`,
			);
			return { policy, ...score };
		});
	const focus = focusOf({ name: labRun.set, hash: labRun.setHash });
	const focusScore = focus
		? scoreFocus(outcomeRows, primary, focus, only)
		: undefined;
	if (focusScore) printFocusScore(focusScore);
	console.log(
		`cost: ${cost.jevInputTokensPerSentence.toFixed(0)} jev input tokens/sentence, ${cost.jevCallsPerSentence.toFixed(2)} calls, ${cost.jevQuestionsPerSentence.toFixed(1)} questions; luna ${cost.lunaCallsPerSentence.toFixed(2)} calls ${cost.lunaInputTokensPerSentence.toFixed(0)}/${cost.lunaOutputTokensPerSentence.toFixed(0)} tokens; latency p50 ${cost.latencyP50.toFixed(0)} ms p95 ${cost.latencyP95.toFixed(0)} ms; ${cost.errors} errors`,
	);
	const routeBreakdown = breakdown(labRun, cases, primary, byGoldRoute, only);
	const shapeBreakdown = breakdown(labRun, cases, primary, byShape, only);
	const ruleBreakdown = breakdown(labRun, cases, primary, byRule, only);
	const phenomenonBreakdown = breakdown(
		labRun,
		cases,
		primary,
		byPhenomenon,
		only,
	);
	const show = (
		title: string,
		table: ReturnType<typeof breakdown>,
		minimum = 1,
	) => {
		console.log(`${title} (${primary}): key scored mem% tol% strict%`);
		for (const [key, entry] of Object.entries(table)
			.filter(([, entry]) => entry.scored >= minimum)
			.sort((a, b) => b[1].scored - a[1].scored))
			console.log(
				`  ${key.padEnd(48)} ${String(entry.scored).padStart(5)} ${percent(entry.membership / entry.scored).padStart(6)} ${percent(entry.tolerant / entry.scored).padStart(6)} ${percent(entry.match / entry.scored).padStart(6)}`,
			);
	};
	show("by gold route", routeBreakdown);
	show("by unit shape", shapeBreakdown);
	show("by cited Rule", ruleBreakdown, 9);
	show("by phenomenon", phenomenonBreakdown, 3);
	const confused = [...confusions(labRun, cases, primary, only)].sort(
		(a, b) => b[1].count - a[1].count,
	);
	const routeErrors = confused.reduce(
		(total, [, entry]) => total + entry.count,
		0,
	);
	const byPair = new Map<string, number>();
	for (const [, entry] of confused)
		if (entry.tolerated)
			byPair.set(
				entry.tolerated,
				(byPair.get(entry.tolerated) ?? 0) + entry.count,
			);
	const tolerated = [...byPair.values()].reduce(
		(total, count) => total + count,
		0,
	);
	console.log(
		`route errors given membership (${primary}, summed over reps): ${routeErrors}, tolerated ${tolerated} (${[
			...byPair,
		]
			.map(([pair, count]) => `${pair} ${count}`)
			.join(", ")})`,
	);
	console.log(
		`route confusions, ~ marks a tolerated pair: ${confused
			.slice(0, 18)
			.map(
				([key, entry]) =>
					`${entry.tolerated ? "~" : ""}${key} ${entry.count}`,
			)
			.join("; ")}`,
	);
	const calibrated = calibration(labRun, cases, only);
	const bins = (title: string, table: typeof calibrated.routes) =>
		console.log(
			`${title}: ${table.bins
				.filter((bin) => bin.count > 0)
				.map(
					(bin) =>
						`[${bin.from.toFixed(2)},${bin.to.toFixed(2)}) ${bin.correct}/${bin.count}=${percent(bin.correct / bin.count)}`,
				)
				.join("  ")}`,
		);
	bins("route confidence vs correct", calibrated.routes);
	console.log(
		`route risk-coverage (floor kept% acc%): ${calibrated.routes.riskCoverage.map((point) => `${point.floor} ${percent(point.kept)} ${percent(point.accuracy)}`).join(" | ")}`,
	);
	if (calibrated.linkCount > 0)
		bins(
			`link probability vs truly linked (${calibrated.linkCount})`,
			calibrated.links,
		);
	const variant = [
		values.subset && values.run ? values.subset : "",
		values.relabel ? `relabel-${values.relabel}` : "",
	]
		.filter(Boolean)
		.join("--");
	const summary = {
		runId,
		arm: labRun.arm,
		options: labRun.options,
		set: labRun.set,
		setHash: labRun.setHash,
		setGitHead: labRun.setGitHead,
		subset: values.subset && values.run ? values.subset : labRun.subset,
		gitHead: labRun.gitHead,
		repetitions: labRun.repetitions,
		model: labRun.model,
		primary,
		policies: rows,
		...(picks.length > 0 ? { picks } : {}),
		...(focusScore ? { focus: focusScore } : {}),
		cost,
		routeErrors: {
			policy: primary,
			total: routeErrors,
			tolerated,
			byPair: Object.fromEntries(byPair),
			confusions: Object.fromEntries(confused),
		},
		grouping: { policy: primary, ...merges },
		breakdowns: {
			phenomenon: phenomenonBreakdown,
			route: routeBreakdown,
			shape: shapeBreakdown,
			rule: ruleBreakdown,
		},
		calibration: calibrated,
	};
	if (await readManifest(evidenceRoot, runId))
		await writeSummary(summaryPath(evidenceRoot, runId, variant), summary);
	else {
		// A run made before manifests keeps its summary beside the historical ones.
		await mkdir(join(evidenceRoot, "summaries"), { recursive: true });
		await writeSummary(
			join(
				evidenceRoot,
				"summaries",
				`${runId}${variant ? `--${variant}` : ""}.json`,
			),
			summary,
		);
	}
}

/** The focus block of a report (#761): the focus units, by #755 cause, and the guardrail. */
function printFocusScore(score: FocusScore) {
	console.log(
		`focus units (${score.focusSet}, ${score.policy}): held and wrong by majority, membership flips; mem% and tol% summed over repetitions`,
	);
	focusLine("", ["units", " held", "wrong", "flips", "  mem%", "  tol%"]);
	const line = (label: string, tally: UnitTally) =>
		focusLine(label, [
			String(tally.units).padStart(5),
			String(tally.held).padStart(5),
			String(tally.units - tally.held).padStart(5),
			String(tally.flips).padStart(5),
			percent(rateOf(tally, "membership")).padStart(6),
			percent(rateOf(tally, "tolerant")).padStart(6),
		]);
	line("focus", score.focus);
	for (const group of focusGroups)
		line(`  ${focusGroupLabel(group)}`, score.groups[group]);
	line("guardrail: other units of the focus cases", score.guardrail);
	if (score.otherCases.units > 0)
		line("guardrail: units of other cases", score.otherCases);
}
