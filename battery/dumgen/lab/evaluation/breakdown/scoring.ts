/**
 * Scores the Breakdown segmenters against their Breakdown Records.
 *
 * A case passes when its pieces come back exactly: the same letters, cut in
 * the same places, each linked to the same route and Canonical Form, filler
 * where gold has filler. Beside the verdict each case carries:
 *
 * - `cuts`: the places one piece ends and the next begins, gold's and the
 *   returned ones, and how many agree (boundary precision and recall);
 * - `links`: of gold's linked pieces, those returned with the same letters
 *   at the same place, and of those, the ones with gold's route and with
 *   gold's Canonical Form too;
 * - for `segment.inConstituents`, whether gold and the answer agree that the
 *   Reading has Constituents at all (`hasConstituents`);
 * - `lenientPass`, the verdict under the noun-or-verb tolerance (the user,
 *   2026-10-25, #1241): a compound's first part whose letters spell both a
 *   noun and a verb's stem (`Segel` in `Segelboot`: NOUN `Segel` or VERB
 *   `segeln`) passes linked to either. Everything else must still come back
 *   exactly.
 */
import type { OperationEvaluationRun } from "promptsmith/evaluation";
import type {
	BreakdownPiece,
	ConstituentsOutput,
	MorphemesOutput,
} from "./cases.js";

type PieceCheck = {
	readonly cuts: {
		readonly gold: number;
		readonly returned: number;
		readonly matched: number;
	};
	readonly links: {
		readonly gold: number;
		/** Gold links returned with gold's letters at gold's place. */
		readonly placed: number;
		readonly route: number;
		readonly linked: number;
	};
};

const routeKey = (piece: BreakdownPiece) =>
	piece.target ? `${piece.target.family}/${piece.target.kind}` : undefined;
const linkKey = (piece: BreakdownPiece) =>
	piece.target
		? `${routeKey(piece)}/${piece.target.canonicalForm}`
		: undefined;

/** Each piece with its start offset in the spelled wording. */
function placed(pieces: readonly BreakdownPiece[]) {
	let start = 0;
	return pieces.map((piece) => {
		const at = { piece, start, end: start + piece.letters.length };
		start = at.end;
		return at;
	});
}

/** The inner cuts: where one lettered piece ends and the next begins. */
function cutsOf(pieces: readonly BreakdownPiece[]): Set<number> {
	const all = placed(pieces);
	const total = all.at(-1)?.end ?? 0;
	return new Set(
		all.map(({ end }) => end).filter((end) => end > 0 && end < total),
	);
}

function checkPieces(
	gold: readonly BreakdownPiece[],
	returned: readonly BreakdownPiece[],
): PieceCheck {
	const goldCuts = cutsOf(gold);
	const returnedCuts = cutsOf(returned);
	const answers = placed(returned);
	let placedCount = 0;
	let route = 0;
	let linked = 0;
	const goldLinks = placed(gold).filter(({ piece }) => piece.target);
	for (const { piece, start, end } of goldLinks) {
		const answer = answers.find(
			(entry) =>
				entry.start === start &&
				entry.end === end &&
				entry.piece.letters === piece.letters,
		);
		if (!answer?.piece.target) continue;
		placedCount++;
		if (routeKey(answer.piece) === routeKey(piece)) route++;
		if (linkKey(answer.piece) === linkKey(piece)) linked++;
	}
	return {
		cuts: {
			gold: goldCuts.size,
			returned: returnedCuts.size,
			matched: [...returnedCuts].filter((cut) => goldCuts.has(cut))
				.length,
		},
		links: { gold: goldLinks.length, placed: placedCount, route, linked },
	};
}

const samePieces = (
	gold: readonly BreakdownPiece[],
	returned: readonly BreakdownPiece[],
) =>
	gold.length === returned.length &&
	gold.every(
		(piece, index) =>
			piece.letters === returned[index]?.letters &&
			linkKey(piece) === linkKey(returned[index] ?? piece) &&
			(piece.target === undefined) ===
				(returned[index]?.target === undefined),
	);

