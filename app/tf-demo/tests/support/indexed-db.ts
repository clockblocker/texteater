export type TestRow = Record<string, unknown> & { _id: string };

function nestedValue(row: TestRow, path: string): unknown {
	return path.split(".").reduce<unknown>((value, key) => {
		if (value === null || typeof value !== "object") return undefined;
		return (value as Record<string, unknown>)[key];
	}, row);
}

/**
 * Small transactional Convex database double for storage-boundary smoke tests.
 * It intentionally supports only the query operations used by the exercised
 * tf-demo functions.
 */
export class IndexedTestDb {
	private tables = new Map<string, Map<string, TestRow>>();
	private nextId = 1;

	constructor(seed: Record<string, readonly TestRow[]> = {}) {
		for (const [table, rows] of Object.entries(seed)) {
			this.tables.set(
				table,
				new Map(rows.map((row) => [row._id, structuredClone(row)])),
			);
		}
	}

	fork(): IndexedTestDb {
		const copy = new IndexedTestDb(this.snapshot());
		copy.nextId = this.nextId;
		return copy;
	}

	adopt(committed: IndexedTestDb): void {
		this.tables = committed.tables;
		this.nextId = committed.nextId;
	}

	snapshot(): Record<string, TestRow[]> {
		return Object.fromEntries(
			[...this.tables].map(([table, rows]) => [
				table,
				[...rows.values()].map((row) => structuredClone(row)),
			]),
		);
	}

	rows(table: string): TestRow[] {
		return [...(this.tables.get(table)?.values() ?? [])];
	}

	async get(id: string): Promise<TestRow | null> {
		for (const rows of this.tables.values()) {
			const row = rows.get(id);
			if (row) return structuredClone(row);
		}
		return null;
	}

	query(table: string) {
		const predicates: Array<(row: TestRow) => boolean> = [];
		const range = {
			eq(field: string, value: unknown) {
				predicates.push((row) => nestedValue(row, field) === value);
				return range;
			},
			gte(field: string, value: number) {
				predicates.push((row) => {
					const member = nestedValue(row, field);
					return typeof member === "number" && member >= value;
				});
				return range;
			},
			lte(field: string, value: number) {
				predicates.push((row) => {
					const member = nestedValue(row, field);
					return typeof member === "number" && member <= value;
				});
				return range;
			},
		};
		const matches = () =>
			this.rows(table).filter((row) =>
				predicates.every((predicate) => predicate(row)),
			);
		const selection = {
			async first() {
				return matches()[0] ?? null;
			},
			async unique() {
				const rows = matches();
				if (rows.length > 1) throw new Error("Expected a unique row.");
				return rows[0] ?? null;
			},
			async take(limit: number) {
				return matches().slice(0, limit);
			},
		};
		return {
			...selection,
			withIndex(_name: string, build: (value: typeof range) => unknown) {
				build(range);
				return selection;
			},
		};
	}

	async insert(
		table: string,
		value: Record<string, unknown>,
	): Promise<string> {
		const id = `${table}-${this.nextId++}`;
		const rows = this.tables.get(table) ?? new Map<string, TestRow>();
		rows.set(id, { _id: id, ...structuredClone(value) });
		this.tables.set(table, rows);
		return id;
	}

	async patch(id: string, value: Record<string, unknown>): Promise<void> {
		for (const rows of this.tables.values()) {
			const row = rows.get(id);
			if (!row) continue;
			rows.set(id, { ...row, ...structuredClone(value) });
			return;
		}
		throw new Error(`Cannot patch missing row ${id}.`);
	}

	async replace(id: string, value: Record<string, unknown>): Promise<void> {
		for (const rows of this.tables.values()) {
			if (!rows.has(id)) continue;
			rows.set(id, { _id: id, ...structuredClone(value) });
			return;
		}
		throw new Error(`Cannot replace missing row ${id}.`);
	}

	async delete(id: string): Promise<void> {
		for (const rows of this.tables.values()) {
			if (rows.delete(id)) return;
		}
		throw new Error(`Cannot delete missing row ${id}.`);
	}
}

function registeredHandler(value: unknown) {
	return (
		value as {
			_handler: (ctx: unknown, args: unknown) => Promise<unknown>;
		}
	)._handler;
}

export async function runTestQuery(
	db: IndexedTestDb,
	fn: unknown,
	args: unknown,
) {
	return registeredHandler(fn)({ db }, args);
}

export async function runTestMutation(
	db: IndexedTestDb,
	fn: unknown,
	args: unknown,
) {
	const draft = db.fork();
	const result = await registeredHandler(fn)({ db: draft }, args);
	db.adopt(draft);
	return result;
}
