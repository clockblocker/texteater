/**
 * Intake lab: one sentence in, every clickable thing out.
 *
 * Runs a factorial over the three axes in `designs.ts` so each decision is
 * measured on its own and the winners recombine. A run is scored against the
 * existing target-classification gold cases by probing the sentence analysis
 * at each gold click, so no new corpus is needed to compare designs.
 *
 * Two more axes ride the same call: `--identity` selects closed-class
 * identities from authored candidates (`identity.ts`) and `--roles` names
 * each member's role and projects the lexical shape (`roles.ts`). They are
 * scored against the lemma gold (`--corpus lemma`) and the verb and noun gold
 * (`--corpus grammar`), which `gold.ts` turns into sentences the same way.
 * `--shape questions` moves the rules out of state and into the questions
 * (`shapes.ts`).
 *
 *   zsh -ic 'export TYPESAFE_API_KEY=$TYPESAFE_TOKEN; bun prototypes/intake/lab.ts --grouping link,head --route flat'
 *   zsh -ic 'export TYPESAFE_API_KEY=$TYPESAFE_TOKEN; bun prototypes/intake/lab.ts --grouping pairwise --route hier --depth lattice --sweep'
 *   zsh -ic 'export TYPESAFE_API_KEY=$TYPESAFE_TOKEN; bun prototypes/intake/lab.ts --grouping anchored --runs 2'
 *   zsh -ic 'export TYPESAFE_API_KEY=$TYPESAFE_TOKEN; bun prototypes/intake/lab.ts --grouping anchored --route extended --route-policy groupVote --threshold 0.6 --corpus lemma --identity --runs 2'
 *   zsh -ic 'export TYPESAFE_API_KEY=$TYPESAFE_TOKEN; bun prototypes/intake/lab.ts --grouping anchored --route extended --route-policy groupVote --threshold 0.6 --corpus grammar --roles --runs 2'
 *   zsh -ic 'export TYPESAFE_API_KEY=$TYPESAFE_TOKEN; bun prototypes/intake/lab.ts --grouping anchored --route extended --route-policy groupVote --threshold 0.6 --shape questions --runs 2'
 *
 * Flags: --grouping link|head|pairwise|anchored (comma separated)
 *        --route flat|extended|hier (comma separated)
 *        --depth top|lattice   --scope eval|all   --threshold 0.5
 *        --runs N              --sweep            --concurrency N
 *        --limit N (first N sentences, for a cheap smoke run)
 *        --route-policy perOccurrence|groupVote|groupHead (comma separated)
 *        --corpus clicks|lemma|grammar   --identity   --roles
 *        --identity-shape authored|headword|rubric (issue 509)
 *        --shape state|questions         --chunk N (questions per call)
 *        --from /tmp/intake-<design>.json (re-score stored answers, no calls)
 *        --layered                       two layers (`layers.ts`): the Lexeme
 *                                        layer under the realization rules and
 *                                        the Phraseme layer under the fixedness
 *                                        rules, one call; implies --shape layered,
 *                                        --grouping anchored, --route lexeme, roles
 *        --phraseme-threshold 0.5        Noul threshold for the pair answers
 *        --phraseme-policy vote|score    how an expression is established
 *        --layers lexeme|both            with --layered: ask only the Lexeme
 *                                        layer (no `fixedness` state, no
 *                                        Phraseme questions) or both
 *        --shape layered|layered-original with --layered: the realization
 *                                        wording or the shipped wording
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
import { loadGrammarSentences, loadLemmaSentences, skipped } from "./gold.js";
import {
	type Identity,
	type IdentityShape,
	identityQuestions,
	reportIdentity,
	solveIdentity,
} from "./identity.js";
import { morphemeKinds, routeReachability } from "./inventory.js";
import {
	type Layered,
	lexemeRoleQuestions,
	type PhrasemePolicy,
	phrasemeQuestions,
	solveExpressions,
	splitMultiHead,
	summarizeExpressions,
	topLevel,
} from "./layers.js";
import { type Role, reportRoles, roleQuestions, solveRoles } from "./roles.js";
import { shapes } from "./shapes.js";

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
const layered = has("layered");
const layers = flag("layers", "both");
const withPhrasemes = layered && layers === "both";
const phrasemeThreshold = Number(flag("phraseme-threshold", "0.5"));
const phrasemePolicies = flag("phraseme-policy", "vote").split(
	",",
) as PhrasemePolicy[];
const groupingIds = flag("grouping", layered ? "anchored" : "link").split(",");
const routeIds = flag("route", layered ? "lexeme" : "flat").split(",");
const routePolicies = flag("route-policy", "perOccurrence").split(
	",",
) as RoutePolicy[];
const corpus = flag("corpus", "clicks");
const withIdentity = has("identity");
const identityShape = flag("identity-shape", "authored") as IdentityShape;
const withRoles = has("roles") || layered;
const shape =
	shapes[flag("shape", layered ? "layered" : "state")] ??
	(() => {
		throw Error(`Unknown shape ${flag("shape", "state")}`);
	})();
/** Questions per call. The budget is ~32k tokens shared by state and questions. */
const maxQuestionsPerCall = Number(flag("chunk", String(shape.chunk)));
/** Re-score a finished run from its stored answers, without calling jev. */
const replay = flag("from", "");
const sweepThresholds = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8];

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

