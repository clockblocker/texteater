/** Payloads keep linguistic data and prompts, but never transport credentials. */
export function inspectionJson(value: unknown): string {
	const ancestors: object[] = [];
	return (
		JSON.stringify(
			value,
			function (key, item: unknown) {
				if (
					/^(authorization|api[-_]?key|access[-_]?token|token|secret|password|cookie|headers)$/i.test(
						key,
					)
				)
					return "<REDACTED>";
				if (key === "signal") return undefined;
				if (typeof item === "bigint") return item.toString();
				if (item instanceof Error)
					return { name: item.name, message: item.message };
				if (item && typeof item === "object") {
					while (ancestors.length && ancestors.at(-1) !== this)
						ancestors.pop();
					if (ancestors.includes(item)) return "[Circular reference]";
					ancestors.push(item);
				}
				return item;
			},
			2,
		) ?? "null"
	);
}
