import { isRecord } from "common-utils";
import { v } from "convex/values";
import type * as Dumling from "dumling/types";
import { directSemanticRelationValues } from "dumrel";
import type * as Dumrel from "dumrel/types";
import { foldedCanonicalForm } from "../../../server/linguisticIdentity";

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
		kind: v.literal("Shadow"),
		shadowId: v.id("shadows"),
	}),
});

export type PendingRelationProjection = {
	readonly locatorKey: string;
	readonly relation: Dumrel.SemanticRelation;
	readonly targetCanonicalForm: string;
	readonly targetFamily: string;
	readonly targetKind: string;
	readonly target: {
		readonly kind: "Shadow";
		readonly shadowId: Id<"shadows">;
	};
};

export function projectPendingRelations(
	rows: readonly {
		locatorKey: string;
		sourceReadingKey: string;
		targetFoldedCanonicalForm: string;
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
		const language = target?.language;
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
			targetCanonicalForm &&
			isLanguage(language) &&
			row.targetFoldedCanonicalForm ===
				foldedCanonicalForm({
					language,
					canonicalForm: targetCanonicalForm,
				}) &&
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
							kind: "Shadow" as const,
							shadowId,
						},
					},
				]
			: [];
	});
}

function isLanguage(value: unknown): value is Dumling.Language {
	return value === "de" || value === "en" || value === "he";
}

function isSemanticRelation(value: unknown): value is Dumrel.SemanticRelation {
	return directSemanticRelationValues.some((relation) => relation === value);
}

function optionalRecord(value: unknown): UnknownRecord | null {
	return isRecord(value) ? value : null;
}

function optionalNonEmptyString(value: unknown): string | null {
	return typeof value === "string" && value.trim().length > 0
		? value.trim()
		: null;
}