/** Retry only rate limiting; the recorded call is the one that answered. */
async function askWithBackoff(
	calls: Call[],
	route: string,
	state: unknown,
	questions: Questions,
	attempt = 0,
): Promise<{ answers: Record<string, unknown> }> {
	try {
		return await ask(calls, route, state, questions);
	} catch (error) {
		if (!String(error).includes("429") || attempt >= 5) throw error;
		await new Promise((resolve) =>
			setTimeout(resolve, 2000 * 2 ** attempt),
		);
		return askWithBackoff(calls, route, state, questions, attempt + 1);
	}
}

async function askSentence(
	sentence: Sentence,
	questions: Questions,
	route: string,
): Promise<Raw> {
	const calls: Call[] = [];
	const full = sentenceState(sentence, shape) as Record<string, unknown>;
	const state = withPhrasemes
		? full
		: Object.fromEntries(
				Object.entries(full).filter(([key]) => key !== "fixedness"),
			);
	const parts = chunk(questions);
	const results = await Promise.all(
		parts.map((part) => askWithBackoff(calls, route, state, part)),
	);
	const answers: Record<string, unknown> = {};
	for (const result of results) Object.assign(answers, result.answers);
	return { answers, calls };
}

type Solved = Analysis & {
	identities: Map<number, Identity> | null;
	roles: Map<number, Role> | null;
	layered?: Layered;
};

function solve(
	sentence: Sentence,
	raw: Raw,
	groupingId: string,
	routeId: string,
	tau: number,
	policy: RoutePolicy,
	phrasemePolicy: PhrasemePolicy = "vote",
): Solved {
	const grouping = groupings[groupingId]!;
	const routing = routings[routeId]!;
	const groups = grouping.solve(sentence, raw.answers, tau);
	const unitsBeforeSplit = assemble(
		sentence,
		groups,
		routing,
		raw.answers,
		policy,
		true,
	);
	const units = unitsBeforeSplit;
	const identities = withIdentity
		? solveIdentity(sentence, raw.answers, identityShape)
		: null;
	const roles = withRoles ? solveRoles(sentence, raw.answers) : null;
	if (layered && roles) {
		const units = splitMultiHead(
			sentence,
			unitsBeforeSplit,
			roles,
			raw.answers,
			(members) =>
				assemble(
					sentence,
					new Map(members.map((member) => [member, [...members]])),
					routing,
					raw.answers,
					policy,
					true,
				).get(members[0]!) ?? { decision: "Unresolved" },
		);
		const expressions = withPhrasemes
			? solveExpressions(
					sentence,
					raw.answers,
					units,
					roles,
					phrasemeThreshold,
					phrasemePolicy,
				)
			: [];
		const layers: Layered = { words: units, roles, expressions };
		const top = topLevel(sentence, layers);
		return {
			units: top.units,
			sub: top.sub,
			calls: raw.calls,
			identities,
			roles,
			layered: layers,
		};
	}
	if (depth !== "lattice")
		return { units, calls: raw.calls, identities, roles };
	const lattice = solveLattice(sentence, raw.answers, units);
	return {
		units,
		sub: lattice.sub,
		calls: raw.calls,
		note: { morphemes: Object.fromEntries(lattice.morphemes) },
		identities,
		roles,
	};
}

function loadCorpus(): Sentence[] {
	const sentences =
		corpus === "lemma"
			? loadLemmaSentences(scope)
			: corpus === "grammar"
				? loadGrammarSentences(scope)
				: loadSentences(scope);
	if (skipped.length)
		console.error(`  skipped gold cases: ${skipped.join(", ")}`);
	return sentences;
}

