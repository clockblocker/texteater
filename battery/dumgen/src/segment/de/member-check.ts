/**
 * The member check (#1325): de/fixed-member-test asked of every member of
 * each Locution membership assembled, beside the rest of it. Assembly
 * joins a Locution through links that cleared their floors, an idiom host
 * share of 0.7 or an expression Noul of 0.7, and nothing tested those
 * links against the Rule again: a subject or object the judge heard as an
 * idiom's noun stayed in (Wir stellen die Daten zur Verfügung gave one
 * unit over die Daten, nahm Rücksicht auf ihre Kollegen took Kollegen),
 * and so did a second verb an expression link reached (hat … gezogen of
 * another clause). The judge tells such a free part when asked
 * (de/fixed-members-only): the Locution Choice's answers on these
 * sentences read die Daten, das Team and den Workshop free at 0.7 to
 * 0.98.
 *
 * A Locution's members are its pieces grouped by the links that build
 * Lexemes: an article, auxiliary, particle or reflexive with its word, a
 * fused word's pieces, a pair, a code rule's link, and a member noun's
 * opening preposition with that noun when nothing else holds the
 * preposition. Each member of a Locution with two or more is asked, in
 * the `locution` request beside the Locution Choice's merges; a member
 * the judge reads free leaves the unit with everything it carries, and a
 * unit left with one member is that member's Lexeme. The Rule guards stand: no member is asked that
 * the Rules keep apart (`keptApart`) or a code rule decides, and no Saying
 * or number range is checked.
 */
import type { Questions } from "@typesafe-ai/sdk";
import type { Answers } from "../ask.js";
import type { AssembledEdge, Family, Membership } from "./assembly.js";
import { fixedMemberQuestion, keptApart } from "./fixed-member.js";
import type { Nomination } from "./nomination.js";
import { groupKey, type Partition, partitionOf } from "./partition.js";

/** One member of an assembled Locution, asked beside the rest of it. */
export type MemberCheck = {
	readonly unit: readonly number[];
	readonly member: readonly number[];
};

/** The links that build a Lexeme, which group a Locution's pieces into its members. */
const lexemeSources: ReadonlySet<AssembledEdge["source"]> = new Set([
	"satellite",
	"pair",
	"superlative",
	"sibling",
	"rule",
	"verb",
	"government",
]);

/**
 * A unit's members: its pieces grouped by the links that build Lexemes,
 * and a noun's opening preposition with that noun when no such link holds
 * the preposition.
 */
function membersOf(
	unit: readonly number[],
	edges: readonly AssembledEdge[],
): Partition {
	const inUnit = new Set(unit);
	const own = edges.filter(
		({ pieces: [a, b] }) => inUnit.has(a) && inUnit.has(b),
	);
	const lexeme = own.filter(
		(edge) =>
			lexemeSources.has(edge.source) && edge.pieces[0] !== edge.pieces[1],
	);
	const held = new Set(lexeme.flatMap((edge) => edge.pieces));
	const opening = own.filter(
		(edge) => edge.source === "preposition" && !held.has(edge.pieces[1]),
	);
	return partitionOf(
		unit,
		[...lexeme, ...opening].map(({ pieces }) => pieces),
	);
}

/**
 * The members to ask about: of each Locution of two or more members in
 * `ruled`, outside a Saying or a number range, each member that holds no
 * piece a code rule decides (`bound`) and that the Rules don't keep apart.
 */
export function memberChecks(
	nomination: Nomination,
	ruled: Membership,
	bound: ReadonlySet<number>,
): MemberCheck[] {
	const saying = new Set(
		ruled.edges
			.filter((edge) => edge.source === "saying")
			.flatMap((edge) => edge.pieces),
	);
	const ranged = new Set(ruled.ranges.flat());
	const checks: MemberCheck[] = [];
	for (const unit of ruled.partition) {
		if (
			unit.length < 2 ||
			ruled.familyOf(unit) !== "Locution" ||
			unit.some((id) => saying.has(id) || ranged.has(id))
		)
			continue;
		const members = membersOf(unit, ruled.edges);
		if (members.length < 2) continue;
		for (const member of members)
			if (
				!member.some((id) => bound.has(id)) &&
				!keptApart(nomination, member)
			)
				checks.push({ unit, member });
	}
	return checks;
}

const memberCheckId = (check: MemberCheck) =>
	`lm_${check.unit.join("_")}_m_${check.member.join("_")}`;

/** The member check's questions: de/fixed-member-test of each member beside the rest of its unit. */
export function memberCheckQuestions(
	nomination: Nomination,
	checks: readonly MemberCheck[],
): Questions {
	const questions: Questions = {};
	for (const check of checks)
		questions[memberCheckId(check)] = fixedMemberQuestion(
			nomination,
			check.member,
			check.unit.filter((id) => !check.member.includes(id)),
			check.unit,
			"member",
		);
	return questions;
}

/**
 * The members whose `free` share reaches `share`: they leave their unit.
 * Only a free reading moves a member. On dev the judge put much of its
 * mass on `none` for a support verb's noun (stellte einen Antrag, trifft
 * die Entscheidung), which are members, and read the free subjects and
 * objects of the swallowed units free at 0.84 to 0.94 (#1325).
 */
export function freeMembers(
	checks: readonly MemberCheck[],
	answers: Answers,
	share: number,
): MemberCheck[] {
	return checks.filter((check) => {
		const answer = answers[memberCheckId(check)];
		return (
			answer?.type === "choice" &&
			(answer.probabilities.free ?? 0) >= share
		);
	});
}

/**
 * The membership with each free member out of its unit: every link
 * between the member and a piece outside it drops. A group a unit left
 * with at most one of its members takes the Family its own links give it:
 * a Locution only when it holds an accepted correlator or circumposition,
 * else a Lexeme.
 */
export function withoutFreeMembers(
	nomination: Pick<Nomination, "sentence" | "accepted">,
	membership: Membership,
	ruled: Pick<Membership, "edges">,
	free: readonly MemberCheck[],
): Membership {
	if (free.length === 0) return membership;
	const crosses = (edge: AssembledEdge) =>
		free.some(({ member }) => {
			const [a, b] = edge.pieces.map((id) => member.includes(id));
			return a !== b;
		});
	const edges = membership.edges.filter((edge) => !crosses(edge));
	const partition = partitionOf(
		nomination.sentence.pieces.map((piece) => piece.id),
		edges.map(({ pieces }) => pieces),
	);
	const anchored = new Set(
		nomination.accepted
			.filter(
				([, , kind]) =>
					kind === "correlator" || kind === "circumposition",
			)
			.flat()
			.filter((id): id is number => typeof id === "number"),
	);
	const left = new Map<string, Partition>();
	for (const { unit } of free)
		left.set(groupKey(unit), membersOf(unit, ruled.edges));
	const familyOf = (group: readonly number[]): Family => {
		for (const [key, members] of left) {
			const unit = key.split(",").map(Number);
			if (!group.every((id) => unit.includes(id))) continue;
			const held = members.filter((member) =>
				member.some((id) => group.includes(id)),
			);
			if (held.length > 1) break;
			return group.length > 1 && group.some((id) => anchored.has(id))
				? "Locution"
				: "Lexeme";
		}
		return membership.familyOf(group);
	};
	return { ...membership, edges, partition, familyOf };
}
