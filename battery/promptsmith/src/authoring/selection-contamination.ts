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
	const evaluationState = getSelectionState(args.evaluation);
	const evaluation = evaluationState.entries;
	const evaluationIds = evaluationState.idSet;
	for (const demonstration of demonstrations) {
		if (evaluationIds.has(demonstration.id))
			throw contamination(
				args.route,
				demonstration.id,
				demonstration.id,
				"case ID",
			);
	}
	const evaluationByKey = new Map<
		string,
		{ readonly id: string; readonly index: number }
	>();
	for (const [index, evaluated] of evaluation.entries()) {
		for (const key of evaluated.contaminationKeys) {
			if (!evaluationByKey.has(key)) {
				evaluationByKey.set(key, { id: evaluated.id, index });
			}
		}
	}
	for (const demonstration of demonstrations) {
		let earliest:
			| { readonly id: string; readonly index: number }
			| undefined;
		for (const key of demonstration.contaminationKeys) {
			const match = evaluationByKey.get(key);
			if (
				match !== undefined &&
				(earliest === undefined || match.index < earliest.index)
			) {
				earliest = match;
			}
		}
		if (earliest !== undefined) {
			throw contamination(
				args.route,
				demonstration.id,
				earliest.id,
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
