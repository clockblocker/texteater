import type { CaseSelection } from "./contracts";
import { getSelectionState } from "./golden-corpus";

/**
 * Rejects overlap between two selections from the same corpus, by case ID or
 * by a shared contamination key. Exact duplicate inputs need no check here:
 * a corpus already rejects two cases with the same parsed input.
 */
export function assertCaseSelectionsUncontaminated(args: {
	readonly route: string;
	readonly demonstrations: CaseSelection;
	readonly evaluation: CaseSelection;
}): void {
	const demonstrations = getSelectionState(args.demonstrations).entries;
	const evaluation = getSelectionState(args.evaluation).entries;
	const evaluationIds = new Set(evaluation.map((entry) => entry.id));
	for (const demonstration of demonstrations) {
		if (evaluationIds.has(demonstration.id))
			throw contamination(
				args.route,
				demonstration.id,
				demonstration.id,
				"case ID",
			);
	}
	for (const demonstration of demonstrations) {
		const keys = new Set(demonstration.contaminationKeys);
		for (const evaluated of evaluation) {
			if (evaluated.contaminationKeys.some((key) => keys.has(key)))
				throw contamination(
					args.route,
					demonstration.id,
					evaluated.id,
					"contamination key",
				);
		}
	}
}

function contamination(
	route: string,
	demonstrationId: string,
	evaluationId: string,
	by: string,
): Error {
	return new Error(
		`Selection contamination for route "${route}": demonstration case "${demonstrationId}" conflicts with evaluation case "${evaluationId}" by ${by}.`,
	);
}
