/**
 * The Locution Choice (#851, X5): one follow-up request, `locution`, for
 * fixed expressions membership left in pieces. Nomination often hears an
 * expression and assembly still splits it, because its link stayed under a
 * floor: an idiom host share of 0.3 to 0.7 (die Katze im Sack … gekauft),
 * an expression Noul of 0.5 to 0.7 (bitte schön), or a fixedness Noul under
 * 0.5 for one member (Blase … Trübsal). Code turns each such link between
 * two of the membership's units into one question about the two units
 * read together as one wording, and the judge weighs that wording whole: one
 * established expression with every word fixed (de/fixed-member-test,
 * de/largest-fixed-unit), an expression with some words outside it, the
 * words used literally (de/idiom), or a free combination
 * (de/fixed-members-only). A merge the judge reads as whole joins the two
 * units into a Locution, with its members' fused pieces and a member noun's
 * opening preposition (de/fused-word-pieces), and the code rules apply
 * again over it.
 *
 * Code also proposes bleiben with an infinitive, a Noul each
 * (de/bleiben-with-an-infinitive): one Locution only when the pair has a
 * dictionary meaning of its own (stecken bleiben), not bleiben meaning stay.
 *
 * No merge touches a piece a code rule decides (`boundPieces`), nor a
 * Saying. A Sentence with no candidate asks nothing.
 */
import { closedVerbForms } from "dumspec/inventories";
import type { Questions } from "promptsmith/typesafe";
import { type Answers, type Ask, askAny, choice, noul } from "../ask.js";
import {
	type AssembledEdge,
	absorbedEdges,
	articleHosts,
	type Membership,
} from "./assembly.js";
import { boundPieces, type CodeRule, withCodeRules } from "./code-rules.js";
import { type Nomination, reaskedIdiomId, slotId } from "./nomination.js";
import { argmax, groupKey, partitionOf } from "./partition.js";
import { joinRefs, type Piece } from "./sentence.js";

/** How the Locution Choice's answers become merges. */
export type LocutionSettings = {
	/** The share of `whole` a merge needs, and the bleiben Noul's floor. */
	readonly floor: number;
	/** Whether a merged unit absorbs its members' fused pieces and a noun's opening preposition. */
	readonly absorb: boolean;
	/** Whether a bleiben pair the judge accepts merges. */
	readonly bleiben: boolean;
};

/** The setting X5 screens first: a whole share of 0.5, absorbing, with bleiben. */
export const locutionSettings: LocutionSettings = {
	floor: 0.5,
	absorb: true,
	bleiben: true,
};

/** Below its floor, an idiom host share that still flags a merge. */
const idiomFlag = 0.25;
/** Below its floor, an expression Noul that still flags a merge. */
const expressionFlag = 0.5;

/** Two units of the membership the judge weighs as one wording. */
export type MergeCandidate = {
	readonly left: readonly number[];
	readonly right: readonly number[];
};

/** A bleiben form and the infinitive it may form one verb with. */
export type BleibenCandidate = {
	readonly bleiben: Piece;
	readonly infinitive: Piece;
};

const bleibenForms = new Set(
	"bleibe bleibst bleibt bleiben bleibet blieb bliebst blieben bliebt bliebe bliebest bliebet geblieben".split(
		" ",
	),
);

/** Closed verb forms (sein, haben, werden, the modals): never the infinitive of bleiben's pair. */
const closedForms = new Set(
	Object.values(closedVerbForms).flatMap((forms) =>
		forms.map((form) => form.toLowerCase()),
	),
);

const lower = (piece: Piece) => piece.text.toLowerCase();

/** Adverbs with an infinitive's ending. */
const adverbsInEn = new Set(
	"drinnen draußen oben unten innen außen hinten vorn morgen übermorgen gestern vorgestern eben neben zusammen selten".split(
		" ",
	),
);

/**
 * A lowercase word with an infinitive's ending that no closed verb or
 * bleiben form spells, and no participle in ge- (bleibt geschlossen is a
 * copula and its predicate, de/copula-stays-apart).
 */
const infinitiveShaped = (piece: Piece) =>
	/^\p{Ll}+(en|ern|eln)$/u.test(piece.text) &&
	!/^ge/u.test(piece.text) &&
	!piece.fusedWord &&
	!adverbsInEn.has(lower(piece)) &&
	!bleibenForms.has(lower(piece)) &&
	!closedForms.has(lower(piece));

/**
 * bleiben and an infinitive in its clause: the piece right before it
 * (liegen geblieben, stehen bleibt) or the clause's last piece when bleiben
 * opens the bracket (bleibt … stehen), never after zu.
 */