async function runDesign(
	groupingId: string,
	routeId: string,
	policy: RoutePolicy,
	run: number,
	phrasemePolicy: PhrasemePolicy = "vote",
) {
	const grouping = groupings[groupingId];
	const routing = routings[routeId];
	if (!grouping || !routing)
		throw Error(`Unknown design ${groupingId}/${routeId}`);
	const limit = Number(flag("limit", "0"));
	const sentences = limit ? loadCorpus().slice(0, limit) : loadCorpus();
	const axes = `${withIdentity ? `+identity:${identityShape}` : ""}${withRoles ? "+roles" : ""}${withPhrasemes ? `+phraseme:${phrasemePolicy}@${phrasemeThreshold}` : layered ? "+lexemeOnly" : ""}`;
	const name = `${corpus}:${groupingId}+${routeId}+${policy}+${depth}${axes} ${shape.id}${runs > 1 ? ` run${run}` : ""}`;
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
				...grouping!.questions(sentence, shape),
				...routing!.questions(sentence, shape),
				...(depth === "lattice" ? latticeQuestions(sentence) : {}),
				...(withIdentity
					? identityQuestions(sentence, identityShape)
					: {}),
				...(withRoles && shape.id !== "layered"
					? roleQuestions(sentence)
					: {}),
				...(shape.id === "layered"
					? lexemeRoleQuestions(sentence)
					: {}),
				...(withPhrasemes ? phrasemeQuestions(sentence) : {}),
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
					phrasemePolicy,
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
		corpus,
		shape: shape.summary,
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
	const identity = withIdentity
		? reportIdentity(
				pairs.map(({ sentence, analysis }) => ({
					sentence,
					units: analysis?.units ?? null,
					identities: analysis?.identities ?? null,
				})),
				identityShape,
			)
		: null;
	if (identity) extra.identity = identity.summary;
	const roles = withRoles
		? reportRoles(
				pairs.map(({ sentence, analysis }) => ({
					sentence,
					units: analysis?.units ?? null,
					roles: analysis?.roles ?? null,
				})),
			)
		: null;
	if (roles) extra.roles = roles.summary;
	if (withPhrasemes)
		extra.phrasemes = summarizeExpressions(
			pairs.map(({ sentence, analysis }) => ({
				sentence,
				layered: analysis?.layered ?? null,
			})),
		);

	const result = report(name, pairs, extra);
	console.log(JSON.stringify(result.summary, null, 2));
	const scores = {
		...result,
		identityScores: identity?.scores ?? [],
		shapeScores: roles?.scores ?? [],
	};
	if (replay)
		return {
			...scores,
			summary: { ...result.summary, replayedFrom: replay },
		};
	await save(
		`/tmp/intake-${corpus}-${groupingId}-${routeId}-${depth}-${shape.id}${withIdentity ? `-identity-${identityShape}` : ""}${withRoles ? "-roles" : ""}${withPhrasemes ? `-phraseme-${phrasemePolicy}` : layered ? "-lexeme-only" : ""}-${run}.json`,
		{
			summary: result.summary,
			scores: result.scores,
			identityScores: scores.identityScores,
			shapeScores: scores.shapeScores,
			answers: sentences.map((sentence, position) => ({
				id: sentence.id,
				answers: raws[position]?.answers ?? null,
			})),
		},
	);
	return scores;
}

/** Ids that pass in one run but not the other. */
function flips(previous: Set<string>, current: Set<string>): number {
	return [...new Set([...previous, ...current])].filter(
		(id) => previous.has(id) !== current.has(id),
	).length;
}

const table: Record<string, Record<string, number[]>> = {};
for (const groupingId of groupingIds)
	for (const routeId of routeIds)
		for (const policy of routePolicies)
			for (const phrasemePolicy of layered
				? phrasemePolicies
				: ["vote" as const]) {
				const passes: number[] = [];
				const identityPasses: number[] = [];
				const headwordPasses: number[] = [];
				const shapePasses: number[] = [];
				let previous: {
					clicks: Set<string>;
					identity: Set<string>;
					shape: Set<string>;
				} | null = null;
				for (let run = 1; run <= runs; run += 1) {
					const result = await runDesign(
						groupingId,
						routeId,
						policy,
						run,
						phrasemePolicy,
					);
					passes.push(result.summary.passed);
					const summary = result.summary as Record<string, unknown>;
					const identitySummary = summary.identity as
						| {
								identityPassed: number;
								identityHeadwordPassed: number;
						  }
						| undefined;
					const rolesSummary = summary.roles as
						| { shapeAllCorrect: number }
						| undefined;
					if (identitySummary) {
						identityPasses.push(identitySummary.identityPassed);
						headwordPasses.push(
							identitySummary.identityHeadwordPassed,
						);
					}
					if (rolesSummary)
						shapePasses.push(rolesSummary.shapeAllCorrect);
					const passing = {
						clicks: new Set(
							result.scores
								.filter((score) => score.pass)
								.map((score) => score.id),
						),
						identity: new Set(
							result.identityScores
								.filter((score) => score.pass)
								.map((score) => score.id),
						),
						shape: new Set(
							result.shapeScores
								.filter((score) => score.allCorrect)
								.map((score) => score.id),
						),
					};
					if (previous)
						console.log(
							JSON.stringify({
								design: `${corpus}:${groupingId}+${routeId}+${policy} ${shape.id}`,
								runToRunFlips: flips(
									previous.clicks,
									passing.clicks,
								),
								identityFlips: flips(
									previous.identity,
									passing.identity,
								),
								shapeFlips: flips(
									previous.shape,
									passing.shape,
								),
							}),
						);
					previous = passing;
				}
				table[
					`${corpus}:${groupingId}+${routeId}+${policy}+${depth} ${shape.id}${layered ? ` phraseme:${phrasemePolicy}` : ""}`
				] = {
					passes,
					...(identityPasses.length
						? { identityPasses, headwordPasses }
						: {}),
					...(shapePasses.length ? { shapePasses } : {}),
				};
			}
console.log(JSON.stringify({ passesByDesign: table }, null, 2));
