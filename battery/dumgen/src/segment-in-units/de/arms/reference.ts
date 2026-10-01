/**
 * The candidate reference of #755 behind the lab's stage interfaces
 * (`lab/stages.ts`): candidates4 with `final=1 closed=1`, policy
 * `step0+saying+closed`. That is v3's requests, step 0, the Saying Choice
 * counted on whole + fragment at 0.5, and closed-class identity.
 *
 * - **Nomination** sends v3's two requests and the `final` request, and
 *   lists every connection they judged, plus code's own (number ranges,
 *   superlative `am`, the pieces of a split word, the preposition opening a
 *   noun's phrase).
 * - **Resolution** is candidates4's assembly, unchanged: its floors, its
 *   conflict rules and its absorption.
 * - **Routing** is candidates4's, including the merge of adjacent
 *   interjections. Its route requests are batched as the original run
 *   batched them, over the groups of every policy that run built, so they
 *   stay cache hits; groups no batch asked get a request of their own.
 *
 * Replaying the reference run reproduces its cached outputs exactly. The
 * AUX inventory is pinned to the one dumspec authored when that run was
 * made: causative `lassen` (aecec098) came later and changes v3's request.
 *
 * The resolver's floors are parameters (#762). `runFloors` are the
 * reference run's, which its replay reproduces (`--opt floors=run`);
 * `referenceFloors`, the default, are the setting the #762 sweep adopted.
 * `--opt` moves one (`--opt expression=0.6`), and a policy is named after
 * the floors it moves from the run's. No floor changes a request
 * nomination or the historical route batches send, so a setting reads the
 * same cached answers; only groups no batch asked need a request of their
 * own (`--opt unasked=unresolved` routes them `Unresolved` instead).
 */
import { authoredRealizations } from "dumspec";
import type { Questions } from "promptsmith/typesafe";
import {
	type Answer,
	type Answers,
	choice,
	choiceOf,
	noulOf,
} from "../../lab/jev.js";
import {
	type Connection,
	type Edge,
	type Groups,
	type Membership,
	type Nomination,
	type Routed,
	runStages,
	type Stages,
} from "../../lab/stages.js";
import {
	type Arm,
	type ArmContext,
	type ArmOptions,
	judgeRoutes,
	type RouteJudgment,
	readRoutes,
	routeQuestions,
} from "../arm.js";
import {
	fusedSiblings,
	isAbbreviationPiece,
	isAdpositionPiece,
	nounLike,
	numberRanges,
	oldSpellingCorrelators,
	sayingSpans,
	superlativeLinks,
} from "../candidates.js";
import {
	closedClassQuestion,
	closedClassRoute,
	hasFixedRoute,
} from "../closed-class.js";
import { groupKey, outputOf } from "../partition.js";
import { allRoutes, type RouteKey, routeCriteria } from "../routes.js";
import { slotId, slotLinks } from "./candidates.js";
import {
	type AssembledEdge,
	type AssemblyInput,
	articleHosts,
	assemble,
	type CandidatesCore,
	candidatesCore,
	type Family,
	oneSatellitePerHost,
	type Policy,
	policies,
	policyInput,
	structuralRoute,
} from "./candidates2.js";
import {
	mergeInterjections,
	polishedSayings,
	sayingChoiceId,
	sayingQuestions,
	stepZeroInput,
	stepZeroQuestions,
	v3Options,
} from "./candidates4.js";

/** The policy of the reference run, which `runFloors` reproduce. */
export const referencePolicy = "step0+saying+closed";

/** The AUX lemmas dumspec authored when the reference run was made. */
const referenceAuxiliaryLemmas = new Set([
	"sein",
	"haben",
	"werden",
	"bekommen",
]);
let referenceAuxiliaryForms: Set<string> | undefined;

export function isReferenceAuxiliary(text: string): boolean {
	referenceAuxiliaryForms ??= new Set(
		authoredRealizations
			.filter(
				({ member }) =>
					member.lemma.kind === "AUX" &&
					referenceAuxiliaryLemmas.has(member.lemma.canonicalForm),
			)
			.map(({ spelled }) => spelled.toLowerCase()),
	);
	return referenceAuxiliaryForms.has(text.toLowerCase());
}

