/**
 * Intake lab: one sentence in, every clickable thing out.
 *
 * Runs a factorial over the three axes in `designs.ts` so each decision is
 * measured on its own and the winners recombine. A run is scored against the
 * existing target-classification gold cases by probing the sentence analysis
 * at each gold click, so no new corpus is needed to compare designs.
 *
 *   zsh -ic 'export TYPESAFE_API_KEY=$TYPESAFE_TOKEN; bun prototypes/intake/lab.ts --grouping link,head --route flat'
 *   zsh -ic 'export TYPESAFE_API_KEY=$TYPESAFE_TOKEN; bun prototypes/intake/lab.ts --grouping pairwise --route hier --depth lattice --sweep'
 *   zsh -ic 'export TYPESAFE_API_KEY=$TYPESAFE_TOKEN; bun prototypes/intake/lab.ts --grouping anchored --runs 2'
 *
 * Flags: --grouping link|head|pairwise|anchored (comma separated)
 *        --route flat|extended|hier (comma separated)
 *        --depth top|lattice   --scope eval|all   --threshold 0.5
 *        --runs N              --sweep            --concurrency N
 *        --limit N (first N sentences, for a cheap smoke run)
 *        --route-policy perOccurrence|groupVote|groupHead (comma separated)
 *        --from /tmp/intake-<design>.json (re-score stored answers, no calls)
 */
import type { Questions } from "promptsmith/typesafe";
import { ask, type Call, save } from "../harness.js";
import {
	type Analysis,
	loadSentences,
	report,
	type Sentence,
	type Unit,
} from "./corpus.js";
import {
	assemble,
	groupings,
	latticeQuestions,
	type RoutePolicy,
	routings,
	sentenceState,
	solveLattice,
} from "./designs.js";
import { morphemeKinds, routeReachability } from "./inventory.js";

const argv = process.argv.slice(2);
function flag(name: string, fallback: string): string {
	const index = argv.indexOf(`--${name}`);
	return index >= 0 ? (argv[index + 1] ?? fallback) : fallback;
}
const has = (name: string) => argv.includes(`--${name}`);

const scope = flag("scope", "eval");
const depth = flag("depth", "top");
const threshold = Number(flag("threshold", "0.5"));
const runs = Number(flag("runs", "1"));
const concurrency = Number(flag("concurrency", "6"));
const groupingIds = flag("grouping", "link").split(",");
const routeIds = flag("route", "flat").split(",");
const routePolicies = flag("route-policy", "perOccurrence").split(
	",",
) as RoutePolicy[];
/** Re-score a finished run from its stored answers, without calling jev. */
const replay = flag("from", "");
const sweepThresholds = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8];

/** Questions per call. The budget is ~32k tokens shared by state and questions. */
const maxQuestionsPerCall = 220;

function chunk(questions: Questions): Questions[] {
	const entries = Object.entries(questions);
	if (entries.length <= maxQuestionsPerCall) return [questions];
	const parts: Questions[] = [];
	for (let start = 0; start < entries.length; start += maxQuestionsPerCall)
		parts.push(
			Object.fromEntries(
				entries.slice(start, start + maxQuestionsPerCall),
			),
		);
	return parts;
}

type Raw = { answers: Record<string, unknown>; calls: Call[] };

async function askSentence(
	sentence: Sentence,
	questions: Questions,
	route: string,
): Promise<Raw> {
	const calls: Call[] = [];
	const state = sentenceState(sentence);
	const parts = chunk(questions);
	const results = await Promise.all(
		parts.map((part) => ask(calls, route, state, part)),
	);
	const answers: Record<string, unknown> = {};
	for (const result of results) Object.assign(answers, result.answers);
	return { answers, calls };
}

function solve(
	sentence: Sentence,
	raw: Raw,
	groupingId: string,
	routeId: string,
	tau: number,
	policy: RoutePolicy,
): Analysis {
	const grouping = groupings[groupingId]!;
	const routing = routings[routeId]!;
	const groups = grouping.solve(sentence, raw.answers, tau);
	const units = assemble(
		sentence,
		groups,
		routing,
		raw.answers,
		policy,
		true,
	);
	if (depth !== "lattice") return { units, calls: raw.calls };
	const lattice = solveLattice(sentence, raw.answers, units);
	return {
		units,
		sub: lattice.sub,
		calls: raw.calls,
		note: { morphemes: Object.fromEntries(lattice.morphemes) },
	};
}

