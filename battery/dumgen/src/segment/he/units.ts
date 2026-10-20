/** Hebrew biggest-unit membership: contextual pair decisions may join adjacent
 * clickable Segments, including across source whitespace. */
import * as Effect from "effect/Effect";
import type { SentenceSegmentation } from "../../language-module.js";
import { type Ask, type AskFailure, askAny, choice, choiceOf } from "../ask.js";
import type { Unit } from "../segmented-sentence.js";

const membershipFloor = 0.7;

type Candidate = {
	readonly indices: readonly [number, number];
	readonly text: string;
	readonly freePreposition: boolean;
};

/** A source-split מ preposition remains its own learner unit. */
const independentlySelectableFragment = (text: string): boolean =>
	/^מ\p{M}*$/u.test(text);

/** Compare Hebrew function forms after decomposing and removing vocalization. */
const unpointedHebrew = (text: string): string =>
	text.normalize("NFD").replace(/\p{M}/gu, "");

const freePreposition = (text: string): boolean =>
	unpointedHebrew(text) === "של";

const isControlledWhitespaceBridge = (
	between: readonly SentenceSegmentation["segments"][number][],
): boolean =>
	(between.length === 1 && between[0]?.kind === "Whitespace") ||
	(between.length === 2 &&
		between[0]?.kind === "Whitespace" &&
		between[1]?.kind === "ResolvableText" &&
		/^ה\p{M}*$/u.test(between[1].text));

function candidatesOf(
	segments: SentenceSegmentation["segments"],
): readonly Candidate[] {
	const candidates: Candidate[] = [];
	let previousAnchor: number | undefined;
	for (const [index, segment] of segments.entries()) {
		if (segment.kind === "Whitespace") continue;
		if (segment.kind !== "ResolvableText") {
			previousAnchor = undefined;
			continue;
		}
		if (independentlySelectableFragment(segment.text)) continue;
		if (previousAnchor !== undefined) {
			const between = segments.slice(previousAnchor + 1, index);
			const crossesWhitespace = between.some(
				({ kind }) => kind === "Whitespace",
			);
			// A split מ remains a singleton but never bridges unrelated source.
			// Article membership is judged in context like other eligible pairs.
			if (
				between.length === 0 ||
				(crossesWhitespace && isControlledWhitespaceBridge(between))
			)
				candidates.push({
					indices: [previousAnchor, index],
					text: `${previousAnchor}:${segments[previousAnchor]?.text}|${index}:${segment.text}`,
					// של is a free preposition when source whitespace separates it
					// from the next lexical anchor; it cannot be a unit member.
					freePreposition: freePreposition(
						segments[previousAnchor]?.text ?? "",
					),
				});
		}
		previousAnchor = index;
	}
	return candidates;
}

function unitGroups(
	segmentation: SentenceSegmentation,
	candidates: readonly Candidate[],
	answers: Readonly<Record<string, ReturnType<typeof choiceOf>>>,
): readonly Unit[] {
	const parent = new Map<number, number>();
	for (const [index, segment] of segmentation.segments.entries())
		if (segment.kind === "ResolvableText") parent.set(index, index);
	const rootOf = (index: number): number => {
		const parentIndex = parent.get(index);
		if (parentIndex === undefined || parentIndex === index) return index;
		const root = rootOf(parentIndex);
		parent.set(index, root);
		return root;
	};
	const join = (left: number, right: number) => {
		const leftRoot = rootOf(left);
		const rightRoot = rootOf(right);
		if (leftRoot !== rightRoot) parent.set(rightRoot, leftRoot);
	};
	for (const [index, candidate] of candidates.entries()) {
		const answer = answers[`membership_${index}`];
		if (
			answer?.choice === "Join" &&
			(answer.probabilities[answer.choice] ?? 0) >= membershipFloor
		)
			join(...candidate.indices);
	}
	const groups = new Map<number, number[]>();
	for (const index of parent.keys()) {
		const root = rootOf(index);
		const group = groups.get(root) ?? [];
		group.push(index);
		groups.set(root, group);
	}
	return [...groups.values()].map((segments) => ({
		segments,
		route: "Unresolved",
	}));
}