const full07 = policies["full@0.7"] as Policy;

/**
 * Where the resolver turns a judgment into a supported connection. The
 * historical route batches keep `full@0.7` and the reference's own values
 * whatever the setting, so their requests stay cache hits.
 */
export type ReferenceFloors = {
	/** A satellite's top host share (article, particle, auxiliary, reflexive, expletive es, governed preposition). */
	readonly satellite: number;
	/** How far a satellite's top host share must exceed `none`'s. */
	readonly margin: number;
	/** An idiom host's share, v3's and step 0's re-asked one. */
	readonly idiom: number;
	/** An expression pair's Noul. */
	readonly expression: number;
	/** The fixedness Noul both pieces of an expression pair need. */
	readonly fixed: number;
	/** A Saying span's whole + fragment share. */
	readonly saying: number;
};

/** The reference run's floors (#755). */
export const runFloors: ReferenceFloors = {
	satellite: full07.satellite,
	margin: 0,
	idiom: full07.idiom ?? 0.7,
	expression: full07.expression ?? 0.7,
	fixed: 0.5,
	saying: 0.5,
};

/**
 * The reference's floors: the run's, with the idiom, fixed and Saying
 * floors the #762 sweep adopted. On dev they hold 9 more gold units by
 * majority and lose 1, with 27 membership flips against 29.
 */
export const referenceFloors: ReferenceFloors = {
	...runFloors,
	idiom: 0.6,
	fixed: 0.3,
	saying: 0.4,
};

export const floorNames = Object.keys(
	runFloors,
) as readonly (keyof ReferenceFloors)[];

/**
 * The floors `--opt` sets, over the reference's own, or over the run's
 * with `--opt floors=run`.
 */
export function floorsOf(options: ArmOptions): ReferenceFloors {
	const base = options.floors ?? "reference";
	if (base !== "reference" && base !== "run")
		throw Error(`--opt floors=${base} must be reference or run`);
	const floors: Record<string, number> = {
		...(base === "run" ? runFloors : referenceFloors),
	};
	for (const name of floorNames) {
		const value = options[name];
		if (value === undefined) continue;
		const number = Number(value);
		if (!Number.isFinite(number))
			throw Error(`--opt ${name}=${value} is not a number`);
		floors[name] = number;
	}
	return floors as ReferenceFloors;
}

/**
 * A setting's policy name: the floors it moves from the run's
 * (`expression=0.6,fixed=0.4`), or the reference policy when it moves none.
 */
export function floorsKey(floors: ReferenceFloors): string {
	const moved = floorNames.filter((name) => floors[name] !== runFloors[name]);
	return moved.length === 0
		? referencePolicy
		: moved.map((name) => `${name}=${floors[name]}`).join(",");
}

/** What v3's requests and the `final` request answered. */
export type ReferenceEvidence = {
	readonly core: CandidatesCore;
	readonly final: Answers;
};

/** The core as a setting reads it: satellite hosts re-read under its margin. */
function coreUnder(
	core: CandidatesCore,
	floors: ReferenceFloors,
): CandidatesCore {
	if (floors.margin === runFloors.margin) return core;
	return {
		...core,
		slotAnswers: oneSatellitePerHost(
			slotLinks(core.slots, core.first, floors.margin),
		),
	};
}

export type ReferenceDetail = {
	readonly familyOf: (group: readonly number[]) => Family;
};

const sorted = (ids: readonly number[]) => [...ids].sort((a, b) => a - b);
const pairKey = (a: number, b: number) => `${Math.min(a, b)},${Math.max(a, b)}`;

/** Host options of a Choice: the `p<id>` keys, with the `none` share. */
function hostShares(answer: Extract<Answer, { type: "choice" }>) {
	const hosts = Object.entries(answer.probabilities).filter(
		([key]) => key !== "none",
	);
	let top = { key: "", share: -1 };
	for (const [key, share] of hosts)
		if (share > top.share) top = { key, share };
	return { hosts, top, none: answer.probabilities.none ?? 0 };
}

