import type * as Dumling from "dumling/types";
import { directSemanticRelationValues, selectKnowledge } from "dumrel";
import type * as Dumrel from "dumrel/types";

export function generationRequestFor(
	reading: Dumling.Reading<"de">,
	qualifiedKinds: readonly Dumrel.DirectSemanticRelation[],
	options: {
		readonly translationLanguages?: readonly Dumrel.TranslationLanguage[];
		readonly translationsOnly?: boolean;
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
	if (options.translationsOnly) {
		return applicable.translations
			? { translations: applicable.translations }
			: {};
	}
	const {
		morphologicalTree: _morphologicalTree,
		lexicalBreakdown: _lexicalBreakdown,
		...base
	} = applicable;
	const request = {
		...base,
		...(reading.lemma.kind === "Fusion" &&
		applicable.lexicalBreakdown === null
			? { lexicalBreakdown: null }
			: {}),
	};
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
