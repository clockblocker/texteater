/**
 * The pairs code proposes as one unit, for the judge to weigh: split
 * adverbs, correlators, circumpositions, multiword names and a one-word
 * preposition written as two words.
 */
import { germanSpelledApartPrepositions } from "dumcorpus/inventories";
import { nounLike, splitAdverbForm } from "./candidates.js";
import type { GermanInventory } from "./inventory.js";
import type { Piece, Sentence } from "./sentence.js";

const lower = (piece: Piece) => piece.word.toLowerCase();

/**
 * Two pieces code proposes as one unit, for a Noul. A `spelled-apart`
 * pair is a one-word preposition written as two words, named by its
 * Canonical Form (auf Grund is aufgrund).
 */
export type PairCandidate = {
	readonly kind:
		| "split-adverb"
		| "correlator"
		| "circumposition"
		| "name"
		| "spelled-apart";
	readonly left: Piece;
	readonly right: Piece;
	readonly name: string;
};

const correlators: readonly (readonly [string, string, string])[] = [
	["entweder", "oder", "entweder … oder"],
	["weder", "noch", "weder … noch"],
	["sowohl", "als", "sowohl … als auch"],
	["sowohl", "wie", "sowohl … wie auch"],
	["nicht", "sondern", "nicht nur … sondern auch"],
	["je", "desto", "je … desto"],
	["je", "umso", "je … umso"],
	["je", "je", "je … je"],
	["einerseits", "andererseits", "einerseits … andererseits"],
	["teils", "teils", "teils … teils"],
	["um", "zu", "um … zu"],
	["ohne", "zu", "ohne … zu"],
	["statt", "zu", "statt … zu"],
	["anstatt", "zu", "anstatt … zu"],
	["so", "dass", "so … dass"],
];

/** Two adjacent words proposed as one subordinator (#735 keeps *X dass* a Locution). */
const adjacentConjunctions: readonly (readonly [string, string])[] = [
	["ohne", "dass"],
	["ohne", "daß"],
	["so", "dass"],
	["so", "daß"],
	["als", "ob"],
	["als", "wenn"],
	["statt", "dass"],
	["anstatt", "dass"],
	["außer", "dass"],
	["nur", "dass"],
	["kaum", "dass"],
	["auch", "wenn"],
	["und", "zwar"],
];

const circumpositionTails = new Set([
	"vorbei",
	"hinaus",
	"an",
	"aus",
	"her",
	"heraus",
	"hervor",
	"hin",
	"hindurch",
	"hinweg",
	"entlang",
	"herum",
	"willen",
	"wegen",
	"zu",
	"ab",
]);

/**
 * Each two-word spelling of a one-word preposition dumcorpus lists, in
 * lowercase, with the preposition it spells (auf grund: aufgrund).
 */
const spelledApart: ReadonlyMap<string, string> = new Map(
	Object.entries(germanSpelledApartPrepositions).map(([form, apart]) => [
		apart.toLocaleLowerCase("de"),
		form,
	]),
);

const nameConnectors = new Set([
	"von",
	"van",
	"de",
	"di",
	"da",
	"del",
	"zu",
	"der",
	"vom",
]);

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
export function pairCandidatesOf(
	sentence: Sentence,
	inventory: GermanInventory,
): PairCandidate[] {
	const pairs: PairCandidate[] = [];
	const { pieces } = sentence;
	for (const [index, left] of pieces.entries()) {
		const right = pieces[index + 1];
		if (!right) continue;
		for (const [first, second] of adjacentConjunctions)
			if (lower(left) === first && lower(right) === second)
				pairs.push({
					kind: "correlator",
					left,
					right,
					name: `${first} ${second}`,
				});
		const preposition = spelledApart.get(`${lower(left)} ${lower(right)}`);
		if (preposition !== undefined && !left.fusedWord && !right.fusedWord)
			pairs.push({
				kind: "spelled-apart",
				left,
				right,
				name: preposition,
			});
		// Names: capitalized pieces, possibly joined by von, van, de.
		if (nounLike(left) && left.clause === right.clause) {
			const connects = (at: number) => {
				const piece = pieces[at];
				return piece !== undefined && nameConnectors.has(lower(piece));
			};
			let next = index + 1;
			while (connects(next) && next - index < 3) next++;
			const partner = pieces[next];
			if (partner && nounLike(partner) && partner.clause === left.clause)
				pairs.push({
					kind: "name",
					left,
					right: partner,
					name: "",
				});
		}
	}
	for (const left of pieces) {
		if (!inventory.isAdposition(left.surface) || left.fusedWord) continue;
		for (const right of pieces)
			if (
				right.id > left.id + 1 &&
				right.id - left.id <= 8 &&
				right.clause === left.clause &&
				circumpositionTails.has(lower(right))
			)
				pairs.push({
					kind: "circumposition",
					left,
					right,
					name: `${lower(left)} … ${lower(right)}`,
				});
	}
	for (const left of sentence.pieces) {
		const head = lower(left);
		for (const right of sentence.pieces) {
			if (right.id <= left.id) continue;
			const tail = lower(right);
			const adverb = splitAdverbForm(head, tail);
			if (
				adverb !== undefined &&
				right.clause === left.clause &&
				right.id - left.id <= 10
			)
				pairs.push({ kind: "split-adverb", left, right, name: adverb });
			for (const [first, second, name] of correlators)
				if (
					head === first &&
					tail === second &&
					right.id - left.id <= 20
				)
					pairs.push({ kind: "correlator", left, right, name });
		}
	}
	return pairs;
}

/** Non-adjacent correlators in the old spelling daß. */
export function oldSpellingCorrelators(sentence: Sentence): PairCandidate[] {
	const pairs: PairCandidate[] = [];
	for (const left of sentence.pieces)
		if (lower(left) === "so")
			for (const right of sentence.pieces)
				if (
					right.id > left.id + 1 &&
					right.id - left.id <= 20 &&
					lower(right) === "daß"
				)
					pairs.push({
						kind: "correlator",
						left,
						right,
						name: "so … daß",
					});
	return pairs;
}
