/**
 * The flags of the Government Choice (`government-choice.ts`): which
 * prepositions code asks the `government` request about, one flag each, by
 * family (see that module for what each family means).
 */

import type { Membership } from "./assembly.js";
import { isArticle, nounLike } from "./candidates.js";
import { boundPieces, type CodeRule } from "./code-rules.js";
import { type Nomination, reaskedIdiomId, slotId } from "./nomination.js";
import { argmax } from "./partition.js";
import type { Piece } from "./sentence.js";

export const governmentFamilies = [
	"joined",
	"particle",
	"rival",
	"weak",
	"literal",
	"duel",
] as const;

export type GovernmentFamily = (typeof governmentFamilies)[number];

/**
 * One flagged preposition and the word that may govern it; for `literal`,
 * the idiom unit's preposition, its verb and the member noun it opens.
 */
export type GovernmentFlag = {
	readonly family: GovernmentFamily;
	readonly piece: number;
	readonly host: number;
	readonly noun?: number;
	/** For `duel`: every preposition of that spelling flagged with the host. */
	readonly rivals?: readonly number[];
};

const lower = (piece: Piece) => piece.text.toLowerCase();

/** The share a satellite's host needs: production's satellite floor. */
const satelliteFloor = 0.5;
/** A host share that flags a lone preposition. */
const weakFlag = 0.3;

/** A slot's hosts other than `none`, most probable first, and `none`'s share. */
function slotHosts(
	nomination: Nomination,
	kind: "particle" | "preposition",
	piece: Piece,
): { readonly hosts: [number, number][]; readonly none: number } {
	const slot = nomination.slots.find(
		(candidate) =>
			candidate.kind === kind && candidate.piece.id === piece.id,
	);
	const answer = slot ? nomination.first[slotId(slot)] : undefined;
	if (answer?.type !== "choice") return { hosts: [], none: 1 };
	return {
		hosts: Object.entries(answer.probabilities)
			.filter(([key]) => key !== "none")
			.map(([key, share]): [number, number] => [
				Number(key.slice(1)),
				share,
			])
			.sort((a, b) => b[1] - a[1]),
		none: answer.probabilities.none ?? 0,
	};
}

/** Whether the piece right after `piece`, with only whitespace between, may open its phrase: an article, a pronoun or determiner, a noun or a number. */
function opensPhrase(nomination: Nomination, piece: Piece): boolean {
	const { pieces, segments } = nomination.sentence;
	const next = pieces[piece.id];
	if (
		!next ||
		next.clause !== piece.clause ||
		!segments
			.slice(piece.segment + 1, next.segment)
			.every((segment) => segment.kind === "Whitespace")
	)
		return false;
	return (
		isArticle(next) ||
		nounLike(next) ||
		/^\p{N}/u.test(next.text) ||
		nomination.inventory.identityCandidates(next.text).length > 0
	);
}

/**
 * The idiom units that took in a member noun's preposition: a `preposition`
 * edge from a noun whose idiom slot's host, a word other than that
 * preposition, is in the noun's unit through an expression link.
 */
function literalFlags(
	nomination: Nomination,
	membership: Membership,
	groupOf: ReadonlyMap<number, readonly number[]>,
	open: (id: number) => boolean,
): GovernmentFlag[] {
	const flags: GovernmentFlag[] = [];
	const seen = new Set<readonly number[]>();
	for (const edge of membership.edges) {
		if (edge.source !== "preposition") continue;
		const [noun, preposition] = edge.pieces;
		const group = groupOf.get(noun);
		if (!group || seen.has(group) || !group.every(open)) continue;
		const host = nomination.slotAnswers.find(
			(link) => link.kind === "idiom" && link.from === noun,
		)?.to;
		const reasked = nomination.final[reaskedIdiomId(noun)];
		const step0 =
			reasked?.type === "choice"
				? Number(
						argmax(
							Object.fromEntries(
								Object.entries(reasked.probabilities).filter(
									([key]) => key !== "none",
								),
							),
						).key?.slice(1),
					)
				: undefined;
		const verb = [host, step0].find(
			(id) =>
				id !== undefined &&
				Number.isFinite(id) &&
				id !== preposition &&
				group.includes(id) &&
				membership.edges.some(
					(other) =>
						other.source === "expression" &&
						other.pieces.includes(id) &&
						other.pieces.includes(noun),
				),
		);
		if (verb === undefined) continue;
		seen.add(group);
		flags.push({ family: "literal", piece: preposition, host: verb, noun });
	}
	return flags;
}

