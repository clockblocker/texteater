import { type Infer, v } from "convex/values";

export const inspectionStepValidator = v.object({
	id: v.string(),
	parentId: v.optional(v.string()),
	name: v.string(),
	kind: v.union(v.literal("Code"), v.literal("LLM"), v.literal("TypeSafe")),
	owner: v.string(),
	startedAt: v.number(),
	durationMs: v.number(),
	timing: v.optional(v.literal("Unmeasured")),
	status: v.union(
		v.literal("Success"),
		v.literal("Partial"),
		v.literal("Failure"),
		v.literal("Interrupted"),
	),
});
export type InspectionStep = Infer<typeof inspectionStepValidator>;
export type CapturedInspectionStep = InspectionStep & { payloadJson: string };

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

/** Keep surrogate pairs intact when persisted as separate Convex strings. */
export function inspectionPayloadChunks(text: string): string[] {
	const chunks: string[] = [];
	for (let offset = 0; offset < text.length; ) {
		let end = Math.min(offset + 32_000, text.length);
		const last = text.charCodeAt(end - 1);
		if (end < text.length && last >= 0xd800 && last <= 0xdbff) end--;
		chunks.push(text.slice(offset, end));
		offset = end;
	}
	return chunks;
}
