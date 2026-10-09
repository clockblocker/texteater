/**
 * The candidate reference of #755: the production unit stage with the
 * Saying Choice counted on whole + fragment, no maxim, and the AUX
 * inventory pinned to the one dumcorpus authored when the reference run was
 * made (causative `lassen`, aecec098, came later and changes the
 * `candidates` request). Behind the lab's stage interfaces
 * (`lab/segmentation/harness/stages.ts`), so the attribution can trace it:
 *
 * - **Nomination** lists every connection the production requests judged,
 *   plus code's own (number ranges, superlative `am`, the pieces of a
 *   split word, the preposition opening a noun's phrase).
 * - **Resolution** is production's membership under the floors.
 * - **Routing** is production's, with its batched route requests; groups
 *   no batch asked get `route-extra` (`--opt unasked=unresolved` routes
 *   them `Unresolved` instead, so a setting runs offline).
 *
 * The floors are parameters (#762). `runFloors` are the reference run's,
 * which its replay reproduces (`--opt floors=run`); `referenceFloors`, the
 * default, are the setting the #762 sweep adopted. `--opt` moves one
 * (`--opt expression=0.6`), and a policy is named after the floors it
 * moves from the run's.
 */

import type { Questions } from "@typesafe-ai/sdk";
import * as Effect from "effect/Effect";
import {
	type Answer,
	choice,
	choiceOf,
	noulOf,
} from "../../../../src/segment/ask.js";
import {
	type AssembledEdge,
	type Floors,
	type Membership,
	membershipOf,
} from "../../../../src/segment/de/assembly.js";
import {
	fusedSiblings,
	nounLike,
	numberRanges,
	oldSpellingCorrelators,
	sayingSpans,
	superlativeLinks,
} from "../../../../src/segment/de/candidates.js";
import { germanInventory } from "../../../../src/segment/de/inventory.js";
import {
	correlatorId,
	expressionId,
	type Nomination,
	nominate,
	pairId,
	reaskedIdiomId,
	sayingChoiceId,
	slotId,
} from "../../../../src/segment/de/nomination.js";
import type { Partition } from "../../../../src/segment/de/partition.js";
import {
	checkedRouteKey,
	keyOf,
	routeCriteria,
} from "../../../../src/segment/de/routes.js";
import {
	askRouteBatches,
	askUnaskedRoutes,
	type RoutedMembership,
	routeMembership,
} from "../../../../src/segment/de/routing.js";
import type {
	Reference,
	Sentence,
} from "../../../../src/segment/de/sentence.js";
import type { SegmentInUnitsOutput } from "../../../evaluation/spec-corpus/segment-in-units.js";
import {
	type Connection,
	type Edge,
	type Routed,
	runStages,
	type Nomination as StageNomination,
	type Stages,
} from "../../harness/stages.js";
import { type Arm, type ArmOptions, askOf } from "../arm.js";

/** The policy of the reference run, which `runFloors` reproduce. */
export const referencePolicy = "step0+saying+closed";

/** The inventory with the AUX Lemmas dumcorpus authored when the reference run was made. */
const referenceInventory = germanInventory({
	auxiliaryLemmas: new Set(["sein", "haben", "werden", "bekommen"]),
});

/** The unit stage's floors and the Saying Choice's floor, counted on whole + fragment. */
export type ReferenceFloors = Floors & {
	/** A Saying span's whole + fragment share. */
	readonly saying: number;
};