/** A piece's target folded for comparing spellings. */
const folded = (text: string) => text.toLocaleLowerCase("de");

/**
 * Whether `noun` and `verb` are the noun and the verb a first part's
 * `letters` both spell: the noun is the letters, or the letters and a dropped
 * final -e (`Erb` for `Erbe`), and the verb is the letters as its stem
 * (`segeln`, `erben`).
 */
function spellsNounAndVerb(
	letters: string,
	noun: BreakdownPiece,
	verb: BreakdownPiece,
): boolean {
	const stem = folded(letters);
	const nounForm = folded(noun.target?.canonicalForm ?? "");
	const verbForm = folded(verb.target?.canonicalForm ?? "");
	return (
		(nounForm === stem || nounForm === `${stem}e`) &&
		(verbForm === `${stem}n` || verbForm === `${stem}en`)
	);
}

const isLexeme = (piece: BreakdownPiece | undefined, kind: string) =>
	piece?.target?.family === "Lexeme" && piece.target.kind === kind;

/**
 * Whether `returned` differs from gold only in a compound's first part,
 * linked to the verb where gold has the noun or the other way round, with
 * the same letters, both spelled by them, and a word after it.
 */
function passesNounOrVerb(
	gold: readonly BreakdownPiece[],
	returned: readonly BreakdownPiece[],
): boolean {
	const [goldFirst, ...goldRest] = gold;
	const [returnedFirst, ...returnedRest] = returned;
	if (!goldFirst || !returnedFirst) return false;
	if (goldFirst.letters !== returnedFirst.letters) return false;
	if (!samePieces(goldRest, returnedRest)) return false;
	if (!goldRest.some((piece) => piece.target?.family === "Lexeme"))
		return false;
	if (isLexeme(goldFirst, "NOUN") && isLexeme(returnedFirst, "VERB"))
		return spellsNounAndVerb(goldFirst.letters, goldFirst, returnedFirst);
	if (isLexeme(goldFirst, "VERB") && isLexeme(returnedFirst, "NOUN"))
		return spellsNounAndVerb(goldFirst.letters, returnedFirst, goldFirst);
	return false;
}

export type BreakdownEvaluation = PieceCheck & {
	readonly contractPass: boolean;
	/** The verdict under the noun-or-verb tolerance for a compound's first part. */
	readonly lenientPass: boolean;
	readonly group: "phraseme" | "word";
	/** segment.inConstituents: gold has Constituents, and the answer has. */
	readonly hasConstituents?: {
		readonly gold: boolean;
		readonly returned: boolean;
	};
};

const piecesOf = (output: ConstituentsOutput) =>
	output.kind === "Constituents" ? output.pieces : [];

/** The `segment.inConstituents` evaluator, reading each case's group from `groups`. */
export const evaluateConstituents =
	(groups: Readonly<Record<string, "phraseme" | "word">>) =>
	(args: {
		readonly caseId: string;
		readonly idealOutput: ConstituentsOutput;
		readonly output: ConstituentsOutput;
	}): BreakdownEvaluation => {
		const gold = piecesOf(args.idealOutput);
		const returned = piecesOf(args.output);
		const has = {
			gold: args.idealOutput.kind === "Constituents",
			returned: args.output.kind === "Constituents",
		};
		const contractPass =
			has.gold === has.returned && samePieces(gold, returned);
		return {
			contractPass,
			lenientPass:
				contractPass ||
				(has.gold && has.returned && passesNounOrVerb(gold, returned)),
			group: groups[args.caseId] ?? "word",
			hasConstituents: has,
			...checkPieces(gold, returned),
		};
	};