/** The prepositions code asks about, one flag each, over a membership the code rules applied to. */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
export function flaggedPrepositions(
	nomination: Nomination,
	membership: Membership,
	rules: readonly CodeRule[],
): GovernmentFlag[] {
	const { pieces } = nomination.sentence;
	const groupOf = new Map<number, readonly number[]>();
	for (const group of membership.partition)
		for (const id of group) groupOf.set(id, group);
	const saying = new Set(
		membership.edges
			.filter((edge) => edge.source === "saying")
			.flatMap((edge) => edge.pieces),
	);
	const bound = boundPieces(nomination, membership, rules);
	const open = (id: number) => !saying.has(id) && !bound.has(id);
	const together = (a: number, b: number) =>
		groupOf.get(a) !== undefined && groupOf.get(a) === groupOf.get(b);
	const satellite = new Set(
		membership.edges
			.filter((edge) => edge.source === "satellite")
			.map((edge) => `${edge.pieces[0]},${edge.pieces[1]}`),
	);
	const kindOf = new Map(
		nomination.slotAnswers.map((link) => [
			`${link.from},${link.to}`,
			link.kind,
		]),
	);
	const flags = new Map<string, GovernmentFlag>();
	const flag = (family: GovernmentFamily, piece: number, host: number) => {
		if (!open(piece) || !open(host) || piece === host) return;
		const key = `${piece},${host}`;
		if (!flags.has(key)) flags.set(key, { family, piece, host });
	};
	for (const piece of pieces) {
		if (!nomination.inventory.isAdposition(piece.surface)) continue;
		for (const [key, kind] of kindOf) {
			const [from, to] = key.split(",").map(Number);
			if (from !== piece.id || to === undefined || !satellite.has(key))
				continue;
			if (kind === "preposition") flag("joined", piece.id, to);
			else if (
				kind === "particle" &&
				!piece.fusedWord &&
				opensPhrase(nomination, piece)
			)
				flag("particle", piece.id, to);
		}
		const { hosts, none } = slotHosts(nomination, "preposition", piece);
		const [top] = hosts;
		if (!top || top[1] <= none || together(piece.id, top[0])) continue;
		if (top[1] >= satelliteFloor) flag("rival", piece.id, top[0]);
		else if (top[1] >= weakFlag && groupOf.get(piece.id)?.length === 1)
			flag("weak", piece.id, top[0]);
	}
	// A host spelled the same and nearer the preposition may be its governor (Danke, danke für).
	for (const { piece, host } of [...flags.values()]) {
		const text = pieces[host - 1]?.text.toLowerCase();
		for (const twin of pieces)
			if (
				twin.id !== host &&
				lower(twin) === text &&
				Math.abs(twin.id - piece) < Math.abs(host - piece) &&
				!together(piece, twin.id)
			)
				flag("rival", piece, twin.id);
	}
	// ADR 0034: a Preposition complement appears once in a frame.
	const byHost = new Map<string, number[]>();
	for (const { piece, host } of flags.values()) {
		const key = `${host},${pieces[piece - 1]?.text.toLowerCase()}`;
		byHost.set(key, [...(byHost.get(key) ?? []), piece]);
	}
	const duels: GovernmentFlag[] = [];
	for (const [key, rivals] of byHost) {
		const host = Number(key.split(",")[0]);
		const sorted = [...new Set(rivals)].sort((a, b) => a - b);
		const [first] = sorted;
		if (first !== undefined && sorted.length > 1)
			duels.push({ family: "duel", piece: first, host, rivals: sorted });
	}
	return [
		...flags.values(),
		...literalFlags(nomination, membership, groupOf, open),
		...duels,
	];
}
