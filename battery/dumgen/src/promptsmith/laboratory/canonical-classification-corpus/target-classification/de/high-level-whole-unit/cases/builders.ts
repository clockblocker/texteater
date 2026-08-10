import type { input, output } from "zod";

import type { canonicalInputSchema, canonicalOutputSchema } from "../schemas";

export type Segment = input<typeof canonicalInputSchema>["segments"][number];
export type Route = NonNullable<
	Extract<
		output<typeof canonicalOutputSchema>,
		{ decision: "Resolved" }
	>["target"]
>;

export function sentence(
	words: readonly string[],
	punctuation: string | null = ".",
): Segment[] {
	const segments: Segment[] = [];
	for (const [index, text] of words.entries()) {
		if (index > 0) {
			segments.push({ kind: "Whitespace", text: " " });
		}
		segments.push({ kind: "ResolvableText", text });
	}
	if (punctuation !== null) {
		segments.push({ kind: "Punctuation", text: punctuation });
	}
	return segments;
}

export function sentences(items: readonly (readonly string[])[]): Segment[] {
	const segments: Segment[] = [];
	for (const [index, words] of items.entries()) {
		if (index > 0) {
			segments.push({ kind: "Whitespace", text: " " });
		}
		segments.push(...sentence(words));
	}
	return segments;
}

export function resolved<const Family extends Route["family"]>(
	segments: readonly Segment[],
	clickedSegmentIndex: number,
	memberSegmentIndices: readonly number[],
	family: Family,
	kind: Extract<Route, { family: Family }>["kind"],
) {
	return {
		input: { clickedSegmentIndex, segments: [...segments] },
		idealOutput: {
			decision: "Resolved" as const,
			target: {
				family,
				kind,
				memberSegmentIndices: [...memberSegmentIndices],
			},
		},
	};
}

export function unresolved(
	segments: readonly Segment[],
	clickedSegmentIndex: number,
) {
	return {
		input: { clickedSegmentIndex, segments: [...segments] },
		idealOutput: { decision: "Unresolved" as const },
	};
}

export function addCaseEvidence<
	const Cases extends Readonly<Record<string, object>>,
>(
	cases: Cases,
	explanationFor: (caseId: keyof Cases & string) => string,
): {
	readonly [CaseId in keyof Cases]: Cases[CaseId] & { explanation: string };
} {
	return Object.fromEntries(
		Object.entries(cases).map(([caseId, goldenCase]) => [
			caseId,
			{
				...goldenCase,
				explanation: explanationFor(caseId as keyof Cases & string),
			},
		]),
	) as {
		readonly [CaseId in keyof Cases]: Cases[CaseId] & {
			explanation: string;
		};
	};
}