/**
 * Every connection v3's requests and the `final` request judged, with the
 * floors deciding `supported`, and code's rule connections.
 */
export function referenceConnections(
	evidence: ReferenceEvidence,
	floors: ReferenceFloors = referenceFloors,
): Connection[] {
	const { core, final } = evidence;
	const { sentence } = core;
	const connections: Connection[] = [];
	const reasked = new Set(
		Object.keys(final)
			.filter((id) => id.startsWith("s4_idiom_"))
			.map((id) => Number(id.slice(9))),
	);
	const hostConnections = (
		kind: string,
		piece: number,
		question: string,
		answer: Extract<Answer, { type: "choice" }>,
		floor: number,
		margin: number,
	) => {
		const { hosts, top, none } = hostShares(answer);
		for (const [key, share] of hosts) {
			const host = Number(key.slice(1));
			connections.push({
				id: `${question}>${key}`,
				kind,
				pieces: sorted([piece, host]),
				source: "judged",
				question,
				probability: share,
				supported:
					key === top.key && share > none + margin && share >= floor,
			});
		}
	};
	for (const slot of core.slots) {
		if (slot.kind === "idiom" && reasked.has(slot.piece.id)) continue;
		const question = slotId(slot);
		const idiom = slot.kind === "idiom";
		hostConnections(
			slot.kind,
			slot.piece.id,
			question,
			choiceOf(core.first, question),
			idiom ? floors.idiom : floors.satellite,
			idiom ? 0 : floors.margin,
		);
	}
	for (const id of reasked) {
		const question = `s4_idiom_${id}`;
		hostConnections(
			"idiom",
			id,
			question,
			choiceOf(final, question),
			floors.idiom,
			0,
		);
	}
	for (const pair of core.pairs) {
		const question = `c_${pair.left.id}_${pair.right.id}`;
		const probability = noulOf(core.first, question);
		const pieces =
			pair.kind === "name"
				? sentence.pieces
						.filter(
							(piece) =>
								piece.id >= pair.left.id &&
								piece.id <= pair.right.id,
						)
						.map((piece) => piece.id)
				: [pair.left.id, pair.right.id];
		connections.push({
			id: question,
			kind: pair.kind,
			pieces,
			source: "judged",
			question,
			probability,
			supported: probability >= 0.5,
		});
	}
	for (const pair of oldSpellingCorrelators(sentence)) {
		const question = `c4_${pair.left.id}_${pair.right.id}`;
		const probability = noulOf(final, question);
		connections.push({
			id: question,
			kind: "correlator",
			pieces: [pair.left.id, pair.right.id],
			source: "judged",
			question,
			probability,
			supported: probability >= 0.5,
		});
	}
	for (const link of core.links) {
		const question = `e_${link.left}_${link.right}`;
		connections.push({
			id: question,
			kind: "expression",
			pieces: [link.left, link.right],
			source: "judged",
			question,
			probability: link.probability,
			supported:
				link.probability >= floors.expression &&
				(core.fixed.get(link.left) ?? 0) >= floors.fixed &&
				(core.fixed.get(link.right) ?? 0) >= floors.fixed,
		});
	}
	for (const span of sayingSpans(sentence)) {
		const ids = span.pieces.map((piece) => piece.id);
		const question = sayingChoiceId(ids);
		const { probabilities } = choiceOf(final, question);
		const score =
			(probabilities.whole ?? 0) + (probabilities.fragment ?? 0);
		connections.push({
			id: question,
			kind: "saying",
			pieces: ids,
			source: "judged",
			question,
			probability: score,
			supported:
				score >= floors.saying && score > (probabilities.plus ?? 0),
		});
	}
	const rule = (
		kind: string,
		pieces: readonly number[],
		conditional = false,
	) =>
		connections.push({
			id: `${kind}_${pieces.join("_")}`,
			kind,
			pieces: sorted(pieces),
			source: "rule",
			...(conditional ? { conditional } : {}),
			supported: !conditional,
		});
	for (const range of numberRanges(sentence)) rule("range", range);
	for (const link of superlativeLinks(sentence)) rule("superlative", link);
	const runs = new Set(
		[...fusedSiblings(sentence).values()].map((run) => run.join("_")),
	);
	for (const run of runs) rule("sibling", run.split("_").map(Number), true);
	// The preposition opening a noun's phrase, before the noun or before any
	// article that may head to it: absorbed when the noun joins an expression.
	const articleSlots = core.slots.filter((slot) => slot.kind === "article");
	const prepositions = new Set<string>();
	for (const piece of sentence.pieces) {
		if (!nounLike(piece)) continue;
		const starts = [
			piece.id,
			...articleSlots
				.filter(
					(slot) =>
						slot.piece.id < piece.id &&
						slot.hosts.some((host) => host.id === piece.id),
				)
				.map((slot) => slot.piece.id),
		];
		for (const start of starts) {
			const before = sentence.pieces[start - 2];
			if (
				before &&
				before.clause === piece.clause &&
				isAdpositionPiece(before)
			)
				prepositions.add(`${before.id}_${piece.id}`);
		}
	}
	for (const entry of prepositions)
		rule("preposition", entry.split("_").map(Number), true);
	return connections;
}

