import type * as Dumling from "dumling/types";
import { DumgenFailure } from "../../../universal/failure.js";
import { authoredMembers } from "../authored-closed-sets/inventory.js";
import { member as subjectEs } from "../authored-closed-sets/members/lexeme/pronoun/personal/es-subject-expletive.js";
import { sameValue } from "../authored-closed-sets/select.js";
import { deriveNounArticle } from "./noun-article.js";

/** Resolves reviewed composition without executing a model or adding content to its parent. */
export function deriveGrammaticalComponent(surface: Dumling.Surface) {
	const article = deriveNounArticle(surface);
	if (article) return article;
	if (
		surface.language !== "de" ||
		!("inflectionalFeatures" in surface) ||
		!surface.inflectionalFeatures ||
		!("expletive" in surface.inflectionalFeatures) ||
		surface.inflectionalFeatures.expletive !== "Subject"
	)
		return null;
	const member = authoredMembers.find((candidate) =>
		sameValue(candidate.reading, subjectEs.reading),
	);
	if (!member || member.lemma.kind !== "PRON")
		throw new DumgenFailure(
			"CatalogMiss",
			"resolveGrammar",
			"Missing reviewed nonreferential subject es Reading",
			"de/Lexeme/PRON",
		);
	const component: Dumling.Surface<"de", "Lexeme", "PRON"> = {
		unitKind: "Surface",
		language: "de",
		lemma: structuredClone(member.lemma),
		inflectionalFeatures: null,
		normalizedSurface: "es",
		spelling: "Canonical",
		surfaceFeatures: null,
	};
	return { surface: component, reading: structuredClone(member.reading) };
}