export function bleibenCandidates(
	nomination: Pick<Nomination, "sentence">,
): BleibenCandidate[] {
	const { pieces } = nomination.sentence;
	const candidates: BleibenCandidate[] = [];
	for (const bleiben of pieces) {
		if (!bleibenForms.has(lower(bleiben))) continue;
		const clause = pieces.filter(
			(piece) => piece.clause === bleiben.clause,
		);
		const before = pieces[bleiben.id - 2];
		const last = clause[clause.length - 1];
		for (const infinitive of [
			before?.clause === bleiben.clause ? before : undefined,
			last && last.id > bleiben.id ? last : undefined,
		]) {
			if (!infinitive || !infinitiveShaped(infinitive)) continue;
			const zu = pieces[infinitive.id - 2];
			if (zu && lower(zu) === "zu") continue;
			candidates.push({ bleiben, infinitive });
		}
	}
	return candidates;
}

/**
 * The pairs of units a sub-floor link joins: an idiom host share of at
 * least 0.25, first or re-asked, or an expression Noul of at least 0.5,
 * between pieces of two units, neither a Saying nor holding a bound piece.
 */
export function mergeCandidates(
	nomination: Nomination,
	membership: Pick<Membership, "partition" | "edges">,
	bound: ReadonlySet<number>,
): MergeCandidate[] {
	const groupOf = new Map<number, readonly number[]>();
	for (const group of membership.partition)
		for (const id of group) groupOf.set(id, group);
	const saying = new Set(
		membership.edges
			.filter((edge) => edge.source === "saying")
			.flatMap((edge) => edge.pieces),
	);
	const open = (group: readonly number[]) =>
		group.every((id) => !bound.has(id) && !saying.has(id));
	const pairs = new Map<string, MergeCandidate>();
	const flag = (a: number, b: number) => {
		const left = groupOf.get(a);
		const right = groupOf.get(b);
		if (!left || !right || left === right || !open(left) || !open(right))
			return;
		const [first, second] =
			(left[0] ?? 0) < (right[0] ?? 0) ? [left, right] : [right, left];
		pairs.set(`${groupKey(first)}|${groupKey(second)}`, {
			left: first,
			right: second,
		});
	};
	for (const slot of nomination.slots) {
		if (slot.kind !== "idiom") continue;
		for (const answer of [
			nomination.first[slotId(slot)],
			nomination.final[reaskedIdiomId(slot.piece.id)],
		]) {
			if (answer?.type !== "choice") continue;
			const top = argmax(
				Object.fromEntries(
					Object.entries(answer.probabilities).filter(
						([key]) => key !== "none",
					),
				),
			);
			if (top.key && top.share >= idiomFlag)
				flag(slot.piece.id, Number(top.key.slice(1)));
		}
	}
	for (const link of nomination.links)
		if (link.probability >= expressionFlag) flag(link.left, link.right);
	return [...pairs.values()].sort(
		(a, b) =>
			(a.left[0] ?? 0) - (b.left[0] ?? 0) ||
			(a.right[0] ?? 0) - (b.right[0] ?? 0),
	);
}

export const mergeId = (candidate: MergeCandidate) =>
	`lc_${candidate.left.join("_")}_x_${candidate.right.join("_")}`;
export const bleibenId = (candidate: BleibenCandidate) =>
	`lb_${candidate.bleiben.id}_${candidate.infinitive.id}`;

/** The pieces as written, with … where pieces outside them stand between. */
export function wordingOf(
	nomination: Pick<Nomination, "sentence">,
	ids: readonly number[],
): string {
	const { pieces, segments } = nomination.sentence;
	const sorted = [...ids].sort((a, b) => a - b);
	let text = "";
	for (const [position, id] of sorted.entries()) {
		const piece = pieces[id - 1];
		if (!piece) continue;
		const previous = pieces[(sorted[position - 1] ?? 0) - 1];
		if (previous && previous.id === piece.id - 1)
			text += segments
				.slice(previous.segment + 1, piece.segment)
				.map((segment) => segment.text)
				.join("");
		else if (previous) text += " … ";
		text += piece.text;
	}
	return text;
}

const mergeCriteria = {
	whole: "Yes: one idiom, support-verb collocation, fixed phrase or routine formula in its fixed sense, and every one of these words belongs to it (nahm … in Kauf; war auf dem Holzweg; hat … Schwein gehabt; Hals- und Beinbruch)",
	outside:
		"No: an established expression lies within this wording, but some of these words stand outside it: a subject, object or other complement the expression takes, or a free adverb or modifier (Die Firma … nahm … in Kauf: die Firma stands outside)",
	literal:
		"No: these words could form an expression, but here they are meant literally (sie gingen auf dem Holzweg durch den Wald)",
	free: "No: an ordinary free combination of words, with no established expression among them (kaufte einen Hut; las die Zeitung)",
};

