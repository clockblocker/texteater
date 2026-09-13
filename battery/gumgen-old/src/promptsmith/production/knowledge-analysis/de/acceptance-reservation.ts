import { createHash } from "node:crypto";

import { stableJson } from "../../../assembly";
import type { CaseSelection } from "../../../assembly/contracts";

export type UntouchedAcceptanceReservation = Readonly<{
	status: "sealed-pending-human-approval";
	approvedByHuman: false;
	revealedCaseCount: 0;
	reservedCaseCount: number;
	selectionCommitmentSha256: string;
	selection: CaseSelection;
	gate: string;
}>;

const GATE =
	"At least one human must approve the untouched reservation before its cases are materialized into an acceptance plan or sent to a provider.";

/**
 * Seals one per-Family untouched acceptance reservation. The commitment is
 * derived exactly like the historical #193 hash: a sha256 over the stable
 * JSON of `{id, case}` pairs of the reserved selection.
 */
export function sealUntouchedAcceptanceReservation(
	selection: CaseSelection,
): UntouchedAcceptanceReservation {
	return Object.freeze({
		status: "sealed-pending-human-approval" as const,
		approvedByHuman: false as const,
		revealedCaseCount: 0 as const,
		reservedCaseCount: selection.ids.length,
		selectionCommitmentSha256: createHash("sha256")
			.update(
				stableJson(
					selection.ids.map((id, index) => ({
						id,
						case: selection.cases[index],
					})),
				),
			)
			.digest("hex"),
		selection,
		gate: GATE,
	});
}
