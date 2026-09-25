import { germanArticleForm, parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { DumgenFailure } from "../../../universal/failure.js";
import { authoredMembers } from "../authored-closed-sets/inventory.js";

/** The reviewed article Paradigm Cell with exactly these coordinates. */
function articleCell(cell: {
	definite: string;
	case: string;
	number: string;
	gender: string | null;
}) {
	return (
		authoredMembers.find(
			({ lemma }) =>
				lemma.kind === "DET" &&
				"pronType" in lemma.coreFeatures &&
				lemma.coreFeatures.pronType === "Art" &&
				lemma.coreFeatures.definite === cell.definite &&
				lemma.coreFeatures.case === cell.case &&
				lemma.coreFeatures.number === cell.number &&
				lemma.coreFeatures.gender === cell.gender,
		) ?? null
	);
}

/** Exact reviewed identity plus contextual morphology, without any occurrence or database identity. */
export function nounArticleReference(input: {
	article: string;
	case: string;
	number: string;
	gender: string | null;
	spelled?: string;
}) {
	const expected = germanArticleForm(input);
	if (
		!expected ||
		(input.spelled !== undefined && input.spelled !== expected)
	)
		throw new DumgenFailure(
			"Unresolved",
			"resolveGrammar",
			"Article form and noun agreement are incompatible",
		);
	// Each article Paradigm Cell is its own Lemma (system ADR 0032): the noun's
	// case, number, gender and definiteness name exactly one of them.
	const member = articleCell({
		definite: input.article === "Indefinite" ? "Ind" : "Def",
		case: input.case,
		number: input.number,
		gender: input.number === "Plur" ? null : input.gender,
	});
	if (!member || member.lemma.kind !== "DET")
		throw new DumgenFailure(
			"CatalogMiss",
			"resolveGrammar",
			`Missing reviewed article ${expected}`,
			"de/Lexeme/DET",
		);
	const surface = {
		unitKind: "Surface",
		language: "de",
		lemma: member.lemma,
		normalizedSurface: expected,
		spelling: "Canonical",
		surfaceFeatures: null,
		inflectionalFeatures: null,
	};
	const parsed = parseUnit(surface);
	if (!parsed.success) throw parsed.error;
	if (
		parsed.chain.unitKind !== "Surface" ||
		parsed.chain.language !== "de" ||
		parsed.chain.family !== "Lexeme" ||
		parsed.chain.kind !== "DET"
	)
		throw new Error("Expected an article Surface");
	const reading: Dumling.Reading<"de", "Lexeme", "DET"> = {
		...member.reading,
		lemma: member.lemma,
	};
	return { surface: parsed.chain.value, reading };
}

/**
 * The reviewed nominative definite article for a German noun heading,
 * independent of its encounters. A proper noun has one only when it is cited
 * with its article (die Schweiz); a plural name (die Niederlande) takes the
 * plural cell.
 */
export function selectNounHeadingArticle(lemma: {
	language: string;
	family: string;
	kind: string;
	coreFeatures: Readonly<Record<string, unknown>>;
}) {
	if (
		lemma.language !== "de" ||
		lemma.family !== "Lexeme" ||
		(lemma.kind !== "NOUN" && lemma.kind !== "PROPN")
	)
		return null;
	const gender = lemma.coreFeatures.gender;
	if (lemma.kind === "PROPN") {
		if (lemma.coreFeatures.article !== "Definite") return null;
		if (gender === null)
			return articleCell({
				definite: "Def",
				case: "Nom",
				number: "Plur",
				gender: null,
			});
	}
	if (gender !== "Masc" && gender !== "Fem" && gender !== "Neut") return null;
	return articleCell({
		definite: "Def",
		case: "Nom",
		number: "Sing",
		gender,
	});
}

/**
 * Derives a contextual article from resolved noun grammar without model
 * execution. A proper noun's article is its Core `article` (ADR 0035); a name
 * without a marked case, as in direct address, shows none.
 */
export function deriveNounArticle(surface: Dumling.Surface) {
	if (surface.language !== "de" || surface.lemma.family !== "Lexeme")
		return null;
	if (surface.lemma.kind === "PROPN") {
		const name = surface as Dumling.Surface<"de", "Lexeme", "PROPN">;
		const bag = name.inflectionalFeatures;
		if (name.lemma.coreFeatures.article !== "Definite" || !bag?.case)
			return null;
		if (!bag.number)
			throw new DumgenFailure(
				"Unresolved",
				"resolveGrammar",
				"Article requires known noun agreement",
			);
		return nounArticleReference({
			article: "Definite",
			case: bag.case,
			number: bag.number,
			gender: name.lemma.coreFeatures.gender,
		});
	}
	if (surface.lemma.kind !== "NOUN") return null;
	const noun = surface as Dumling.Surface<"de", "Lexeme", "NOUN">;
	const bag = noun.inflectionalFeatures;
	if (!bag || bag.article === "None") return null;
	if (!bag.case || !bag.number)
		throw new DumgenFailure(
			"Unresolved",
			"resolveGrammar",
			"Article requires known noun agreement",
		);
	return nounArticleReference({
		article: bag.article,
		case: bag.case,
		number: bag.number,
		gender: noun.lemma.coreFeatures.gender,
	});
}
