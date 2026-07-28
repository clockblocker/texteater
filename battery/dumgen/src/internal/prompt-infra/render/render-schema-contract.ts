import type { ZodType } from "zod";

import { getSchemaDescriptor } from "../schema/schema-descriptor";

export function renderSchemaContract(schema: ZodType): string {
	return renderSchemaDescriptor(getSchemaDescriptor(schema), 0);
}

function renderSchemaDescriptor(
	descriptor: ReturnType<typeof getSchemaDescriptor>,
	indentLevel: number,
): string {
	const indent = "  ".repeat(indentLevel);
	const nestedIndent = "  ".repeat(indentLevel + 1);

	switch (descriptor.kind) {
		case "string":
		case "number":
		case "boolean":
		case "null":
			return descriptor.kind;
		case "literal":
			return `literal(${JSON.stringify(descriptor.value)})`;
		case "enum":
			return `enum(${descriptor.values.join(" | ")})`;
		case "array":
			return `[\n${nestedIndent}${renderSchemaDescriptor(descriptor.item, indentLevel + 1)}\n${indent}]`;
		case "optional":
			return `${renderSchemaDescriptor(descriptor.inner, indentLevel)} | undefined`;
		case "union":
			return descriptor.options
				.map((option) => renderSchemaDescriptor(option, indentLevel))
				.join(" | ");
		case "object":
			return [
				"{",
				...Object.entries(descriptor.properties).map(
					([key, value]) =>
						`${nestedIndent}${JSON.stringify(key)}: ${renderSchemaDescriptor(value, indentLevel + 1)}`,
				),
				`${indent}}`,
			].join("\n");
	}
}
