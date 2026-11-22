const REDACTED_KEY =
	/^(authorization|api[-_]?key|access[-_]?token|token|secret|password|cookie|headers)$/i;

function serializeError(error: Error): Record<string, unknown> {
	const fields = Object.fromEntries(
		Object.entries(error).filter(([field]) => field !== "stack"),
	);
	return {
		...fields,
		name: error.name,
		message: error.message,
		...(error.cause !== undefined ? { cause: error.cause } : {}),
	};
}

/** Payloads keep linguistic data and prompts, but never transport credentials. */
export function inspectionJson(value: unknown): string {
	const ancestors: object[] = [];
	return (
		JSON.stringify(
			value,
			function (key, item: unknown) {
				if (REDACTED_KEY.test(key)) return "<REDACTED>";
				if (key === "signal") return undefined;
				const raw =
					this && typeof this === "object"
						? (this as Record<string, unknown>)[key]
						: item;
				const candidate = raw instanceof Error ? raw : item;
				if (typeof candidate === "bigint") return candidate.toString();
				if (candidate instanceof Error)
					return serializeError(candidate);
				if (candidate && typeof candidate === "object") {
					while (ancestors.length && ancestors.at(-1) !== this)
						ancestors.pop();
					if (ancestors.includes(candidate))
						return "[Circular reference]";
					ancestors.push(candidate);
				}
				return candidate;
			},
			2,
		) ?? "null"
	);
}