/** The `locution` request's questions: a Choice per merge, a Noul per bleiben pair. */
export function locutionQuestions(
	nomination: Nomination,
	merges: readonly MergeCandidate[],
	bleiben: readonly BleibenCandidate[],
): Questions {
	const { sentence, ref } = nomination;
	const questions: Questions = {};
	for (const merge of merges) {
		const ids = [...merge.left, ...merge.right].sort((a, b) => a - b);
		questions[mergeId(merge)] = choice(
			`In \`sentence\`, read the pieces ${joinRefs(sentence, ref, ids)} together, as "${wordingOf(nomination, ids)}". Is that wording one established multiword expression in its fixed sense here, with every one of these words a fixed part of it? A word's article, auxiliary, particle or reflexive counts with that word.`,
			mergeCriteria,
		);
	}
	for (const pair of bleiben)
		questions[bleibenId(pair)] = noul(
			`In \`sentence\`, do ${ref(pair.bleiben)} and ${ref(pair.infinitive)} together form one verb with a dictionary meaning of its own, bleiben with an infinitive (stecken bleiben, 'get stuck'; hängen bleiben, 'be remembered'), rather than bleiben meaning stay with an infinitive that only says how (sie blieb noch sitzen, 'stayed seated')?`,
		);
	return questions;
}

/** What the `locution` request was asked and answered. */
export type LocutionAnswers = {
	readonly merges: readonly MergeCandidate[];
	readonly bleiben: readonly BleibenCandidate[];
	readonly answers: Answers;
};

/** Asks the `locution` request over a membership the code rules have applied to. */
export async function askLocutionChoice(
	nomination: Nomination,
	ruled: Membership,
	ask: Ask,
	rules: readonly CodeRule[],
): Promise<LocutionAnswers> {
	const bound = boundPieces(nomination, ruled, rules);
	const merges = mergeCandidates(nomination, ruled, bound);
	const groupOf = new Map<number, readonly number[]>();
	for (const group of ruled.partition)
		for (const id of group) groupOf.set(id, group);
	const bleiben = bleibenCandidates(nomination).filter(
		(pair) =>
			groupOf.get(pair.bleiben.id) !== groupOf.get(pair.infinitive.id) &&
			!bound.has(pair.bleiben.id) &&
			!bound.has(pair.infinitive.id),
	);
	const answers = await askAny(ask, {
		stage: "locution",
		state: nomination.state,
		questions: locutionQuestions(nomination, merges, bleiben),
	});
	return { merges, bleiben, answers };
}

/** The links the answers accept under `settings`, each joining two pieces. */
export function acceptedMerges(
	located: LocutionAnswers,
	settings: LocutionSettings,
): (readonly [number, number])[] {
	const links: (readonly [number, number])[] = [];
	for (const merge of located.merges) {
		const answer = located.answers[mergeId(merge)];
		if (
			answer?.type === "choice" &&
			(answer.probabilities.whole ?? 0) >= settings.floor
		)
			links.push([merge.left[0] ?? 0, merge.right[0] ?? 0]);
	}
	if (settings.bleiben)
		for (const pair of located.bleiben) {
			const answer = located.answers[bleibenId(pair)];
			if (answer?.type === "noul" && answer.noul >= settings.floor)
				links.push([pair.bleiben.id, pair.infinitive.id]);
		}
	return links;
}

/**
 * The membership with the accepted merges: the code rules applied again
 * over `base` (membership before the rules) plus each merge and what its
 * members absorb, each merged unit a Locution unless it holds a Saying.
 */
export function withLocutionChoice(
	nomination: Nomination,
	base: Membership,
	ruled: Membership,
	located: LocutionAnswers,
	rules: readonly CodeRule[],
	settings: LocutionSettings,
): Membership {
	const links = acceptedMerges(located, settings);
	if (links.length === 0) return ruled;
	const merged: AssembledEdge[] = links.map((pieces) => ({
		pieces,
		source: "locution",
	}));
	const ids = nomination.sentence.pieces.map((piece) => piece.id);
	const joined = partitionOf(ids, [
		...ruled.partition.flatMap((group) =>
			group.slice(1).map((id) => [group[0] ?? id, id] as const),
		),
		...links,
	]).filter((group) => links.some(([left]) => group.includes(left)));
	const absorbed = settings.absorb
		? absorbedEdges(
				nomination,
				articleHosts(nomination),
				new Set(joined.flat()),
			)
		: [];
	const edges = [...base.edges, ...merged, ...absorbed];
	const result = withCodeRules(
		nomination,
		{
			...base,
			edges,
			partition: partitionOf(
				ids,
				edges.map(({ pieces }) => pieces),
			),
		},
		rules,
	);
	const locution = (group: readonly number[]) =>
		group.length > 1 &&
		joined.some((members) => members.some((id) => group.includes(id)));
	return {
		...result,
		familyOf: (group) => {
			const family = result.familyOf(group);
			return family !== "Saying" && locution(group) ? "Locution" : family;
		},
	};
}