/**
 * The assembly input of `step0+saying`: step 0 over v3's `full@0.7`,
 * Sayings from the Choice, each under the setting's floors.
 */
function referenceInput(
	evidence: ReferenceEvidence,
	floors: ReferenceFloors,
): {
	readonly input: AssemblyInput;
	readonly ranges: readonly (readonly number[])[];
} {
	const { final } = evidence;
	const core = coreUnder(evidence.core, floors);
	const { input, ranges } = stepZeroInput(
		core,
		policyInput(core, {
			...full07,
			satellite: floors.satellite,
			idiom: floors.idiom,
			expression: floors.expression,
			fixed: floors.fixed,
		}),
		final,
		floors.idiom,
	);
	return {
		input: {
			...input,
			sayings: polishedSayings(
				core.sentence,
				final,
				floors.saying,
				false,
			),
		},
		ranges,
	};
}

/** Which connection, or which rule, drew each assembled edge. */
function edgesOf(
	assembled: readonly AssembledEdge[],
	connections: readonly Connection[],
	ranges: readonly (readonly number[])[],
): Edge[] {
	const byId = new Map(connections.map((entry) => [entry.id, entry]));
	const covering = (kinds: ReadonlySet<string>, a: number, b: number) =>
		connections.find(
			(entry) =>
				kinds.has(entry.kind) &&
				entry.pieces.includes(a) &&
				entry.pieces.includes(b),
		);
	const pairKinds = new Set([
		"split-adverb",
		"correlator",
		"circumposition",
		"name",
	]);
	const rangeOf = (a: number, b: number) =>
		ranges.find((range) => range.includes(a) && range.includes(b));
	return assembled.map(({ pieces, source }): Edge => {
		const [a, b] = pieces;
		const judged = (entry: Connection | undefined): Edge => {
			if (!entry)
				throw Error(`No connection drew the ${source} edge ${a}–${b}`);
			return { pieces, connection: entry.id };
		};
		switch (source) {
			case "satellite": {
				const entry = connections.find(
					(candidate) =>
						candidate.source === "judged" &&
						candidate.id.startsWith(`s_`) &&
						candidate.id.endsWith(`_${a}>p${b}`) &&
						candidate.kind !== "idiom",
				);
				return judged(entry);
			}
			case "pair": {
				const exact = connections.find(
					(entry) =>
						pairKinds.has(entry.kind) &&
						entry.source === "judged" &&
						pairKey(
							entry.pieces[0] ?? 0,
							entry.pieces.at(-1) ?? 0,
						) === pairKey(a, b),
				);
				return judged(exact ?? covering(pairKinds, a, b));
			}
			case "expression": {
				const range = rangeOf(a, b);
				if (range)
					return {
						pieces,
						rule: "range",
						connection: `range_${range.join("_")}`,
					};
				const entry =
					byId.get(`s4_idiom_${a}>p${b}`) ??
					byId.get(`s_idiom_${a}>p${b}`) ??
					byId.get(`e_${Math.min(a, b)}_${Math.max(a, b)}`);
				return judged(entry);
			}
			case "saying":
				return judged(covering(new Set(["saying"]), a, b));
			case "superlative":
				return {
					pieces,
					rule: "superlative",
					connection: `superlative_${a}_${b}`,
				};
			case "sibling": {
				const entry = covering(new Set(["sibling"]), a, b);
				return {
					pieces,
					rule: "sibling",
					...(entry ? { connection: entry.id } : {}),
				};
			}
			case "preposition": {
				const id = `preposition_${Math.min(a, b)}_${Math.max(a, b)}`;
				return {
					pieces,
					rule: "preposition",
					...(byId.has(id) ? { connection: id } : {}),
				};
			}
		}
		throw Error(`Unknown edge source ${source satisfies never}`);
	});
}

