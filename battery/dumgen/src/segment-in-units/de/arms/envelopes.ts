/**
 * Jev proposes first/last member envelopes, then assigns each piece to one
 * envelope or itself. An envelope bounds possible members; it never claims
 * intervening free words. The final request judges the assigned exact masks.
 */
import { rules } from "dumspec";
import type { Questions } from "promptsmith/typesafe";
import type { SegmentInUnitsInput } from "../../../evaluation/spec-corpus/segment-in-units.js";
import { choice, choiceOf, noul, noulOf } from "../../lab/jev.js";
import {
	type Arm,
	type ArmContext,
	type ArmResult,
	judgeState,
	numberOption,
} from "../arm.js";
import { groupKey, outputOf } from "../partition.js";
import {
	markedText,
	pieceById,
	type Sentence,
	sentenceOf,
} from "../sentence.js";
import { judgeUnitGroups, type UnitGroupJudgments } from "../unit-groups.js";

export type Envelope = {
	readonly key: string;
	readonly first: number;
	readonly last: number;
	readonly firstProbability: number;
	readonly lastShare: number;
	readonly span: string;
};

export type EnvelopeResult = ArmResult & {
	readonly diagnostics: {
		readonly stages: readonly {
			readonly stage: string;
			readonly questions: number;
			readonly options: number;
			readonly serializedBytes: number;
			readonly stateBytes: number;
			readonly longestQuestionBytes: number;
		}[];
		readonly preflightFailures: readonly {
			readonly stage: string;
			readonly piece: number;
			readonly options: number;
		}[];
	};
	readonly inventoryDecisions: UnitGroupJudgments["inventoryDecisions"];
	readonly boundaries: readonly {
		readonly piece: number;
		readonly probability: number;
		readonly last?: number;
		readonly share: number;
		readonly bounded: boolean;
	}[];
	readonly envelopes: readonly Envelope[];
	readonly members: readonly {
		readonly piece: number;
		readonly owner: string;
		readonly share: number;
		readonly forced: boolean;
	}[];
	readonly masks: readonly {
		readonly owner: string;
		readonly group: readonly number[];
		readonly endpointsPresent: boolean;
		readonly marked: string;
	}[];
	readonly support: readonly {
		readonly group: readonly number[];
		readonly probability: number;
	}[];
	readonly identityHints: readonly {
		readonly sourceSegment: number;
		readonly candidateGroup: string;
		readonly share: number;
		readonly confidence: number;
	}[];
};

// These are policy references, not lexical heuristics. The statements come
// directly from the authority that also defines the reference annotations.
const membershipRuleIds = new Set([
	"de/largest-fixed-unit",
	"de/fixed-members-only",
	"de/locutions-and-sayings-are-made-of-lexemes",
	"de/unresolved-over-repair",
	"de/verb-owns-its-scattered-members",
	"de/expletive-es-joins-its-verb",
	"de/governed-preposition-joins-its-governor",
	"de/split-adverb-is-one-target",
	"de/pronominal-adverb-stands-alone",
	"de/modal-is-a-verb",
	"de/auxiliary-joins-the-verb-it-serves",
	"de/copula-stays-apart",
	"de/noun-owns-its-article",
	"de/only-der-and-ein-are-articles",
	"de/shared-article-in-coordination",
	"de/fused-word-pieces",
	"de/attributive-adjective-stands-alone",
	"de/bare-infinitive-zu",
	"de/fixed-member-test",
	"de/funktionsverbgefuege-are-collocations",
	"de/idiom",
	"de/saying-needs-uptake",
	"de/modification-attests-partially",
	"de/partial-coverage",
]);
const membershipRules = Object.fromEntries(
	rules
		.filter((rule) => membershipRuleIds.has(rule.id))
		.map((rule) => [rule.id, rule.statement]),
);

const startId = (piece: number) => `envelope_first_${piece}`;
const lastId = (piece: number) => `envelope_last_${piece}`;
const memberId = (piece: number) => `envelope_member_${piece}`;
const envelopeKey = (first: number, last: number) => `e_${first}_${last}`;
const singletonKey = (piece: number) => `s_${piece}`;

