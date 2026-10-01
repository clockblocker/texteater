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
	runStages,
	type Stages,
} from "../../lab/stages.js";
import {
	type Arm,
	type ArmContext,
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
import { slotId } from "./candidates.js";
import {
	type AssembledEdge,
	type AssemblyInput,
	articleHosts,
	assemble,
	type CandidatesCore,
	candidatesCore,
	type Family,
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

/** The policy of the reference run this arm reproduces. */
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

/** What v3's requests and the `final` request answered. */
export type ReferenceEvidence = {
	readonly core: CandidatesCore;
	readonly final: Answers;
};

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
 * reference's own floor deciding `supported`, and code's rule connections.
 */
export function referenceConnections(
	evidence: ReferenceEvidence,
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
				supported: key === top.key && share > none && share >= floor,
			});
		}
	};
	for (const slot of core.slots) {
		if (slot.kind === "idiom" && reasked.has(slot.piece.id)) continue;
		const question = slotId(slot);
		hostConnections(
			slot.kind,
			slot.piece.id,
			question,
			choiceOf(core.first, question),
			slot.kind === "idiom" ? (full07.idiom ?? 0.7) : full07.satellite,
		);
	}
	for (const id of reasked) {
		const question = `s4_idiom_${id}`;
		hostConnections("idiom", id, question, choiceOf(final, question), 0.7);
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
				link.probability >= (full07.expression ?? 0.7) &&
				(core.fixed.get(link.left) ?? 0) >= 0.5 &&
				(core.fixed.get(link.right) ?? 0) >= 0.5,
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
			supported: score >= 0.5 && score > (probabilities.plus ?? 0),
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

/** The assembly input of `step0+saying`: step 0 over v3's `full@0.7`, Sayings from the Choice. */
function referenceInput(evidence: ReferenceEvidence): {
	readonly input: AssemblyInput;
	readonly ranges: readonly (readonly number[])[];
} {
	const { core, final } = evidence;
	const { input, ranges } = stepZeroInput(
		core,
		policyInput(core, full07),
		final,
		0.7,
	);
	return {
		input: {
			...input,
			sayings: polishedSayings(core.sentence, final, 0.5, false),
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

async function nominate(
	input: Parameters<Arm["run"]>[0],
	context: ArmContext,
): Promise<Nomination<ReferenceEvidence>> {
	const core = await candidatesCore(
		input,
		v3Context(context),
		isReferenceAuxiliary,
	);
	const final = await ask(core, context, "final", {
		...stepZeroQuestions(core),
		...sayingQuestions(core),
	});
	const evidence = { core, final };
	const connections = referenceConnections(evidence);
	return {
		pieces: core.sentence.pieces.map((piece) => piece.id),
		connections,
		judgments: judgmentsOf(evidence, connections),
		evidence,
	};
}

export function resolveReference(
	nomination: Nomination<ReferenceEvidence>,
): Membership<ReferenceDetail> {
	const { core } = nomination.evidence;
	const { input, ranges } = referenceInput(nomination.evidence);
	const built = assemble(core.sentence, articleHosts(core), input);
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

async function routeReference(
	nomination: Nomination<ReferenceEvidence>,
	membership: Membership<ReferenceDetail>,
	context: ArmContext,
) {
	const { core } = nomination.evidence;
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
	const fresh = historicalFreshGroups(nomination.evidence, v3Groups);
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
	// Groups of another resolver that no historical batch asked about.
	const unasked = membership.partition.filter(
		(group) =>
			!v3Groups.has(groupKey(group)) && !fresh.has(groupKey(group)),
	);
	const extraRoutes = readRoutes(
		sentence,
		unasked,
		await ask(
			core,
			context,
			"route-extra",
			routeQuestions(sentence, unasked, core.ref, v3Context(context)),
		),
	);
	const closedAnswers = await ask(
		core,
		context,
		"closed",
		closedQuestions(core),
	);
	const judged = new Map<string, RouteJudgment>([
		...v3Routes.identity,
		...freshRoutes.identity,
		...extraRoutes.identity,
	]);
	const distributions = new Map([
		...v3Routes.distributions,
		...freshRoutes.distributions,
		...extraRoutes.distributions,
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

export const referenceStages: Stages<ReferenceEvidence, ReferenceDetail> = {
	nominate,
	resolve: resolveReference,
	route: routeReference,
};

/** Replaying or re-running the reference through the lab. */
export const referenceArm: Arm = {
	id: "reference",
	summary:
		"The #755 candidate reference (candidates4 final=1 closed=1, step0+saying+closed) behind nomination, membership and routing stages",
	async run(input, context) {
		const { output } = await runStages(referenceStages, input, context);
		return {
			primary: referencePolicy,
			outputs: { [referencePolicy]: output },
		};
	},
};
