import type * as Dumling from "dumling/types";
import { directSemanticRelationValues, selectKnowledge } from "dumrel";
import type * as Dumrel from "dumrel/types";

/**
 * The Knowledge one occurrence asks for. `valency` is requested only when
 * intake attested a governed preposition the Reading's Valency Frame lacks
 * (ADR 0034); a Reading whose Knowledge is already Full asks only for missing
 * translation languages and that government (`topUpOnly`).
 */
export function generationRequestFor(
	reading: { readonly lemma: Dumling.Lemma<"de"> },
	qualifiedKinds: readonly Dumrel.DirectSemanticRelation[],
	options: {
		readonly translationLanguages?: readonly Dumrel.TranslationLanguage[];
		readonly topUpOnly?: boolean;
		readonly attestsGovernment?: boolean;
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
	const government =
		options.attestsGovernment && applicable.valency === null
			? { valency: null }
			: {};
	if (options.topUpOnly) {
		return {
			...(applicable.translations
				? { translations: applicable.translations }
				: {}),
			...government,
		};
	}
	const {
		morphologicalTree: _morphologicalTree,
		lexicalBreakdown: _lexicalBreakdown,
		valency: _valency,
		...rest
	} = applicable;
	const request = { ...rest, ...government };
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
