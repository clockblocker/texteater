import type { output } from "zod";

import type {
	inputSchema,
	outputSchema,
} from "../promptsmith/production/unit-shadow-classification/schemas";
import { isSupportedUnitShadowClassificationRoute } from "../promptsmith/production/unit-shadow-classification/schemas";
export function assertSupportedUnitShadowClassification(
	input: output<typeof inputSchema>,
	classification: output<typeof outputSchema>,
): void {
	if (classification.decision === "Unresolved") return;
	if (classification.target === null) {
		throw new Error("Resolved Unit Shadow classification has no target.");
	}

	if (
		!isSupportedUnitShadowClassificationRoute(
			input.language,
			classification.target.family,
			classification.target.kind,
		)
	) {
		throw new Error(
			`${input.language}/${classification.target.family}/${classification.target.kind} is not a supported Dumling Lemma route.`,
		);
	}
}