/** The `segment.inMorphemes` evaluator. */
export const evaluateMorphemes =
	(groups: Readonly<Record<string, "phraseme" | "word">>) =>
	(args: {
		readonly caseId: string;
		readonly idealOutput: MorphemesOutput;
		readonly output: MorphemesOutput;
	}): BreakdownEvaluation => {
		const contractPass = samePieces(
			args.idealOutput.pieces,
			args.output.pieces,
		);
		return {
			contractPass,
			lenientPass: contractPass,
			group: groups[args.caseId] ?? "word",
			...checkPieces(args.idealOutput.pieces, args.output.pieces),
		};
	};

const ratio = (part: number, whole: number) =>
	whole === 0 ? null : Number((part / whole).toFixed(4));

type Totals = {
	attempts: number;
	exact: number;
	lenientExact: number;
	goldCuts: number;
	returnedCuts: number;
	matchedCuts: number;
	goldLinks: number;
	placedLinks: number;
	routeLinks: number;
	linkedLinks: number;
	noneAgreed: number;
	failed: number;
};

const emptyTotals = (): Totals => ({
	attempts: 0,
	exact: 0,
	lenientExact: 0,
	goldCuts: 0,
	returnedCuts: 0,
	matchedCuts: 0,
	goldLinks: 0,
	placedLinks: 0,
	routeLinks: 0,
	linkedLinks: 0,
	noneAgreed: 0,
	failed: 0,
});

const ratesOf = (totals: Totals) => ({
	attempts: totals.attempts,
	failed: totals.failed,
	exact: ratio(totals.exact, totals.attempts),
	lenientExact: ratio(totals.lenientExact, totals.attempts),
	cutPrecision: ratio(totals.matchedCuts, totals.returnedCuts),
	cutRecall: ratio(totals.matchedCuts, totals.goldCuts),
	linksPlaced: ratio(totals.placedLinks, totals.goldLinks),
	linksWithGoldRoute: ratio(totals.routeLinks, totals.goldLinks),
	linksExact: ratio(totals.linkedLinks, totals.goldLinks),
	hasConstituentsAgreed: ratio(totals.noneAgreed, totals.attempts),
});

const isEvaluation = (value: unknown): value is BreakdownEvaluation =>
	typeof value === "object" && value !== null && "cuts" in value;

/** One attempt added to a bucket. */
function add(
	bucket: Totals,
	status: string,
	evaluation: BreakdownEvaluation | undefined,
) {
	bucket.attempts++;
	if (evaluation === undefined || status !== "Success") {
		bucket.failed++;
		return;
	}
	if (evaluation.contractPass) bucket.exact++;
	if (evaluation.lenientPass) bucket.lenientExact++;
	bucket.goldCuts += evaluation.cuts.gold;
	bucket.returnedCuts += evaluation.cuts.returned;
	bucket.matchedCuts += evaluation.cuts.matched;
	bucket.goldLinks += evaluation.links.gold;
	bucket.placedLinks += evaluation.links.placed;
	bucket.routeLinks += evaluation.links.route;
	bucket.linkedLinks += evaluation.links.linked;
	const has = evaluation.hasConstituents;
	if (has === undefined || has.gold === has.returned) bucket.noneAgreed++;
}

/**
 * A run's rates over every attempt, and by group: exact cases, strictly
 * and under the noun-or-verb tolerance, cut
 * precision and recall, gold links placed, with gold's route and exact, and
 * agreement on whether there are Constituents at all.
 */
export function breakdownMetrics(run: OperationEvaluationRun) {
	const totals: Record<string, Totals> = { all: emptyTotals() };
	for (const record of run.cases)
		for (const attempt of record.repetitions ?? [record]) {
			const evaluation = isEvaluation(attempt.evaluation)
				? attempt.evaluation
				: undefined;
			const group = evaluation?.group ?? "failed";
			const own = totals[group] ?? emptyTotals();
			totals[group] = own;
			add(own, attempt.status, evaluation);
			if (totals.all) add(totals.all, attempt.status, evaluation);
		}
	return Object.fromEntries(
		Object.entries(totals).map(([group, bucket]) => [
			group,
			ratesOf(bucket),
		]),
	);
}
