import type { CaseSelection } from "./contracts";
import { getSelectionState } from "./golden-corpus";

export type ContaminationEntry = {
	readonly id: string;
	readonly exactFingerprint: string;
	readonly routeFingerprint?: string;
	readonly contaminationKeys: readonly string[];
};

export function assertCaseSelectionsUncontaminated(args: {
	readonly route: string;
	readonly demonstrations: CaseSelection;
	readonly evaluation: CaseSelection;
}): void {
	assertEntriesUncontaminated({
		route: args.route,
		demonstrations: getSelectionState(args.demonstrations).entries,
		evaluation: getSelectionState(args.evaluation).entries,
	});
}

export function assertEntriesUncontaminated(args: {
	readonly route: string;
	readonly demonstrations: readonly ContaminationEntry[];
	readonly evaluation: readonly ContaminationEntry[];
}): void {
	const checks: readonly {
		readonly name: string;
		readonly conflict: (
			left: ContaminationEntry,
			right: ContaminationEntry,
		) => boolean;
	}[] = [
		{ name: "case ID", conflict: (left, right) => left.id === right.id },
		{
			name: "exact parsed-input fingerprint",
			conflict: (left, right) =>
				left.exactFingerprint === right.exactFingerprint,
		},
		{
			name: "route-specific fingerprint",
			conflict: (left, right) =>
				left.routeFingerprint !== undefined &&
				right.routeFingerprint !== undefined &&
				left.routeFingerprint === right.routeFingerprint,
		},
		{
			name: "contamination key",
			conflict: (left, right) => {
				const rightKeys = new Set(right.contaminationKeys);
				return left.contaminationKeys.some((key) => rightKeys.has(key));
			},
		},
	];

	for (const check of checks) {
		for (const demonstration of args.demonstrations) {
			for (const evaluated of args.evaluation) {
				if (check.conflict(demonstration, evaluated)) {
					throw new Error(
						`Selection contamination for route "${args.route}": demonstration case "${demonstration.id}" conflicts with evaluation case "${evaluated.id}" by ${check.name}.`,
					);
				}
			}
		}
	}
}
