import { isRecord } from "./guards";

export function renderTsValue(value: unknown, indent = 0): string {
	const indentation = "\t".repeat(indent);
	const childIndentation = "\t".repeat(indent + 1);

	if (Array.isArray(value)) {
		if (value.length === 0) {
			return "[]";
		}
		return `[\n${value
			.map(
				(entry) =>
					`${childIndentation}${renderTsValue(entry, indent + 1)},`,
			)
			.join("\n")}\n${indentation}]`;
	}

	if (isRecord(value)) {
		const entries = Object.entries(value).filter(
			([, entryValue]) => entryValue !== undefined,
		);
		if (entries.length === 0) {
			return "{}";
		}
		return `{\n${entries
			.map(
				([key, entryValue]) =>
					`${childIndentation}${key}: ${renderTsValue(
						entryValue,
						indent + 1,
					)},`,
			)
			.join("\n")}\n${indentation}}`;
	}

	return JSON.stringify(value);
}
