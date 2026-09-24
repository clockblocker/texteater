import { MAX_PLANNED_CHANGES } from "../dumdictStorage/storage";

/**
 * Relation targets and pending proposals one publication may carry. Each can
 * plan a pending record and a patch on its target Reading, beside the one
 * patch on the source Reading, so a chunk stays under the planned-change cap.
 */
const RELATION_UNITS_PER_PUBLICATION = Math.floor(
	(MAX_PLANNED_CHANGES - 1) / 2,
);

type RelationContribution = {
	readonly kind: "Contribute";
	readonly aspect: "semanticRelations";
	readonly value: readonly unknown[];
};

function isRelationChange(change: unknown): boolean {
	return (
		typeof change === "object" &&
		change !== null &&
		"aspect" in change &&
		change.aspect === "semanticRelations"
	);
}

/** The targets of a relation Contribute, which adds only distinct targets. */
function contributedTargets(change: unknown): readonly unknown[] | null {
	if (!isRelationChange(change)) return null;
	const { kind, value } = change as RelationContribution;
	return kind === "Contribute" && Array.isArray(value) ? value : null;
}

/**
 * Splits a final Knowledge publication into publications that each plan at
 * most MAX_PLANNED_CHANGES dictionary changes. Every chunk but the last holds
 * only relation changes; the last holds the rest of the Knowledge and is the
 * one that settles the run. A publication within the budget stays whole.
 */
function relationPublicationChunks<TChange, TPendingRelation>(
	publishable: {
		readonly changes: readonly TChange[];
		readonly pendingRelations: readonly TPendingRelation[];
	},
	unitsPerChunk: number = RELATION_UNITS_PER_PUBLICATION,
): { changes: TChange[]; pendingRelations: TPendingRelation[] }[] {
	const relationChanges = publishable.changes.filter(isRelationChange);
	const units =
		relationChanges.reduce(
			(total, change) =>
				total + Math.max(1, contributedTargets(change)?.length ?? 1),
			0,
		) + publishable.pendingRelations.length;
	if (units <= unitsPerChunk)
		return [
			{
				changes: [...publishable.changes],
				pendingRelations: [...publishable.pendingRelations],
			},
		];

	const chunks: {
		changes: TChange[];
		pendingRelations: TPendingRelation[];
	}[] = [];
	let current: (typeof chunks)[number] = {
		changes: [],
		pendingRelations: [],
	};
	let room = unitsPerChunk;
	const makeRoom = () => {
		if (room > 0) return;
		chunks.push(current);
		current = { changes: [], pendingRelations: [] };
		room = unitsPerChunk;
	};
	for (const change of relationChanges) {
		const targets = contributedTargets(change);
		if (!targets || targets.length <= 1) {
			makeRoom();
			current.changes.push(change);
			room -= 1;
			continue;
		}
		// A Contribute splits by target; each part adds its own targets.
		for (let offset = 0; offset < targets.length; ) {
			makeRoom();
			const value = targets.slice(offset, offset + room);
			current.changes.push({ ...change, value } as TChange);
			offset += value.length;
			room -= value.length;
		}
	}
	for (const pending of publishable.pendingRelations) {
		makeRoom();
		current.pendingRelations.push(pending);
		room -= 1;
	}
	current.changes.push(
		...publishable.changes.filter((change) => !isRelationChange(change)),
	);
	chunks.push(current);
	return chunks;
}

/**
 * Publishes a final Knowledge publication chunk by chunk and stops at the
 * first chunk that is not Committed. Only the last chunk is final, and it
 * carries every relation proposal so the run records them all.
 */
export async function publishInRelationChunks<TChange, TPendingRelation>(
	publishable: {
		readonly changes: readonly TChange[];
		readonly pendingRelations: readonly TPendingRelation[];
	},
	publishChunk: (chunk: {
		readonly final: boolean;
		readonly changes: TChange[];
		readonly pendingRelations: TPendingRelation[];
		readonly proposed: readonly TPendingRelation[];
	}) => Promise<string>,
	unitsPerChunk?: number,
): Promise<void> {
	const chunks = relationPublicationChunks(publishable, unitsPerChunk);
	for (const [index, chunk] of chunks.entries()) {
		const final = index === chunks.length - 1;
		const status = await publishChunk({
			...chunk,
			final,
			proposed: final
				? publishable.pendingRelations
				: chunk.pendingRelations,
		});
		if (status !== "Committed") return;
	}
}