/** The judge state's question answers, restricted to what nomination asked. */
function judgmentsOf(
	evidence: ReferenceEvidence,
	connections: readonly Connection[],
): Record<string, Answer> {
	const asked = new Set(
		connections.flatMap((entry) =>
			entry.question ? [entry.question] : [],
		),
	);
	const judgments: Record<string, Answer> = {};
	for (const answers of [
		evidence.core.first,
		evidence.core.second,
		evidence.final,
	])
		for (const [id, answer] of Object.entries(answers))
			if (asked.has(id) || id.startsWith("f_")) judgments[id] = answer;
	return judgments;
}

const v3Context = (context: ArmContext): ArmContext => ({
	...context,
	options: { ...v3Options },
});

const ask = (
	core: CandidatesCore,
	context: ArmContext,
	stage: string,
	questions: Questions,
) =>
	context.jev.ask({
		stage,
		state: core.state,
		questions,
		repetition: context.repetition,
		calls: context.calls,
	});

/** v3's two requests and the `final` request: what every setting reads. */
export async function referenceEvidence(
	input: Parameters<Arm["run"]>[0],
	context: ArmContext,
): Promise<ReferenceEvidence> {
	const core = await candidatesCore(
		input,
		v3Context(context),
		isReferenceAuxiliary,
	);
	const final = await ask(core, context, "final", {
		...stepZeroQuestions(core),
		...sayingQuestions(core),
	});
	return { core, final };
}

/** The connections of the evidence, `supported` under the floors. */
export function nominationOf(
	evidence: ReferenceEvidence,
	floors: ReferenceFloors = referenceFloors,
): Nomination<ReferenceEvidence> {
	const connections = referenceConnections(evidence, floors);
	return {
		pieces: evidence.core.sentence.pieces.map((piece) => piece.id),
		connections,
		judgments: judgmentsOf(evidence, connections),
		evidence,
	};
}

export function resolveReference(
	nomination: Nomination<ReferenceEvidence>,
	floors: ReferenceFloors = referenceFloors,
): Membership<ReferenceDetail> {
	const { core } = nomination.evidence;
	const { input, ranges } = referenceInput(nomination.evidence, floors);
	const built = assemble(
		core.sentence,
		articleHosts(coreUnder(core, floors)),
		input,
	);
	const rangeKeys = new Set(ranges.map((range) => groupKey(range)));
	return {
		partition: built.partition,
		edges: edgesOf(built.edges, nomination.connections, ranges),
		detail: {
			familyOf: (group) =>
				rangeKeys.has(groupKey(group))
					? "Locution"
					: built.familyOf(group),
		},
	};
}

/**
 * The groups the original run's `route2` request asked about, in its order:
 * those of `v3`, `step0`, `step0+saying` and `step0+saying+maxim@0.7` that
 * v3's own route request did not.
 */