/** The reference run's floors (#755): candidates v3's full@0.7 and the Saying Choice at 0.5. */
export const runFloors: ReferenceFloors = {
	satellite: 0.5,
	margin: 0,
	idiom: 0.7,
	expression: 0.7,
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

const isFloorName = (name: string): name is keyof ReferenceFloors =>
	name in runFloors;

const floorNames = Object.keys(runFloors).filter(isFloorName);

/**
 * The floors `--opt` sets, over the reference's own, or over the run's
 * with `--opt floors=run`.
 */
export function floorsOf(options: ArmOptions): ReferenceFloors {
	const base = options.floors ?? "reference";
	if (base !== "reference" && base !== "run")
		throw Error(`--opt floors=${base} must be reference or run`);
	const set: Partial<Record<keyof ReferenceFloors, number>> = {};
	for (const name of floorNames) {
		const value = options[name];
		if (value === undefined) continue;
		const number = Number(value);
		if (!Number.isFinite(number))
			throw Error(`--opt ${name}=${value} is not a number`);
		set[name] = number;
	}
	return { ...(base === "run" ? runFloors : referenceFloors), ...set };
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
 * Every connection the nomination requests judged, with the floors
 * deciding `supported`, and code's rule connections.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
function referenceConnections(
	nomination: Nomination,
	floors: ReferenceFloors = referenceFloors,
): Connection[] {
	const { sentence, first, final, inventory } = nomination;
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
	for (const slot of nomination.slots) {
		if (slot.kind === "idiom" && reasked.has(slot.piece.id)) continue;
		const question = slotId(slot);
		const idiom = slot.kind === "idiom";
		hostConnections(
			slot.kind,
			slot.piece.id,
			question,
			choiceOf(first, question),
			idiom ? floors.idiom : floors.satellite,
			idiom ? 0 : floors.margin,
		);
	}
	for (const id of reasked) {
		const question = reaskedIdiomId(id);
		hostConnections(
			"idiom",
			id,
			question,
			choiceOf(final, question),
			floors.idiom,
			0,
		);
	}
	for (const pair of nomination.pairs) {
		const question = pairId(pair);
		const probability = noulOf(first, question);
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
		const question = correlatorId(pair);
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
	for (const link of nomination.links) {
		const question = expressionId(link.left, link.right);
		connections.push({
			id: question,
			kind: "expression",
			pieces: [link.left, link.right],
			source: "judged",
			question,
			probability: link.probability,
			supported:
				link.probability >= floors.expression &&
				(nomination.fixed.get(link.left) ?? 0) >= floors.fixed &&
				(nomination.fixed.get(link.right) ?? 0) >= floors.fixed,
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
	const articleSlots = nomination.slots.filter(
		(slot) => slot.kind === "article",
	);
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
				inventory.isAdposition(before.surface)
			)
				prepositions.add(`${before.id}_${piece.id}`);
		}
	}
	for (const entry of prepositions)
		rule("preposition", entry.split("_").map(Number), true);
	return connections;
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
			case "rule":
			case "locution":
			case "verb":
			case "government":
				// The reference applies no code rule (#851, X3) and asks no Locution Choice (X5), Verb Choice (D4) or Government Choice (X4).
				return { pieces, rule: "code" };
		}
		throw Error(`Unknown edge source ${source satisfies never}`);
	});
}

/** The answers behind the connections, and every fixedness Noul. */
function judgmentsOf(
	nomination: Nomination,
	connections: readonly Connection[],
): Record<string, Answer> {
	const asked = new Set(
		connections.flatMap((entry) =>
			entry.question ? [entry.question] : [],
		),
	);
	const judgments: Record<string, Answer> = {};
	for (const answers of [
		nomination.first,
		nomination.second,
		nomination.final,
	])
		for (const [id, answer] of Object.entries(answers))
			if (asked.has(id) || id.startsWith("f_")) judgments[id] = answer;
	return judgments;
}

const unitFloors = ({ saying: _saying, ...floors }: ReferenceFloors): Floors =>
	floors;

/** The reference's routing: the routed membership behind its output. */
type ReferenceRouted = Routed & { readonly routed: RoutedMembership };

/** The reference's stages under a setting of its floors. */
export function referenceStagesUnder(
	floors: ReferenceFloors,
	unasked: "ask" | "unresolved" = "ask",
): Stages<Nomination, Membership, ReferenceRouted> {
	return {
		async nominate(input, context) {
			const nomination = await Effect.runPromise(
				nominate(input, askOf(context), referenceInventory),
			);
			const connections = referenceConnections(nomination, floors);
			return {
				pieces: nomination.sentence.pieces.map((piece) => piece.id),
				connections,
				judgments: judgmentsOf(nomination, connections),
				evidence: nomination,
			};
		},
		resolve(nomination) {
			const membership = membershipOf(
				nomination.evidence,
				unitFloors(floors),
				{ floor: floors.saying, maxim: false },
			);
			return {
				partition: membership.partition,
				edges: edgesOf(
					membership.edges,
					nomination.connections,
					membership.ranges,
				),
				detail: membership,
			};
		},
		async route(nomination, membership, context): Promise<ReferenceRouted> {
			const ask = askOf(context);
			const evidence = nomination.evidence;
			const answers = await Effect.runPromise(
				askRouteBatches(evidence, ask),
			);
			const extra =
				unasked === "ask"
					? await Effect.runPromise(
							askUnaskedRoutes(
								evidence,
								answers,
								membership.partition,
								ask,
							),
						)
					: undefined;
			const routed = routeMembership(
				evidence,
				membership.detail,
				answers,
				extra,
			);
			return {
				output: { units: routed.units() },
				partition: routed.partition,
				merges: routed.merges.map(
					([a, b]): Edge => ({
						pieces: [a, b],
						rule: "interjection",
					}),
				),
				routed,
			};
		},
	};
}

export const pickId = (group: readonly number[]) => `pk_${group.join("_")}`;

/**
 * The click-time pick of Dumgen ADR 0007, as a lab
 * prototype: one Choice per unit carrying variants, among those variants
 * only, against the judge state the route requests read. The unit's
 * grouping is fixed; the answer is its one route.
 */
