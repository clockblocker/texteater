import type * as Dumling from "dumling/types";
import { directSemanticRelationValues, selectKnowledge } from "dumrel";
import type * as Dumrel from "dumrel/types";

/**
 * The Knowledge one occurrence asks for. The base request of a route with a
 * Valency Frame includes `valency`, so the Knowledge call that creates the
 * Reading proposes its whole frame (ADR 0034); a retry drops it once a frame
 * is stored. A Reading whose Knowledge is already Full asks only for missing
 * translation languages (`topUpOnly`). Government a sentence attests travels
 * beside the request, never in it.
 */
export function generationRequestFor(
	reading: { readonly lemma: Dumling.Lemma<"de"> },
	qualifiedKinds: readonly Dumrel.DirectSemanticRelation[],
	options: {
		readonly translationLanguages?: readonly Dumrel.TranslationLanguage[];
		readonly topUpOnly?: boolean;
	} = {},
) {
	const {
		unitKind: _unitKind,
		canonicalForm: _canonicalForm,
		coreFeatures: _coreFeatures,
		...route
	} = reading.lemma;
	const selected = selectKnowledge({
		route,
		settings: {
			translations: Object.fromEntries(
				(["en", "ru"] as const).map((language) => [
					language,
					options.translationLanguages?.includes(language) ?? true,
				]),
			),
		},
	});
	if (!selected.success) throw selected.error;
	const applicable = selected.value;
	if (options.topUpOnly) {
		return applicable.translations
			? { translations: applicable.translations }
			: {};
	}
	const {
		morphologicalTree: _morphologicalTree,
		lexicalBreakdown: _lexicalBreakdown,
		participleSource: _participleSource,
		...request
	} = applicable;
	const allowed = new Set(qualifiedKinds);
	const semanticRelations = Object.fromEntries(
		directSemanticRelationValues.flatMap((relation) =>
			allowed.has(relation) &&
			applicable.semanticRelations?.[relation] === null
				? [[relation, null]]
				: [],
		),
	);
	if (Object.keys(semanticRelations).length > 0) {
		return { ...request, semanticRelations };
	}
	const { semanticRelations: _semanticRelations, ...baseRequest } = request;
	return baseRequest;
}
