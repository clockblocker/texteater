import { ParsingError } from "common-utils";
import type * as Dumling from "dumling/types";
import { contextualizeKnowledge, parseSource } from "./context.js";
import { parseKnowledgeShape } from "./validation.js";

export function parseReadingKnowledge<const R extends Dumling.Reading>(input: {
	source: R;
	knowledge: unknown;
}) {
	const source = parseSource(input.source);
	if (source instanceof ParsingError)
		return { success: false, error: source } as const;
	const knowledge = parseKnowledgeShape(input.knowledge);
	if (knowledge instanceof ParsingError)
		return { success: false, error: knowledge } as const;
	const contextual = contextualizeKnowledge(source, knowledge);
	return contextual instanceof ParsingError
		? ({ success: false, error: contextual } as const)
		: ({ success: true, value: contextual } as const);
}
