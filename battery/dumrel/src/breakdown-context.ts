import { ParsingError } from "common-utils/validation";
import { foldCase, parseUnit, zeroEndingCanonicalForm } from "dumling";
import type * as Dumling from "dumling/types";
import { breakdownWording } from "./breakdown-wording.js";
import type {
	Breakdown,
	BreakdownPart,
	BreakdownPiece,
	LinkTarget,
	Source,
} from "./generated/types.js";
import { issue, type Path } from "./issue.js";

/** A link target's route and Canonical Form, read alike from a Lemma or a Unit Shadow. */
type LinkRoute = Pick<
	Dumling.Lemma,
	"language" | "family" | "kind" | "canonicalForm"
>;

/**
 * A link target parsed against its source (ADR 0050): a Lemma parsed by
 * Dumling, or a Unit Shadow, whose shape the compiled schema already checked.
 * Either names the source's Language.
 */
function parseLinkTarget(
	source: Dumling.Reading,
	value: LinkTarget,
	path: Path,
): LinkTarget | ParsingError {
	let target: LinkTarget = value;
	if ("unitKind" in value) {
		const parsed = parseUnit(value);
		if (!parsed.success)
			return new ParsingError(
				parsed.error.issues.map((entry) => ({
					...entry,
					path: [...path, ...entry.path],
				})),
			);
		if (parsed.chain.unitKind !== "Lemma")
			return issue([...path, "unitKind"], "Expected a Dumling Lemma");
		target = parsed.chain.value;
	}
	if (target.language !== source.lemma.language)
		return issue(
			[...path, "language"],
			"A link target must use the source Language",
		);
	return target;
}

function isZeroEnding(route: LinkRoute): boolean {
	return (
		route.family === "Morpheme" &&
		route.kind === "Ending" &&
		route.canonicalForm === zeroEndingCanonicalForm
	);
}

/**
 * The Families a piece of each half may link to (ADR 0050, ADR 0051).
 * Constituents link to words, Locutions, formants and Interfixes, never to an
 * inflectional Ending; morphemes link to Morphemes only.
 */
function pieceTargetIssue(
	part: BreakdownPart,
	route: LinkRoute,
): string | undefined {
	if (part === "morphemes")
		return route.family === "Morpheme"
			? undefined
			: "A morpheme piece links to a Morpheme";
	if (route.family === "Saying") return "A constituent is never a Saying";
	if (route.family === "Morpheme" && route.kind === "Ending")
		return "Constituents hold no inflectional Ending";
	return undefined;
}

/**
 * One half of a Breakdown checked against its owning Reading. Each piece
 * shows letters, except a zero ending, which shows none and links to the zero
 * Ending (ADR 0051). The letters spell the Reading's Canonical Form back,
 * compared case-insensitively; a lexically reflexive Lexeme's spell its
 * word, without the reflexive it cites (`erinnern` of `sich erinnern`).
 */
export function parseBreakdownPieces(
	source: Dumling.Reading,
	part: BreakdownPart,
	pieces: readonly BreakdownPiece[],
	path: Path,
): BreakdownPiece[] | ParsingError {
	const { family } = source.lemma;
	if (part === "morphemes" && family !== "Lexeme")
		return issue(path, "Only a Lexeme Reading has a Morphemic Breakdown");
	const result: BreakdownPiece[] = [];
	for (const [index, piece] of pieces.entries()) {
		const piecePath = [...path, index];
		if (piece.target === undefined) {
			if (piece.letters.length === 0)
				return issue(
					[...piecePath, "letters"],
					"A filler piece shows letters",
				);
			result.push({ letters: piece.letters });
			continue;
		}
		const target = parseLinkTarget(source, piece.target, [
			...piecePath,
			"target",
		]);
		if (target instanceof ParsingError) return target;
		const targetIssue = pieceTargetIssue(part, target);
		if (targetIssue) return issue([...piecePath, "target"], targetIssue);
		if (isZeroEnding(target) !== (piece.letters.length === 0))
			return issue(
				[...piecePath, "letters"],
				"Only a zero ending shows no letters, and it links to the zero Ending",
			);
		result.push({ letters: piece.letters, target });
	}
	const { language } = source.lemma;
	const spelled = result.map(({ letters }) => letters).join("");
	const wording = breakdownWording(source.lemma);
	if (foldCase(spelled, language) !== foldCase(wording, language))
		return issue(
			path,
			wording === source.lemma.canonicalForm
				? "A Breakdown's letters spell its Reading's Canonical Form"
				: `A lexically reflexive Lexeme's Breakdown spells its word ${JSON.stringify(wording)}, without the reflexive`,
		);
	return result;
}

/**
 * A Breakdown checked against its owning Reading: at least one half, each
 * checked by {@link parseBreakdownPieces}.
 */
export function parseBreakdown(
	source: Dumling.Reading,
	breakdown: Breakdown,
	path: Path,
): Breakdown | ParsingError {
	const result: Breakdown = {};
	for (const part of ["constituents", "morphemes"] as const) {
		const pieces = breakdown[part];
		if (pieces === undefined) continue;
		const parsed = parseBreakdownPieces(source, part, pieces, [
			...path,
			part,
		]);
		if (parsed instanceof ParsingError) return parsed;
		result[part] = parsed;
	}
	if (Object.keys(result).length === 0)
		return issue(path, "A Breakdown holds constituents, morphemes or both");
	return result;
}

/**
 * Whether a Source is a participle's (ADR 0036): an ADJ Lexeme Reading whose
 * Source is a VERB Lexeme.
 */
function isParticiple(source: Dumling.Reading, target: LinkRoute): boolean {
	return (
		source.lemma.family === "Lexeme" &&
		source.lemma.kind === "ADJ" &&
		target.family === "Lexeme" &&
		target.kind === "VERB"
	);
}

/**
 * A Source checked against its owning Reading (ADR 0050): its target is a
 * word or Locution of the source Language, and it names a Participle Meaning
 * exactly when it is a participle's (ADR 0036).
 */
export function parseSourceLink(
	source: Dumling.Reading,
	value: Source,
	path: Path,
): Source | ParsingError {
	const target = parseLinkTarget(source, value.target, [...path, "target"]);
	if (target instanceof ParsingError) return target;
	if (target.family === "Morpheme" || target.family === "Saying")
		return issue(
			[...path, "target", "family"],
			"A Source names a word or a Locution",
		);
	const participle = isParticiple(source, target);
	if (participle && value.meaning === undefined)
		return issue(
			[...path, "meaning"],
			"A participle's Source names its Participle Meaning",
		);
	if (!participle && value.meaning !== undefined)
		return issue(
			[...path, "meaning"],
			"Only a participle's Source names a Participle Meaning",
		);
	return value.meaning === undefined
		? { target }
		: { target, meaning: value.meaning };
}

/**
 * A Reading whose letters can't be cut into pieces has a Source instead of
 * Constituents (ADR 0050), never both.
 */
export function sourceAndConstituentsIssue(
	knowledge: { readonly source?: Source; readonly breakdown?: Breakdown },
	path: Path,
): ParsingError | undefined {
	return knowledge.source && knowledge.breakdown?.constituents
		? issue(path, "A Reading has a Source or Constituents, not both")
		: undefined;
}