function historicalFreshGroups(
	evidence: ReferenceEvidence,
	v3Groups: ReadonlySet<string>,
): Map<string, readonly number[]> {
	const { core, final } = evidence;
	const articleOf = articleHosts(core);
	const base = policyInput(core, full07);
	const { input } = stepZeroInput(core, base, final, 0.7);
	const partitions: Groups[] = [
		assemble(core.sentence, articleOf, base).partition,
		assemble(core.sentence, articleOf, input).partition,
		assemble(core.sentence, articleOf, {
			...input,
			sayings: polishedSayings(core.sentence, final, 0.5, false),
		}).partition,
		assemble(core.sentence, articleOf, {
			...input,
			sayings: polishedSayings(core.sentence, final, 0.7, true),
		}).partition,
	];
	const fresh = new Map<string, readonly number[]>();
	for (const partition of partitions)
		for (const group of partition)
			if (!v3Groups.has(groupKey(group)))
				fresh.set(groupKey(group), group);
	return fresh;
}

function closedQuestions(core: CandidatesCore): Questions {
	const questions: Questions = {};
	for (const piece of core.sentence.pieces) {
		const question = closedClassQuestion(piece);
		if (question)
			questions[`cc_${piece.id}`] = choice(
				question.instructions(core.ref(piece)),
				question.criteria,
			);
	}
	return questions;
}

type Routes = ReturnType<typeof readRoutes>;

/**
 * The route requests of the reference run, which no floor changes: v3's
 * route request over its policies' groups, `route2` over the groups the
 * historical policies added and the abbreviations, and closed-class
 * identity.
 */
export type ReferenceRouteAnswers = {
	/** Every group the historical batches asked about. */
	readonly asked: ReadonlySet<string>;
	readonly routes: Routes;
	readonly route2: Answers;
	readonly closed: Answers;
};

export async function askReferenceRoutes(
	evidence: ReferenceEvidence,
	context: ArmContext,
): Promise<ReferenceRouteAnswers> {
	const { core } = evidence;
	const { sentence } = core;
	const articleOf = articleHosts(core);
	const v3Partitions = Object.values(policies).map(
		(policy) =>
			assemble(sentence, articleOf, policyInput(core, policy)).partition,
	);
	const v3Routes = await judgeRoutes(
		sentence,
		v3Partitions,
		v3Context(context),
	);
	const v3Groups = new Set(
		v3Partitions.flatMap((partition) => partition.map(groupKey)),
	);
	const fresh = historicalFreshGroups(evidence, v3Groups);
	const abbreviations: Questions = {};
	for (const piece of sentence.pieces.filter(isAbbreviationPiece))
		abbreviations[`ra_${piece.id}`] = choice(
			`In \`sentence\`, the word ${core.ref(piece)} is a unit on its own. Which route does it take? An abbreviation takes the route of what it stands for (z.B. = zum Beispiel, a Locution ADV).`,
			routeCriteria(allRoutes, true),
		);
	const freshGroups = [...fresh.values()];
	const route2 = await ask(core, context, "route2", {
		...routeQuestions(sentence, freshGroups, core.ref, v3Context(context)),
		...abbreviations,
	});
	const freshRoutes = readRoutes(sentence, freshGroups, route2);
	const closed = await ask(core, context, "closed", closedQuestions(core));
	return {
		asked: new Set([...v3Groups, ...fresh.keys()]),
		routes: {
			open: new Map([...v3Routes.open, ...freshRoutes.open]),
			identity: new Map([...v3Routes.identity, ...freshRoutes.identity]),
			distributions: new Map([
				...v3Routes.distributions,
				...freshRoutes.distributions,
			]),
		},
		route2,
		closed,
	};
}

/** The groups of a partition no historical batch asked about. */
export const unaskedGroups = (
	answers: ReferenceRouteAnswers,
	partition: Groups,
): Groups => partition.filter((group) => !answers.asked.has(groupKey(group)));

/**
 * Routes a membership from the route answers, plus `extra`, the answers
 * for the groups no historical batch asked about. A group without either
 * routes `Unresolved`.
 */
