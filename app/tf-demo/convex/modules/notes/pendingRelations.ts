import { v } from "convex/values";
import type { SemanticRelation } from "dumrel";
import { semanticRelationValues } from "dumrel/vocabulary";

import type { Id } from "../../_generated/dataModel";
import { semanticRelationValidator } from "../../model/validators";

type UnknownRecord = Record<string, unknown>;

export const pendingRelationProjectionValidator = v.object({
	locatorKey: v.string(),
	relation: semanticRelationValidator,
	targetCanonicalForm: v.string(),
	targetFamily: v.string(),
	targetKind: v.string(),
	target: v.object({
		kind: v.literal("ShadowNote"),
		shadowId: v.id("shadows"),
	}),
});

export type PendingRelationProjection = {
	readonly locatorKey: string;
	readonly relation: SemanticRelation;
	readonly targetCanonicalForm: string;
	readonly targetFamily: string;
	readonly targetKind: string;
	readonly target: {
		readonly kind: "ShadowNote";
		readonly shadowId: Id<"shadows">;
	};
};

export function projectPendingRelations(
	rows: readonly {
		locatorKey: string;
		sourceReadingKey: string;
		targetCanonicalForm: string;
		shadowId?: Id<"shadows">;
		record: unknown;
	}[],
): PendingRelationProjection[] {
	return rows.flatMap((row) => {
		const { locatorKey, shadowId, record: recordValue } = row;
		const record = optionalRecord(recordValue);
		const pending = optionalRecord(record?.pending);
		const locator = optionalRecord(record?.locator);
		const target = optionalRecord(pending?.target);
		const relation = pending?.relation;
		const targetCanonicalForm = optionalNonEmptyString(
			target?.canonicalForm,
		);
		const targetFamily = optionalNonEmptyString(target?.family);
		const targetKind = optionalNonEmptyString(target?.kind);
		return isSemanticRelation(relation) &&
			shadowId &&
			locator?.sourceReadingKey === row.sourceReadingKey &&
			locator.relation === relation &&
			typeof locator.targetPendingId === "string" &&
			locatorKey ===
				JSON.stringify([
					row.sourceReadingKey,
					relation,
					locator.targetPendingId,
				]) &&
			row.targetCanonicalForm === targetCanonicalForm &&
			targetCanonicalForm &&
			targetFamily &&
			targetKind
			? [
					{
						locatorKey,
						relation,
						targetCanonicalForm,
						targetFamily,
						targetKind,
						target: {
							kind: "ShadowNote" as const,
							shadowId,
						},
					},
				]
			: [];
	});
}

function isSemanticRelation(value: unknown): value is SemanticRelation {
	return semanticRelationValues.some((relation) => relation === value);
}

function optionalRecord(value: unknown): UnknownRecord | null {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as UnknownRecord)
		: null;
}

function optionalNonEmptyString(value: unknown): string | null {
	return typeof value === "string" && value.trim().length > 0
		? value.trim()
		: null;
}
