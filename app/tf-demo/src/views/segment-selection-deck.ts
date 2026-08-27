import type { WorkspaceTarget } from "../workspace/sheet-workspace";
import type { WorkspaceCardTarget } from "../workspace/workspace-controller";
import {
	type CanonicalResolution,
	canonicalResolutionDeckCards,
	resolutionDeckCardKey,
} from "./resolution-deck";

type AvailableSelection = {
	readonly kind: "Available";
	readonly target: WorkspaceTarget;
	readonly canonical: CanonicalResolution;
};

type ResolvingSelection = {
	readonly kind: "Resolving";
	readonly requestId: string;
};

export function segmentSelectionDeckCards(
	requestId: string,
	result: AvailableSelection | ResolvingSelection,
): readonly WorkspaceCardTarget[] {
	if (result.kind === "Available") {
		return canonicalResolutionDeckCards(
			requestId,
			result.target,
			result.canonical,
		);
	}
	return [
		{
			key: resolutionDeckCardKey(result.requestId, "Resolver"),
			target: { kind: "Resolution", requestId: result.requestId },
		},
	];
}