export function routeReferenceWith(
	nomination: Nomination<ReferenceEvidence>,
	membership: Membership<ReferenceDetail>,
	answers: ReferenceRouteAnswers,
	extra?: Routes,
): Routed {
	const { sentence } = nomination.evidence.core;
	const { route2, closed: closedAnswers } = answers;
	const judged = new Map<string, RouteJudgment>([
		...answers.routes.identity,
		...(extra?.identity ?? []),
	]);
	const distributions = new Map([
		...answers.routes.distributions,
		...(extra?.distributions ?? []),
	]);
	const jevRoute = (group: readonly number[]): RouteKey => {
		const [only] = group;
		if (group.length === 1 && only !== undefined) {
			const abbreviation = route2[`ra_${only}`];
			if (abbreviation?.type === "choice") return abbreviation.choice;
		}
		return judged.get(groupKey(group))?.choice ?? "Unresolved";
	};
	const structural = structuralRoute(
		distributions,
		jevRoute,
		membership.detail.familyOf,
	);
	const merged = mergeInterjections(
		sentence,
		membership.partition,
		structural,
	);
	const closedRoute = (group: readonly number[]): RouteKey | undefined => {
		const [only] = group;
		if (group.length !== 1 || only === undefined) return undefined;
		const piece = sentence.pieces[only - 1];
		if (!piece) return undefined;
		if (hasFixedRoute(piece)) return closedClassRoute(piece, undefined);
		const answer = closedAnswers[`cc_${only}`];
		return answer?.type === "choice"
			? closedClassRoute(piece, answer.choice)
			: undefined;
	};
	const route = (group: readonly number[]): RouteKey =>
		closedRoute(group) ??
		(merged.merged.has(groupKey(group))
			? "Locution/INTJ"
			: structural(group));
	return {
		output: outputOf(sentence, merged.partition, route),
		partition: merged.partition,
		merges: merged.links.map(
			(pieces): Edge => ({
				pieces: [pieces[0], pieces[1]],
				rule: "interjection",
			}),
		),
	};
}

/**
 * Routing that asks a `route-extra` request for the groups no historical
 * batch asked about, or routes them `Unresolved` without asking.
 */
const routeReference =
	(unasked: "ask" | "unresolved") =>
	async (
		nomination: Nomination<ReferenceEvidence>,
		membership: Membership<ReferenceDetail>,
		context: ArmContext,
	): Promise<Routed> => {
		const { core } = nomination.evidence;
		const answers = await askReferenceRoutes(nomination.evidence, context);
		if (unasked === "unresolved")
			return routeReferenceWith(nomination, membership, answers);
		const groups = unaskedGroups(answers, membership.partition);
		const extra = readRoutes(
			core.sentence,
			groups,
			await ask(
				core,
				context,
				"route-extra",
				routeQuestions(
					core.sentence,
					groups,
					core.ref,
					v3Context(context),
				),
			),
		);
		return routeReferenceWith(nomination, membership, answers, extra);
	};

/** The reference's stages under a setting of its floors. */
export function referenceStagesUnder(
	floors: ReferenceFloors,
	unasked: "ask" | "unresolved" = "ask",
): Stages<ReferenceEvidence, ReferenceDetail> {
	return {
		nominate: async (input, context) =>
			nominationOf(await referenceEvidence(input, context), floors),
		resolve: (nomination) => resolveReference(nomination, floors),
		route: routeReference(unasked),
	};
}

/** The stages that replay the reference run (#755). */
export const referenceRunStages = referenceStagesUnder(runFloors);

/**
 * Running the reference through the lab, or replaying its run with `--opt
 * floors=run`; `--opt` moves its floors, and the policy is named after the
 * floors moved from the run's. `--opt unasked=unresolved` asks nothing for
 * groups no historical batch asked about.
 */
export const referenceArm: Arm = {
	id: "reference",
	summary:
		"The #755 candidate reference (candidates4 final=1 closed=1, step0+saying+closed) behind nomination, membership and routing stages, with the floors #762 adopted",
	async run(input, context) {
		const floors = floorsOf(context.options);
		const unasked = context.options.unasked ?? "ask";
		if (unasked !== "ask" && unasked !== "unresolved")
			throw Error(`--opt unasked=${unasked} must be ask or unresolved`);
		const { output } = await runStages(
			referenceStagesUnder(floors, unasked),
			input,
			context,
		);
		const policy = floorsKey(floors);
		return { primary: policy, outputs: { [policy]: output } };
	},
};