async function runDesign(
	groupingId: string,
	routeId: string,
	policy: RoutePolicy,
	run: number,
) {
	const grouping = groupings[groupingId];
	const routing = routings[routeId];
	if (!grouping || !routing)
		throw Error(`Unknown design ${groupingId}/${routeId}`);
	const limit = Number(flag("limit", "0"));
	const sentences = limit
		? loadSentences(scope).slice(0, limit)
		: loadSentences(scope);
	const name = `${groupingId}+${routeId}+${policy}+${depth}${runs > 1 ? ` run${run}` : ""}`;
	console.error(`\n=== ${name}: ${sentences.length} sentences (${scope})`);

	const raws = new Array<Raw | null>(sentences.length).fill(null);
	if (replay) {
		const stored = (await Bun.file(replay).json()) as {
			answers: { id: string; answers: Record<string, unknown> | null }[];
		};
		const byId = new Map(
			stored.answers.map((row) => [row.id, row.answers]),
		);
		for (const [position, sentence] of sentences.entries()) {
			const answers = byId.get(sentence.id);
			if (answers) raws[position] = { answers, calls: [] };
		}
		console.error(`  replayed ${raws.filter(Boolean).length} sentences`);
	}
	let next = 0;
	let done = 0;
	async function worker() {
		while (next < sentences.length && !replay) {
			const position = next++;
			const sentence = sentences[position]!;
			const questions: Questions = {
				...grouping!.questions(sentence),
				...routing!.questions(sentence),
				...(depth === "lattice" ? latticeQuestions(sentence) : {}),
			};
			try {
				raws[position] = await askSentence(sentence, questions, name);
			} catch (error) {
				console.error(
					`  ! ${sentence.id}: ${String(error).slice(0, 160)}`,
				);
			}
			if (++done % 10 === 0)
				console.error(`  ${done}/${sentences.length}`);
		}
	}
	await Promise.all(Array.from({ length: concurrency }, worker));

	const pairs = sentences.map((sentence, position) => ({
		sentence,
		analysis: raws[position]
			? solve(
					sentence,
					raws[position]!,
					groupingId,
					routeId,
					threshold,
					policy,
				)
			: null,
	}));
	const observed = [
		...new Set(
			pairs.flatMap(({ analysis }) =>
				analysis
					? [...analysis.units.values()].flatMap((unit: Unit) =>
							"decision" in unit
								? []
								: [`${unit.family}/${unit.kind}`],
						)
					: [],
			),
		),
	];
	const extra: Record<string, unknown> = {
		observedRoutes: observed.length,
		grouping: grouping.summary,
		routing: routing.summary,
		routePolicy: policy,
		threshold: grouping.thresholded ? threshold : null,
		reachability: routeReachability([
			...routing.offers,
			...(depth === "lattice"
				? Object.keys(morphemeKinds).map((kind) => `Morpheme/${kind}`)
				: []),
		]),
	};
	if (has("sweep") && grouping.thresholded)
		extra.thresholdSweep = Object.fromEntries(
			sweepThresholds.map((tau) => {
				const swept = sentences.map((sentence, position) => ({
					sentence,
					analysis: raws[position]
						? solve(
								sentence,
								raws[position]!,
								groupingId,
								routeId,
								tau,
								policy,
							)
						: null,
				}));
				const { summary } = report(name, swept);
				return [
					tau,
					{
						passed: summary.passed,
						membersCorrect: summary.membersCorrect,
						coverage: summary.occurrenceCoverage,
					},
				];
			}),
		);

	const result = report(name, pairs, extra);
	console.log(JSON.stringify(result.summary, null, 2));
	if (replay)
		return {
			...result,
			summary: { ...result.summary, replayedFrom: replay },
		};
	await save(`/tmp/intake-${groupingId}-${routeId}-${depth}-${run}.json`, {
		summary: result.summary,
		scores: result.scores,
		answers: sentences.map((sentence, position) => ({
			id: sentence.id,
			answers: raws[position]?.answers ?? null,
		})),
	});
	return result;
}

const table: Record<string, number[]> = {};
for (const groupingId of groupingIds)
	for (const routeId of routeIds)
		for (const policy of routePolicies) {
			const passes: number[] = [];
			let previous: Set<string> | null = null;
			for (let run = 1; run <= runs; run += 1) {
				const result = await runDesign(
					groupingId,
					routeId,
					policy,
					run,
				);
				passes.push(result.summary.passed);
				const passing = new Set(
					result.scores
						.filter((score) => score.pass)
						.map((score) => score.id),
				);
				if (previous) {
					const flipped = [
						...new Set([...previous, ...passing]),
					].filter((id) => previous!.has(id) !== passing.has(id));
					console.log(
						JSON.stringify({
							design: `${groupingId}+${routeId}+${policy}`,
							runToRunFlips: flipped.length,
						}),
					);
				}
				previous = passing;
			}
			table[`${groupingId}+${routeId}+${policy}+${depth}`] = passes;
		}
console.log(JSON.stringify({ passesByDesign: table }, null, 2));
