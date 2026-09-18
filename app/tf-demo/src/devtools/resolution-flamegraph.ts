type TimedSpan = {
	id: string;
	parentId?: string;
	startedAt: number;
	durationMs: number;
};

/** Keep children below parents and concurrent spans on separate rows. */
export function layoutFlamegraph<T extends TimedSpan>(steps: readonly T[]) {
	const byId = new Map(steps.map((step) => [step.id, step]));
	const placed = new Map<string, { step: T; row: number }>();
	const visiting = new Set<string>();
	const rows: T[][] = [];
	const place = (step: T): number => {
		const existing = placed.get(step.id);
		if (existing) return existing.row;
		if (visiting.has(step.id)) return -1;
		visiting.add(step.id);
		const parent = step.parentId ? byId.get(step.parentId) : undefined;
		let row = parent ? place(parent) + 1 : 0;
		const end = step.startedAt + Math.max(1, step.durationMs);
		while (
			rows[row]?.some(
				(other) =>
					step.startedAt <
						other.startedAt + Math.max(1, other.durationMs) &&
					other.startedAt < end,
			)
		)
			row++;
		rows[row] ??= [];
		rows[row].push(step);
		placed.set(step.id, { step, row });
		visiting.delete(step.id);
		return row;
	};
	for (const step of [...steps].sort(
		(a, b) => a.startedAt - b.startedAt || b.durationMs - a.durationMs,
	))
		place(step);
	return [...placed.values()];
}
