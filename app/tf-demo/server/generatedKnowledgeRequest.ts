import type * as Dumling from "dumling/types";
import { directSemanticRelationValues, selectKnowledge } from "dumrel";
import type * as Dumrel from "dumrel/types";

export function generationRequestFor(
	reading: Dumling.Reading<"de">,
	qualifiedKinds: readonly Dumrel.DirectSemanticRelation[],
) {
	const {
		unitKind: _unitKind,
		canonicalForm: _canonicalForm,
		coreFeatures: _coreFeatures,
		...route
	} = reading.lemma;
	const selected = selectKnowledge({ route });
	if (!selected.success) throw selected.error;
	const applicable = selected.value;
	const {
		morphologicalTree: _morphologicalTree,
		lexicalBreakdown: _lexicalBreakdown,
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
