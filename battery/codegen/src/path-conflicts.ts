import { sep } from "node:path";
import {
	CodegenConfigurationError,
	CodegenOwnershipError,
	CodegenPlanError,
} from "./errors.js";
import { compareCodeUnits, pathIdentity } from "./paths.js";
import type { PlannedArtifact, PlannedChange } from "./types.js";
import { formatProvenance } from "./values.js";

type ManifestDestination = Readonly<{
	destination: string;
	target: string;
}>;

type PathConflictItem<T> = Readonly<{
	identity: string;
	item: T;
	sortKey: string;
}>;

export function validateManifestDestinations(
	manifests: readonly ManifestDestination[],
): void {
	assertNoPathConflicts(
		manifests,
		(manifest) => manifest.destination,
		(manifest, other) => {
			throw new CodegenConfigurationError(
				`Ownership manifests for outputs "${manifest.target}" and "${other.target}" have conflicting paths "${manifest.destination}" and "${other.destination}".`,
			);
		},
	);
}

export function validateArtifactSet(
	artifacts: readonly PlannedArtifact<string, unknown>[],
): void {
	const ids = new Map<string, PlannedArtifact<string, unknown>>();
	for (const artifact of artifacts) {
		const duplicateId = ids.get(artifact.id);
		if (duplicateId !== undefined) {
			throw new CodegenPlanError(
				`Artifact id "${artifact.id}" is defined more than once (${formatProvenance(
					duplicateId.provenance,
				)}; ${formatProvenance(artifact.provenance)}).`,
			);
		}
		ids.set(artifact.id, artifact);
	}

	assertNoPathConflicts(
		artifacts,
		(artifact) => artifact.destination,
		(artifact, other) => {
			throw new CodegenPlanError(
				`Artifacts "${artifact.id}" and "${other.id}" have conflicting destinations "${artifact.destination}" and "${other.destination}" (${formatProvenance(
					artifact.provenance,
				)}; ${formatProvenance(other.provenance)}).`,
			);
		},
	);
}

export function validateStaleDestinations(
	staleChanges: readonly PlannedChange[],
	artifacts: readonly PlannedArtifact<string, unknown>[],
	manifests: readonly ManifestDestination[],
): void {
	assertNoCrossPathConflicts(
		staleChanges,
		(stale) => stale.destination,
		artifacts,
		(artifact) => artifact.destination,
		(stale, artifact) => {
			throw new CodegenPlanError(
				`Stale owned file "${stale.destination}" conflicts with planned artifact "${artifact.id}".`,
			);
		},
	);
	assertNoCrossPathConflicts(
		staleChanges,
		(stale) => stale.destination,
		manifests,
		(manifest) => manifest.destination,
		(stale, manifest) => {
			throw new CodegenOwnershipError(
				`Stale owned file "${stale.destination}" conflicts with ownership manifest "${manifest.destination}".`,
			);
		},
	);
	assertNoPathConflicts(
		staleChanges,
		(stale) => stale.destination,
		(stale, other) => {
			throw new CodegenOwnershipError(
				`Ownership manifests claim conflicting stale files "${stale.destination}" and "${other.destination}".`,
			);
		},
	);
}

export function validateArtifactManifestCollisions(
	artifacts: readonly PlannedArtifact<string, unknown>[],
	manifests: readonly ManifestDestination[],
): void {
	assertNoCrossPathConflicts(
		artifacts,
		(artifact) => artifact.destination,
		manifests,
		(manifest) => manifest.destination,
		(artifact, manifest) => {
			throw new CodegenPlanError(
				`Artifact "${artifact.id}" conflicts with ownership manifest "${manifest.destination}".`,
			);
		},
	);
}

function toPathConflictItem<T>(
	item: T,
	destinationOf: (item: T) => string,
): PathConflictItem<T> {
	const identity = pathIdentity(destinationOf(item));
	return {
		identity,
		item,
		sortKey: identity.replaceAll(sep, "\0"),
	};
}

function isSameOrAncestorPath(ancestor: string, descendant: string): boolean {
	return (
		ancestor === descendant || descendant.startsWith(`${ancestor}${sep}`)
	);
}

function assertNoPathConflicts<T>(
	items: readonly T[],
	destinationOf: (item: T) => string,
	onConflict: (left: T, right: T) => never,
): void {
	if (items.length < 2) {
		return;
	}
	const sorted = items
		.map((item) => toPathConflictItem(item, destinationOf))
		.sort((left, right) => compareCodeUnits(left.sortKey, right.sortKey));
	for (let index = 1; index < sorted.length; index += 1) {
		const previous = sorted[index - 1];
		const current = sorted[index];
		if (
			previous !== undefined &&
			current !== undefined &&
			isSameOrAncestorPath(previous.identity, current.identity)
		) {
			onConflict(previous.item, current.item);
		}
	}
}

function popNonAncestors<T>(
	stack: PathConflictItem<T>[],
	identity: string,
): void {
	while (stack.length > 0) {
		const top = stack.at(-1);
		if (top !== undefined && isSameOrAncestorPath(top.identity, identity)) {
			break;
		}
		stack.pop();
	}
}

function assertNoCrossPathConflicts<Left, Right>(
	leftItems: readonly Left[],
	leftDestination: (item: Left) => string,
	rightItems: readonly Right[],
	rightDestination: (item: Right) => string,
	onConflict: (left: Left, right: Right) => never,
): void {
	if (leftItems.length === 0 || rightItems.length === 0) {
		return;
	}
	const combined: (
		| (PathConflictItem<Left> & { readonly side: "left" })
		| (PathConflictItem<Right> & { readonly side: "right" })
	)[] = [
		...leftItems.map((item) => ({
			...toPathConflictItem(item, leftDestination),
			side: "left" as const,
		})),
		...rightItems.map((item) => ({
			...toPathConflictItem(item, rightDestination),
			side: "right" as const,
		})),
	].sort((left, right) => compareCodeUnits(left.sortKey, right.sortKey));

	const leftAncestors: PathConflictItem<Left>[] = [];
	const rightAncestors: PathConflictItem<Right>[] = [];
	for (const entry of combined) {
		popNonAncestors(leftAncestors, entry.identity);
		popNonAncestors(rightAncestors, entry.identity);
		if (entry.side === "left") {
			const conflict = rightAncestors.at(-1);
			if (conflict !== undefined) {
				onConflict(entry.item, conflict.item);
			}
			leftAncestors.push(entry);
		} else {
			const conflict = leftAncestors.at(-1);
			if (conflict !== undefined) {
				onConflict(conflict.item, entry.item);
			}
			rightAncestors.push(entry);
		}
	}
}
