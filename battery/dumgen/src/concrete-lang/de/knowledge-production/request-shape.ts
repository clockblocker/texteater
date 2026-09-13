import type { KnowledgeRequest } from "../../../types.js";
export function assertRequestShape(
	request: KnowledgeRequest,
	analysis: object,
): void {
	const expected = Object.keys(request).sort(),
		actual = Object.keys(analysis).sort();
	if (JSON.stringify(expected) !== JSON.stringify(actual))
		throw Error(
			"Knowledge output must mirror every requested aspect, using null for an absent candidate",
		);
	for (const aspect of expected) {
		const selected = (request as Record<string, unknown>)[aspect];
		if (selected && typeof selected === "object") {
			const output = (analysis as Record<string, unknown>)[aspect];
			if (
				!output ||
				typeof output !== "object" ||
				JSON.stringify(Object.keys(selected).sort()) !==
					JSON.stringify(Object.keys(output).sort())
			)
				throw Error(
					`Knowledge output must mirror requested ${aspect} leaves`,
				);
		}
	}
}
