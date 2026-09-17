import type { KnowledgeFailure, KnowledgeRequest } from "dumgen/types";

/** Only validated content covers a request; discovery and omitted leaves do not. */
export function knowledgeRequestComplete(
	knowledge: unknown,
	request: KnowledgeRequest,
	failures: readonly KnowledgeFailure[],
): boolean {
	if (
		failures.length ||
		!knowledge ||
		typeof knowledge !== "object" ||
		!Object.keys(request).length
	)
		return false;
	for (const [aspect, selection] of Object.entries(request)) {
		const value = Reflect.get(knowledge, aspect);
		if (selection === null) {
			if (value === undefined) return false;
			continue;
		}
		if (!value || typeof value !== "object") return false;
		for (const leaf of Object.keys(selection)) {
			const contribution = Reflect.get(value, leaf);
			if (
				aspect === "translations" &&
				(!Array.isArray(contribution) || !contribution.length)
			)
				return false;
			if (aspect === "semanticRelations" && !Array.isArray(contribution))
				return false;
		}
	}
	return true;
}
