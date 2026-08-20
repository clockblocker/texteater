import type { Reading } from "dumling/types";
import type { DirectSemanticRelation } from "dumrel";
import { defaultKnowledgeRequestMask } from "dumrel";
import { directSemanticRelationValues } from "dumrel/vocabulary";

/**
 * Request-mask construction is intentionally kept outside convex/. Importing
 * dumrel's barrel eagerly constructs its Dumling/Zod schema graph, which is too
 * large for Convex's 64 MB isolate module-analysis ceiling. The Node action
 * dynamically imports this helper only when generation actually runs.
 */
export function generationRequestFor(
	reading: Reading<"de">,
	qualifiedKinds: readonly DirectSemanticRelation[],
) {
	const applicable = defaultKnowledgeRequestMask(reading);
	if (!applicable) throw new Error("Unsupported Knowledge language.");
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
