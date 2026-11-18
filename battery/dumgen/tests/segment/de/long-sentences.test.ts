/**
 * How far hosts and links reach in a long Sentence, on the long Zauberberg
 * Sentences of the long-sentence study: no host or link crosses a span.
 */
import { expect, test } from "bun:test";
import { type SlotKind, slotsOf } from "../../../src/segment/de/candidates.js";
import { authoredInventory } from "../../../src/segment/de/inventory.js";
import {
	type Candidates,
	expressionsPlan,
	finalPlan,
	proposalOf,
} from "../../../src/segment/de/nomination.js";
import { pairCandidatesOf } from "../../../src/segment/de/pair-candidates.js";
import { writtenGermanSegments } from "../../../src/segment/de/segments.js";
import {
	type Piece,
	type Sentence,
	sentenceOf,
} from "../../../src/segment/de/sentence.js";

const sentence = (text: string) =>
	sentenceOf({ segments: writtenGermanSegments(text).segments });

/** The `occurrence`th piece reading `text`, from 1; -1 is the last. */
function pieceOf(of: Sentence, text: string, occurrence = 1): Piece {
	const matches = of.pieces.filter((piece) => piece.text === text);
	const piece = matches.at(occurrence > 0 ? occurrence - 1 : occurrence);
	if (!piece) throw Error(`No ${text} #${occurrence}`);
	return piece;
}

const hostsOf = (of: Sentence, kind: SlotKind, piece: Piece) =>
	slotsOf(of, authoredInventory)
		.find((slot) => slot.kind === kind && slot.piece.id === piece.id)
		?.hosts.map((host) => host.text) ?? [];

const fliege =
	"Der alte Fiete verscheuchte sie vorsichtig, indem er sich hütete, die Stirn dabei zu berühren, und mit einer ehrbaren Verfinsterung seiner Miene, so, als dürfe und wolle er von dem, was er da tat, nichts wissen, – einem Ausdruck von Sittsamkeit, der sich offenbar auf die Tatsache bezog, daß der Großvater nur noch Körper und nichts weiter mehr war; allein nach schweifendem Auffluge nahm die Fliege auf den Fingern des Großvaters, in der Nähe des Elfenbeinkreuzes, kurz aufsitzend wieder Platz.";

const taufe =
	"Aber vor fünfundsiebenzig Jahren, da war ich es selber, den sie tauften, auch da im Saal, und meinen Kopf hielten sie über die Schale hier, wie sie da auf dem Teller steht, und der Geistliche sprach dieselben Worte wie bei dir und deinem Vater, und ebenso floß das warme, klare Wasser von meinem Haar (es war nicht viel mehr damals, als ich jetzt auf dem Kopfe habe) da in das goldene Becken hinein.";

test("a span ends at ; and a parenthesis is a span of its own, after which the one it interrupted resumes", () => {
	const of = sentence(taufe);
	const floss = pieceOf(of, "floß");
	const habe = pieceOf(of, "habe");
	const hinein = pieceOf(of, "hinein");
	expect(habe.span).not.toBe(floss.span);
	expect(hinein.span).toBe(floss.span);
	const fly = sentence(fliege);
	expect(pieceOf(fly, "war", -1).span).not.toBe(pieceOf(fly, "nahm").span);
});

test("no host crosses a span: not past a semicolon, not into a parenthesis", () => {
	const fly = sentence(fliege);
	expect(hostsOf(fly, "idiom", pieceOf(fly, "Platz"))).not.toContain("war");
	const of = sentence(taufe);
	const hinein = pieceOf(of, "hinein");
	const hosts = slotsOf(of, authoredInventory).find(
		(slot) => slot.kind === "particle" && slot.piece.id === hinein.id,
	)?.hosts;
	expect(hosts?.map((host) => host.text)).toContain("floß");
	expect(hosts?.map((host) => host.text)).not.toContain("habe");
	expect(hosts?.every((host) => host.span === hinein.span)).toBe(true);
});

/** The expression pairs asked when `fixedPieces` are heard fixed. */
function expressionPairs(of: Sentence, fixedPieces: readonly Piece[]) {
	const candidates: Candidates = {
		...proposalOf(of, authoredInventory),
		first: {},
		slotAnswers: [],
		accepted: [],
		fixed: new Map(fixedPieces.map((piece) => [piece.id, 0.9])),
	};
	return Object.keys(expressionsPlan(candidates).questions).sort();
}

test("an expression pair stays in one span, across commas inside it", () => {
	const fly = sentence(fliege);
	const war = pieceOf(fly, "war", -1);
	const nahm = pieceOf(fly, "nahm");
	const platz = pieceOf(fly, "Platz");
	// nahm … Platz across two commas is asked; nothing across the semicolon.
	expect(expressionPairs(fly, [war, nahm, platz])).toEqual([
		`e_${nahm.id}_${platz.id}`,
	]);
	const of = sentence(taufe);
	const floss = pieceOf(of, "floß");
	const habe = pieceOf(of, "habe");
	const hinein = pieceOf(of, "hinein");
	// Nothing into or out of the parenthesis; floß … hinein around it is asked.
	expect(expressionPairs(of, [floss, habe, hinein])).toEqual([
		`e_${floss.id}_${hinein.id}`,
	]);
});

test("a noun whose span holds no verb keeps its re-asked idiom hosts", () => {
	const of = sentence(
		"Nach der bestandenen Prüfung sagte der Ausbilder: „Herzlichen Glückwunsch, Nina!“",
	);
	const glueckwunsch = pieceOf(of, "Glückwunsch");
	const proposal = proposalOf(of, authoredInventory);
	expect(
		proposal.slots.some(
			(slot) =>
				slot.kind === "idiom" && slot.piece.id === glueckwunsch.id,
		),
	).toBe(false);
	const reasked =
		finalPlan(proposal).questions[`s4_idiom_${glueckwunsch.id}`];
	expect(
		reasked?.type === "choice" && Object.values(reasked.criteria),
	).toEqual(["Herzlichen", "Nina", "None of these"]);
});

test("a correlator's parts stand in one span", () => {
	const of = sentence(
		"Er kam nicht, um zu bleiben; er wollte nur kurz etwas holen, und zu Hause wartete man.",
	);
	expect(
		pairCandidatesOf(of, authoredInventory)
			.filter((pair) => pair.kind === "correlator")
			.map((pair) => [pair.left.id, pair.right.id]),
	).toEqual([[pieceOf(of, "um").id, pieceOf(of, "zu").id]]);
});