/** An exact written region, including its original whitespace/punctuation. */
function sourceSpan(sentence: Sentence, first: number, last: number): string {
	const left = sentence.pieces[first - 1];
	const right = sentence.pieces[last - 1];
	if (!left || !right) throw Error("Unknown envelope endpoint");
	return `⟦${sentence.segments
		.slice(left.segment, right.segment + 1)
		.map((segment) => segment.text)
		.join("")}⟧`;
}

// Serialized UTF-8 bytes expose payload growth, not an inference-token estimate.
function requestSize(stage: string, state: unknown, questions: Questions) {
	const bytes = (value: unknown) =>
		new TextEncoder().encode(JSON.stringify(value)).byteLength;
	return {
		stage,
		questions: Object.keys(questions).length,
		options: Object.values(questions).reduce(
			(sum, question) =>
				sum +
				(question.type === "choice"
					? Object.keys(question.criteria).length
					: 0),
			0,
		),
		serializedBytes: bytes({ state, questions }),
		stateBytes: bytes(state),
		longestQuestionBytes: Math.max(
			0,
			...Object.values(questions).map(bytes),
		),
	};
}

export async function runEnvelopes(
	input: SegmentInUnitsInput,
	context: ArmContext,
	unresolvedSourceSegments: readonly number[] = [],
): Promise<EnvelopeResult> {
	const sentence = sentenceOf(input);
	const { state, ref } = judgeState(sentence, context);
	const sourceUnresolved = new Set(unresolvedSourceSegments);
	const forced = new Set(
		sentence.pieces
			.filter((piece) => sourceUnresolved.has(piece.segment))
			.map((piece) => piece.id),
	);
	const policyState = {
		...state,
		membership_rules: membershipRules,
		envelope_policy:
			"A unit is one dictionary unit under membership_rules, with its required satellites; an ordinary grammatical phrase is not a unit. A subject/object pronoun, free argument, attributive adjective or numeral stays separate. A free preposition stays separate from the article+noun unit of its complement. A modal stays separate from its infinitive, infinitive zu from its verb, and a copula from its predicate. Apply exceptions only when the rules license that exact lexical expression. An envelope is merely the source region between a unit's first and last actual members. Gaps, overlapping envelopes and crossing discontinuous units are allowed; each piece still belongs to only one unit.",
	};
	const boundaryQuestions: Questions = {};
	const preflightFailures: EnvelopeResult["diagnostics"]["preflightFailures"][number][] =
		[];
	const ends = new Map<number, Set<number>>();
	for (const piece of sentence.pieces) {
		if (forced.has(piece.id)) continue;
		const candidates = sentence.pieces.filter(
			(candidate) =>
				candidate.id >= piece.id && !forced.has(candidate.id),
		);
		// Never truncate possible endpoints. A missing envelope must fall back
		// to separate exact masks, which the final membership judge may reject.
		if (candidates.length + 1 > 255) {
			preflightFailures.push({
				stage: "envelopes-boundaries",
				piece: piece.id,
				options: candidates.length + 1,
			});
			continue;
		}
		ends.set(
			piece.id,
			new Set(candidates.map((candidate) => candidate.id)),
		);
		boundaryQuestions[startId(piece.id)] = noul(
			`In \`sentence\`, is ${ref(piece)} the first actual member in source order of its biggest dictionary unit? Use \`membership_rules\` and \`envelope_policy\`. A unit on its own begins at its sole member. The first member can be an article, auxiliary, or fixed function word; it need not be the grammatical Head.`,
			{
				true: "No earlier piece belongs to this same biggest unit",
				false: "An earlier piece belongs to this same biggest unit",
			},
		);
		boundaryQuestions[lastId(piece.id)] = choice(
			`Assume ${ref(piece)} is the first actual member of one biggest dictionary unit in \`sentence\`. Which option shows the last actual member of that same unit? This is conditional on that assumption, independent of the first-member judgment. Each marked region is only an envelope: it may contain free words belonging to other units. Use \`membership_rules\` and \`envelope_policy\`; do not enlarge the unit to a grammatical phrase.`,
			{
				...Object.fromEntries(
					candidates.map((candidate) => [
						`p${candidate.id}`,
						`${sourceSpan(sentence, piece.id, candidate.id)} — last member ${ref(candidate)}; the interior may contain free gaps`,
					]),
				),
				Unresolved: "No defensible last member under this assumption",
			},
		);
	}
	const boundaryAnswers = await context.jev.ask({
		stage: "envelopes-boundaries",
		state: policyState,
		questions: boundaryQuestions,
		repetition: context.repetition,
		calls: context.calls,
	});
	const boundaries = sentence.pieces.map((piece) => {
		if (!ends.has(piece.id))
			return {
				piece: piece.id,
				probability: 0,
				share: 0,
				bounded: false,
			};
		const answer = choiceOf(boundaryAnswers, lastId(piece.id));
		const last = /^p\d+$/u.test(answer.choice)
			? Number(answer.choice.slice(1))
			: undefined;
		return {
			piece: piece.id,
			probability: noulOf(boundaryAnswers, startId(piece.id)),
			...(last !== undefined && ends.get(piece.id)?.has(last)
				? { last }
				: {}),
			share: answer.probabilities[answer.choice] ?? 0,
			bounded: true,
		};
	});
	const firstFloor = numberOption(context.options, "firstFloor", 0.5);
	const envelopes: Envelope[] = boundaries.flatMap((boundary) =>
		boundary.probability >= firstFloor &&
		boundary.last !== undefined &&
		boundary.last > boundary.piece
			? [
					{
						key: envelopeKey(boundary.piece, boundary.last),
						first: boundary.piece,
						last: boundary.last,
						firstProbability: boundary.probability,
						lastShare: boundary.share,
						span: sourceSpan(
							sentence,
							boundary.piece,
							boundary.last,
						),
					},
				]
			: [],
	);
	const memberQuestions: Questions = {};
	const optionsByPiece = new Map<number, Set<string>>();
	for (const piece of sentence.pieces) {
		if (forced.has(piece.id)) continue;
		const candidates = envelopes.filter(
			(candidate) =>
				candidate.first <= piece.id && candidate.last >= piece.id,
		);
		if (candidates.length + 2 > 255) {
			preflightFailures.push({
				stage: "envelopes-members",
				piece: piece.id,
				options: candidates.length + 2,
			});
			forced.add(piece.id);
			continue;
		}
		const criteria = {
			...Object.fromEntries(
				candidates.map((candidate) => [
					candidate.key,
					`${candidate.span} — the dictionary unit beginning with ${ref(pieceById(sentence, candidate.first))} and ending with ${ref(pieceById(sentence, candidate.last))}. Choose only if this piece is an actual member, not merely inside the envelope.`,
				]),
			),
			[singletonKey(piece.id)]:
				`${sourceSpan(sentence, piece.id, piece.id)} — this piece alone is a separate unit, including an attested Partial unit if the rules license it`,
			Unresolved: "No available exact unit membership is defensible",
		};
		optionsByPiece.set(piece.id, new Set(Object.keys(criteria)));
		memberQuestions[memberId(piece.id)] = choice(
			`Which one dictionary unit does ${ref(piece)} actually belong to in \`sentence\`? Apply \`membership_rules\` and \`envelope_policy\`. Choose an envelope only when this piece belongs to the unit whose specified first and last pieces are members. Every actual member of a unit must choose that same envelope. Free words inside an envelope choose their own unit. Envelopes can overlap or cross; source proximity or ordinary syntax never creates membership.`,
			criteria,
		);
	}
	const memberAnswers = await context.jev.ask({
		stage: "envelopes-members",
		state: policyState,
		questions: memberQuestions,
		repetition: context.repetition,
		calls: context.calls,
	});
	const members = sentence.pieces.map((piece) => {
		if (forced.has(piece.id))
			return {
				piece: piece.id,
				owner: singletonKey(piece.id),
				share: 0,
				forced: true,
			};
		const answer = choiceOf(memberAnswers, memberId(piece.id));
		const valid =
			answer.choice !== "Unresolved" &&
			optionsByPiece.get(piece.id)?.has(answer.choice);
		if (!valid) forced.add(piece.id);
		return {
			piece: piece.id,
			owner: valid ? answer.choice : singletonKey(piece.id),
			share: answer.probabilities[answer.choice] ?? 0,
			forced: !valid,
		};
	});
	const byOwner = new Map<string, number[]>();
	for (const member of members) {
		const group = byOwner.get(member.owner) ?? [];
		group.push(member.piece);
		byOwner.set(member.owner, group);
	}
	const envelopesByKey = new Map(
		envelopes.map((envelope) => [envelope.key, envelope]),
	);
	const masks = [...byOwner.entries()]
		.map(([owner, group]) => {
			const envelope = envelopesByKey.get(owner);
			return {
				owner,
				group,
				endpointsPresent:
					envelope === undefined ||
					(group.includes(envelope.first) &&
						group.includes(envelope.last)),
				marked: markedText(sentence, group),
			};
		})
		.sort((left, right) => (left.group[0] ?? 0) - (right.group[0] ?? 0));
	const groups = masks.map((mask) => mask.group);
	const known = groups.filter((group) => !group.some((id) => forced.has(id)));
	const judged = await judgeUnitGroups(
		sentence,
		known,
		{
			...context,
			options: { ...context.options, singletonRoutes: "all" },
		},
		"envelopes-final",
	);
	const routes = new Map(
		known.map((group) => {
			const key = groupKey(group);
			const answer = choiceOf(judged.answers, `r_${group.join("_")}`);
			// The shared reader may infer a Lexeme from a catalog candidate. That
			// implication is valid only after the whole route selects a Lexeme.
			const route = answer.choice.startsWith("Lexeme/")
				? judged.routes.get(key)
				: {
						group,
						choice: answer.choice,
						confidence: answer.confidence,
						share: answer.probabilities[answer.choice] ?? 0,
						source: "open" as const,
					};
			if (!route) throw Error(`Missing route for ${key}`);
			return [key, route] as const;
		}),
	);
	const supportByGroup = new Map(
		judged.support.map((item) => [groupKey(item.group), item.probability]),
	);
	const validByGroup = new Map(
		masks.map((mask) => [groupKey(mask.group), mask.endpointsPresent]),
	);
	const closed = context.options.closed === "1";
	const policies = [
		{ name: "raw", endpoints: false, support: 0, route: 0 },
		{ name: "endpoints", endpoints: true, support: 0, route: 0 },
		...[0.5, 0.7, 0.8].map((floor) => ({
			name: `support@${floor}`,
			endpoints: true,
			support: floor,
			route: 0,
		})),
		{
			name: "support@0.7+route@0.5",
			endpoints: true,
			support: 0.7,
			route: 0.5,
		},
	];
	const outputs: ArmResult["outputs"] = Object.fromEntries(
		policies.flatMap((policy) =>
			(closed ? [false, true] : [false]).map((withClosed) => [
				`${policy.name}${withClosed ? "+closed" : ""}`,
				outputOf(sentence, groups, (group) => {
					const key = groupKey(group);
					const route = routes.get(key);
					if (
						group.some((id) => forced.has(id)) ||
						!route ||
						(policy.endpoints && !validByGroup.get(key)) ||
						(supportByGroup.get(key) ?? 0) < policy.support
					)
						return "Unresolved";
					// Catalog interpretation refines a selected Lexeme; it cannot turn
					// a licensed Partial Locution/Saying or a deliberate abstention
					// into an unrelated one-word target.
					const overlay =
						withClosed && route.choice.startsWith("Lexeme/")
							? judged.closedRoutes.get(key)
							: undefined;
					const chosen = overlay ?? route;
					return chosen.confidence < policy.route
						? "Unresolved"
						: chosen.choice;
				}),
			]),
		),
	);
	return {
		primary: `support@0.7${closed ? "+closed" : ""}`,
		outputs,
		routes: [...routes.values()],
		boundaries,
		envelopes,
		members,
		masks,
		support: judged.support,
		identityHints: judged.identityHints,
		inventoryDecisions: judged.inventoryDecisions,
		diagnostics: {
			stages: [
				requestSize(
					"envelopes-boundaries",
					policyState,
					boundaryQuestions,
				),
				requestSize("envelopes-members", policyState, memberQuestions),
			],
			preflightFailures,
		},
	};
}

export const envelopesArm = {
	id: "envelopes",
	summary:
		"First/last envelopes, exclusive membership masks, then exact membership and route judgments",
	run: runEnvelopes,
} satisfies Arm;
