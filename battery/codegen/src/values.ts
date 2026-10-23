import { CodegenPlanError } from "./errors.js";
import type { PlannedChange, Provenance } from "./types.js";

export function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
	if (left.byteLength !== right.byteLength) {
		return false;
	}
	return left.every((byte, index) => byte === right[index]);
}

export function cloneAndFreezeMetadata<Metadata>(
	metadata: Metadata,
	artifactId: string,
): Metadata {
	return deepFreeze(cloneMetadata(metadata, artifactId));
}

export function cloneMetadata<Metadata>(
	metadata: Metadata,
	artifactId: string,
): Metadata {
	try {
		return structuredClone(metadata);
	} catch (error) {
		throw new CodegenPlanError(
			`Artifact "${artifactId}" metadata is not cloneable: ${errorMessage(error)}`,
		);
	}
}

export function deepFreeze<T>(value: T): T {
	if (
		typeof value !== "object" ||
		value === null ||
		ArrayBuffer.isView(value) ||
		Object.isFrozen(value)
	) {
		return value;
	}
	for (const nested of Object.values(value)) {
		deepFreeze(nested);
	}
	return Object.freeze(value);
}

export function freezeArray<T>(items: readonly T[]): readonly T[] {
	return Object.freeze([...items]);
}

export function freezeChange(change: PlannedChange): PlannedChange {
	return Object.freeze(change);
}

export function formatProvenance(provenance: readonly Provenance[]): string {
	if (provenance.length === 0) {
		return "no provenance";
	}
	return provenance
		.map((entry) =>
			entry.kind === "source"
				? `${entry.path}${entry.line === undefined ? "" : `:${entry.line}`}`
				: `artifact:${entry.id}`,
		)
		.join(", ");
}

export function errorCode(error: unknown): string | undefined {
	if (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		typeof error.code === "string"
	) {
		return error.code;
	}
	return undefined;
}

export function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
