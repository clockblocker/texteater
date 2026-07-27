import { getSchemaDescriptor } from "../schema/schema-descriptor";
import type { PromptSource } from "../types";
import { stableStringify } from "./stable-stringify";

export function serializePromptSource(source: PromptSource): string {
	return stableStringify({
		agentRole: source.agentRole,
		examples: source.examples,
		inputSchema: source.inputSchema
			? getSchemaDescriptor(source.inputSchema)
			: undefined,
		numOfFirstExamplesToUse: source.numOfFirstExamplesToUse,
		outputSchema: source.outputSchema
			? getSchemaDescriptor(source.outputSchema)
			: undefined,
		taskDescription: source.taskDescription,
	});
}