export const segmentHebrewUnits = Effect.fnUntraced(function* (
	segmentation: SentenceSegmentation,
	ask: Ask,
): Effect.fn.Return<readonly Unit[], AskFailure> {
	const candidates = candidatesOf(segmentation.segments);
	const judgedCandidates = candidates.flatMap((candidate, index) =>
		candidate.freePreposition ? [] : [{ candidate, index }],
	);
	const candidateText = Object.fromEntries(
		judgedCandidates.map(({ candidate, index }) => [
			`membership_${index}`,
			candidate.text,
		]),
	);
	const questions = Object.fromEntries(
		judgedCandidates.map(({ candidate, index }) => {
			const [left, right] = candidate.indices;
			const crossesWhitespace = segmentation.segments
				.slice(left + 1, right)
				.some(({ kind }) => kind === "Whitespace");
			const policy = crossesWhitespace
				? `This pair CROSSES source whitespace: join only the lexical anchors of one fixed lexical identity, including a fixed lexicalized construct phrase (בית + ספר 'school') or a proper place name (הר כרמל 'Mount Carmel', ים + תיכון 'Mediterranean Sea'). An article ה belongs to its noun or adjective Head, including within a fixed expression; keep its source Segment separate. The מ preposition stays a separate unit. Do not turn an article into part of a canonical Lemma. A pronoun suffix is not an article: לָ + ה is ADP + PRON, not an article; ל + י and ב + הם stay separate. A proper name can have noun + adjective grammar; do not reject it as an ordinary free noun-adjective pair. A grammatical or thematic connection alone is not a unit: do not transitively swallow a free syntactic chain. Separate בקשה ליציאת שותף ('request for a partner's departure'), השפעתו של משבר ('its impact of a crisis'), כרוכה בתשלום ('involves a payment'), ordinary noun-adjective and verb-object pairs. Join across whitespace only if the complete expression names one fixed lexical identity in this sentence, not because its immediate neighbours are related.`
				: `This pair has NO source whitespace. An article ה belongs to its noun or adjective Head: ה + בית and הַ + סֵּפֶר Join; מ + ה + בית gives [מ] and [ה, בית]. Keep every source Segment. הפונקציה = ה + פונקציה and התפקוד = ה + תפקוד: Join each article with its Head, even outside a fixed expression; keep the two source Segments. A pronoun suffix is not an article: לָ + ה is ADP + PRON, not an article; ל + י and ב + הם stay separate. Prepositions and their pronoun pieces belong to separate units, not one attached host. Judge contextual membership: the ו conjunction is normally Separate from its following host, including ו + ה and pointed וַ + הֲיִי. Do not attach an independently meaningful Segment just because the written letters touch.`;
			return [
				`membership_${index}`,
				choice(
					`In immutable Hebrew \`sentence\`, decide whether the specific clickable Segment pair \`${candidate.text}\` belongs to one biggest learner unit. ${policy} Judge this pair in its whole sentence, not by spelling alone.`,
					{
						Join: "These two Segments share one learner unit through article-to-Head membership, or as members of the same attached host or fixed lexicalized expression",
						Separate:
							"These two Segments belong to separate learner units, even if syntactically related",
					},
				),
			];
		}),
	);
	const rawAnswers = yield* askAny(ask, {
		stage: "units",
		state: { sentence: segmentation.text, candidates: candidateText },
		questions,
	});
	const answers = Object.fromEntries(
		judgedCandidates.map(({ index }) => [
			`membership_${index}`,
			choiceOf(rawAnswers, `membership_${index}`),
		]),
	);
	return unitGroups(segmentation, candidates, answers);
});
