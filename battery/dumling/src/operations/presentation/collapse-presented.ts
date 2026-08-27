import type { Constraint } from "common-utils";
import {
	resolveConstraint,
	selectCompatibleConstraint,
} from "../shared/parse/canonicalize-nullable.js";
import { presentedFeatureNames } from "./presented-feature-names.js";

const presentedFeatureNameSet: ReadonlySet<string> = new Set(
	presentedFeatureNames,
);

/**
 * Removes only the null padding introduced by `toPresented`. Arbitrary unknown
 * properties and non-null inapplicable features are retained for strict route
 * validation to reject.
 */
export function collapsePresentedProperties(
	constraint: Constraint,
	definitions: Readonly<Record<string, Constraint>>,
	value: unknown,
	path: readonly string[] = [],
): unknown {
	const resolved = resolveConstraint(constraint, definitions);
	switch (resolved[0]) {
		case "array":
			return Array.isArray(value)
				? value.map((item) =>
						collapsePresentedProperties(
							resolved[1],
							definitions,
							item,
							path,
						),
					)
				: value;
		case "nullable":
			if (value === null) return null;
			if (
				path.at(-1) === "surfaceFeatures" &&
				isEmptyPresentedSurfaceFeatures(value)
			) {
				return null;
			}
			return collapsePresentedProperties(
				resolved[1],
				definitions,
				value,
				path,
			);
		case "object": {
			if (!isRecord(value)) return value;
			const shape = resolved[1];
			const result: Record<string, unknown> = { ...value };

			for (const [key, child] of Object.entries(shape)) {
				if (!(key in result)) continue;
				result[key] = collapsePresentedProperties(
					child,
					definitions,
					result[key],
					[...path, key],
				);
			}

			for (const [key, child] of Object.entries(result)) {
				if (key in shape) continue;
				if (isNullFeaturePadding(path, key, child)) {
					delete result[key];
					continue;
				}
				if (
					key === "inflectionalFeatures" &&
					isEmptyPresentedFeatureSet(child)
				) {
					delete result[key];
				}
			}

			return result;
		}
		case "pipe":
			return collapsePresentedProperties(
				resolved[1],
				definitions,
				value,
				path,
			);
		case "preprocess":
			return collapsePresentedProperties(
				resolved[2],
				definitions,
				value,
				path,
			);
		case "union": {
			const selected = selectCompatibleConstraint(
				resolved[1],
				value,
				definitions,
			);
			return selected === undefined
				? value
				: collapsePresentedProperties(
						selected,
						definitions,
						value,
						path,
					);
		}
		default:
			return value;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNullFeaturePadding(
	path: readonly string[],
	key: string,
	value: unknown,
): boolean {
	const parent = path.at(-1);
	return (
		(parent === "coreFeatures" || parent === "inflectionalFeatures") &&
		presentedFeatureNameSet.has(key) &&
		value === null
	);
}

function isEmptyPresentedFeatureSet(value: unknown): boolean {
	if (!isRecord(value)) return false;
	const keys = Object.keys(value);
	return (
		keys.length === presentedFeatureNames.length &&
		keys.every(
			(key) => presentedFeatureNameSet.has(key) && value[key] === null,
		)
	);
}

function isEmptyPresentedSurfaceFeatures(value: unknown): boolean {
	if (!isRecord(value)) return false;
	const keys = Object.keys(value);
	return (
		keys.length === 1 &&
		keys[0] === "historicalStatus" &&
		value.historicalStatus === null
	);
}
