import { germanArticleForm, parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { DumgenFailure } from "../../../universal/failure.js";
import { authoredMembers } from "../authored-closed-sets/inventory.js";

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
	const canonical =
		input.article === "Indefinite"
			? "ein"
			: input.number === "Plur" || input.gender === "Fem"
				? "die"
				: input.gender === "Neut"
					? "das"
					: "der";
	const member = authoredMembers.find(
		({ lemma }) =>
			lemma.kind === "DET" &&
			lemma.canonicalForm === canonical &&
			"pronType" in lemma.coreFeatures &&
			lemma.coreFeatures.pronType === "Art",
	);
	if (!member || member.lemma.kind !== "DET")
		throw new DumgenFailure(
			"CatalogMiss",
			"resolveGrammar",
			`Missing reviewed article ${canonical}`,
			"de/Lexeme/DET",
		);
	const surface = {
		unitKind: "Surface",
		language: "de",
		lemma: member.lemma,
		normalizedSurface: expected,
		spelling: "Canonical",
		surfaceFeatures: null,
		inflectionalFeatures: {
			case: input.case,
			number: input.number,
			gender: input.gender,
			degree: null,
			"gender[psor]": null,
			"number[psor]": null,
		},
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

/** The reviewed citation article for a German noun heading, independent of its encounters. */
export function selectNounHeadingArticle(lemma: {
	language: string;
	family: string;
	kind: string;
	coreFeatures: Readonly<Record<string, unknown>>;
}) {
	if (
		lemma.language !== "de" ||
		lemma.family !== "Lexeme" ||
		lemma.kind !== "NOUN"
	)
		return null;
	const gender = lemma.coreFeatures.gender;
	const canonical =
		gender === "Masc"
			? "der"
			: gender === "Fem"
				? "die"
				: gender === "Neut"
					? "das"
					: null;
	if (!canonical) return null;
	return (
		authoredMembers.find(
			({ lemma: candidate }) =>
				candidate.kind === "DET" &&
				candidate.canonicalForm === canonical &&
				"pronType" in candidate.coreFeatures &&
				candidate.coreFeatures.pronType === "Art",
		) ?? null
	);
}

/** Derives a contextual article from resolved noun grammar without model execution. */
export function deriveNounArticle(surface: Dumling.Surface) {
	if (
		surface.language !== "de" ||
		surface.lemma.family !== "Lexeme" ||
		surface.lemma.kind !== "NOUN"
	)
		return null;
	const noun = surface as Dumling.Surface<"de", "Lexeme", "NOUN">;
	const bag = noun.inflectionalFeatures;
	if (!bag?.article) return null;
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