export function pickQuestions(
	nomination: { readonly sentence: Sentence; readonly ref: Reference },
	partition: Partition,
	output: SegmentInUnitsOutput,
): Questions {
	const questions: Questions = {};
	output.units.forEach((unit, index) => {
		const group = partition[index];
		if (!unit.variants || !group) return;
		const refs = group
			.map((id) => {
				const piece = nomination.sentence.pieces[id - 1];
				if (!piece) throw Error(`No piece p${id}`);
				return nomination.ref(piece);
			})
			.join(", ");
		questions[pickId(group)] = choice(
			group.length === 1
				? `In \`sentence\`, the word ${refs} is a unit on its own. Which of these routes does it take here?`
				: `In \`sentence\`, the pieces ${refs} together form one unit. Which of these routes does that whole unit take here?`,
			routeCriteria(
				unit.variants.map((variant) => checkedRouteKey(keyOf(variant))),
				true,
			),
		);
	});
	return questions;
}

/** Each unit with variants takes the route its pick chose, among its variants. */
export function pickedOutput(
	partition: Partition,
	output: SegmentInUnitsOutput,
	picks: Readonly<Record<string, Answer>>,
): SegmentInUnitsOutput {
	return {
		units: output.units.map((unit, index) => {
			const group = partition[index];
			if (!unit.variants || !group) return unit;
			const { variants, ...single } = unit;
			const answer = picks[pickId(group)];
			const picked = variants.find(
				(variant) =>
					answer?.type === "choice" &&
					`${variant.family}/${variant.kind}` === answer.choice,
			);
			return { ...single, route: picked ?? single.route };
		}),
	};
}

const marginsOf = (value: string | undefined, name: string) =>
	(value ?? "")
		.split(",")
		.filter(Boolean)
		.map((entry) => {
			const margin = Number(entry);
			if (!Number.isFinite(margin) || margin < 0)
				throw Error(`--opt ${name}=${value} must list margins`);
			return margin;
		});

/**
 * Running the reference through the lab, or replaying its run with `--opt
 * floors=run`; `--opt` moves its floors, and the policy is named after the
 * floors moved from the run's. `--opt unasked=unresolved` asks nothing for
 * groups no batched route request asked about.
 *
 * `--opt variants=0.1,0.2` adds a policy per margin whose borderline units
 * carry route variants (`<policy>+variants@0.1`); they read the same
 * answers. `--opt pick=0.1` also asks the click-time pick for the units
 * carrying variants at that margin, a fresh `pick` request, and adds
 * `<policy>+variants@0.1+pick` with the picked routes.
 */
export const referenceArm: Arm = {
	id: "reference",
	summary:
		"The #755 candidate reference (candidates4 final=1 closed=1, step0+saying+closed) behind nomination, membership and routing stages, with the floors #762 adopted, route variants and the click-time pick (#760)",
	async run(input, context) {
		const floors = floorsOf(context.options);
		const unasked = context.options.unasked ?? "ask";
		if (unasked !== "ask" && unasked !== "unresolved")
			throw Error(`--opt unasked=${unasked} must be ask or unresolved`);
		const variantMargins = marginsOf(context.options.variants, "variants");
		const [pickMargin, ...more] = marginsOf(context.options.pick, "pick");
		if (more.length > 0) throw Error("--opt pick takes one margin");
		const stages = referenceStagesUnder(floors, unasked);
		let evidence: Nomination | undefined;
		let routed: RoutedMembership | undefined;
		const { output } = await runStages(
			{
				...stages,
				nominate: async (stageInput, stageContext) => {
					const nomination: StageNomination<Nomination> =
						await stages.nominate(stageInput, stageContext);
					evidence = nomination.evidence;
					return nomination;
				},
				route: async (nomination, membership, stageContext) => {
					const result = await stages.route(
						nomination,
						membership,
						stageContext,
					);
					routed = result.routed;
					return result;
				},
			},
			input,
			context,
		);
		const policy = floorsKey(floors);
		const outputs: Record<string, SegmentInUnitsOutput> = {
			[policy]: output,
		};
		if (!routed || !evidence) throw Error("The reference did not route");
		for (const margin of variantMargins)
			outputs[`${policy}+variants@${margin}`] = {
				units: routed.units(margin),
			};
		if (pickMargin !== undefined) {
			const withVariants = { units: routed.units(pickMargin) };
			const picks = await Effect.runPromise(
				askOf(context)({
					stage: "pick",
					state: evidence.state,
					questions: pickQuestions(
						evidence,
						routed.partition,
						withVariants,
					),
				}),
			);
			outputs[`${policy}+variants@${pickMargin}`] = withVariants;
			outputs[`${policy}+variants@${pickMargin}+pick`] = pickedOutput(
				routed.partition,
				withVariants,
				picks,
			);
		}
		return { primary: policy, outputs };
	},
};
