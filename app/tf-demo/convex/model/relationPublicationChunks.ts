import { MAX_PLANNED_CHANGES } from "../dumdictTransaction";

/**
 * Relation targets and pending proposals one publication starts with. Each
 * usually plans a pending record and a patch on its target Reading, beside
 * the one patch on the source Reading. That is only an estimate: the planner
 * counts the real changes, and a chunk over the cap is split and sent again.
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
 * The smallest part of a publication's relations that commits on its own:
 * a relation change, one target of a relation Contribute, or one pending
 * proposal. `index` is the change's position in the publication.
 */
type RelationUnit<TChange, TPendingRelation> =
	| {
			readonly kind: "Change";
			readonly index: number;
			readonly change: TChange;
	  }
	| {
			readonly kind: "Target";
			readonly index: number;
			readonly change: TChange;
			readonly target: unknown;
	  }
	| { readonly kind: "Pending"; readonly pending: TPendingRelation };

/** Relation units, plus the rest of the Knowledge only the last chunk takes. */
type Chunk<TChange, TPendingRelation> = {
	readonly units: readonly RelationUnit<TChange, TPendingRelation>[];
	readonly rest: readonly {
		readonly index: number;
		readonly change: TChange;
	}[];
};

function relationUnits<TChange, TPendingRelation>(publishable: {
	readonly changes: readonly TChange[];
	readonly pendingRelations: readonly TPendingRelation[];
}): Chunk<TChange, TPendingRelation> {
	const units: RelationUnit<TChange, TPendingRelation>[] = [];
	const rest: { index: number; change: TChange }[] = [];
	for (const [index, change] of publishable.changes.entries()) {
		if (!isRelationChange(change)) {
			rest.push({ index, change });
			continue;
		}
		const targets = contributedTargets(change);
		if (!targets || targets.length <= 1) {
			units.push({ kind: "Change", index, change });
			continue;
		}
		// A Contribute splits by target; each part adds its own targets.
		for (const target of targets)
			units.push({ kind: "Target", index, change, target });
	}
	for (const pending of publishable.pendingRelations)
		units.push({ kind: "Pending", pending });
	return { units, rest };
}

/**
 * The changes and proposals a chunk sends, in publication order. The
 * targets it holds of one Contribute travel as one narrower Contribute.
 */
function chunkPublication<TChange, TPendingRelation>(
	chunk: Chunk<TChange, TPendingRelation>,
): { changes: TChange[]; pendingRelations: TPendingRelation[] } {
	const changes = new Map<number, TChange>();
	const targets = new Map<number, unknown[]>();
	const pendingRelations: TPendingRelation[] = [];
	for (const unit of chunk.units) {
		if (unit.kind === "Pending") pendingRelations.push(unit.pending);
		else if (unit.kind === "Change") changes.set(unit.index, unit.change);
		else {
			const value = targets.get(unit.index) ?? [];
			value.push(unit.target);
			targets.set(unit.index, value);
			changes.set(unit.index, { ...unit.change, value } as TChange);
		}
	}
	for (const { index, change } of chunk.rest) changes.set(index, change);
	return {
		changes: [...changes.entries()]
			.sort(([left], [right]) => left - right)
			.map(([, change]) => change),
		pendingRelations,
	};
}

/**
 * Splits a final Knowledge publication into chunks of at most
 * `unitsPerChunk` relation units. Every chunk but the last holds only
 * relation changes; the last holds the rest of the Knowledge and is the one
 * that settles the run. A publication within the budget stays whole.
 */
function packRelationUnits<TChange, TPendingRelation>(
	whole: Chunk<TChange, TPendingRelation>,
	unitsPerChunk: number,
): Chunk<TChange, TPendingRelation>[] {
	const chunks: Chunk<TChange, TPendingRelation>[] = [];
	for (
		let offset = 0;
		offset + unitsPerChunk < whole.units.length;
		offset += unitsPerChunk
	)
		chunks.push({
			units: whole.units.slice(offset, offset + unitsPerChunk),
			rest: [],
		});
	const packed = chunks.length * unitsPerChunk;
	chunks.push({ units: whole.units.slice(packed), rest: whole.rest });
	return chunks;
}

/**
 * Halves a chunk whose plan went over budget. The rest of the Knowledge
 * stays with the later half, so the last chunk still settles the run.
 */
function splitChunk<TChange, TPendingRelation>(
	chunk: Chunk<TChange, TPendingRelation>,
): [Chunk<TChange, TPendingRelation>, Chunk<TChange, TPendingRelation>] {
	const parts = chunk.units.length + (chunk.rest.length > 0 ? 1 : 0);
	if (parts < 2)
		throw new Error(
			`A Knowledge publication part that cannot be split plans more than ${MAX_PLANNED_CHANGES} dictionary changes.`,
		);
	const middle = Math.ceil(parts / 2);
	return [
		{ units: chunk.units.slice(0, middle), rest: [] },
		{ units: chunk.units.slice(middle), rest: chunk.rest },
	];
}

/**
 * Publishes a final Knowledge publication chunk by chunk and stops at the
 * first chunk that is neither Committed nor OverBudget. A chunk whose plan
 * is OverBudget wrote nothing and is split and sent again, so the planner's
 * own count, not the estimate, bounds every commit. Only the last chunk is
 * final, and it carries every relation proposal so the run records them all.
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
	unitsPerChunk: number = RELATION_UNITS_PER_PUBLICATION,
): Promise<void> {
	const chunks = packRelationUnits(relationUnits(publishable), unitsPerChunk);
	const queue = chunks.map((chunk, index) => ({
		chunk,
		final: index === chunks.length - 1,
	}));
	for (let next = queue.shift(); next; next = queue.shift()) {
		const { chunk, final } = next;
		const publication = chunkPublication(chunk);
		const status = await publishChunk({
			...publication,
			final,
			proposed: final
				? publishable.pendingRelations
				: publication.pendingRelations,
		});
		if (status === "OverBudget") {
			const [first, second] = splitChunk(chunk);
			queue.unshift(
				{ chunk: first, final: false },
				{ chunk: second, final },
			);
			continue;
		}
		if (status !== "Committed") return;
	}
}
