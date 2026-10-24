import { cellBundleOf, cellKeyOf } from "dumling";
import type * as Dumling from "dumling/types";

/**
 * Where a Surface sits in a Table Schema (system ADR 0049). It is a pure
 * function of the schema and the Surface, and never stored.
 *
 * - `Covers`: the Surface fills each of these cells, one or more. A form that
 *   realizes several values (a Hebrew `number` of Sing and Dual) covers one
 *   cell per value.
 * - `OneOf`: the Surface fills one of these cells, two or more, and the text
 *   does not say which. A Surface Syncretism (`jedem`, ADR 0046) is OneOf
 *   the cells of its units, or, as a view without units, of every cell that
 *   matches it with its `syncretic` features open.
 * - `Unplaced`: it fits no cell, such as a passive `wurde geschrieben` when
 *   `passive` is a key feature and no cell has it.
 *
 * Cells come in schema order. A cell the schema lists as `absent` is never a
 * place.
 */
export type Placement =
	| { readonly kind: "Covers"; readonly cells: readonly Dumling.CellKey[] }
	| { readonly kind: "OneOf"; readonly cells: readonly Dumling.CellKey[] }
	| { readonly kind: "Unplaced" };

/**
 * A Surface's placement and every feature bundle it fills (system ADR 0049):
 * the bundle of each cell it Covers or may be OneOf, in schema order, then
 * each of its own bundles that fits no cell. An Unplaced Surface's bundles
 * are its own non-null features. A Surface with no inflectional features
 * has none.
 */
export type SurfaceAxes = {
	readonly placement: Placement;
	readonly bundles: readonly Dumling.FeatureBundle[];
};

/** One cell of a Table Schema, in schema order. */
export type SchemaCell = {
	readonly key: Dumling.CellKey;
	readonly bundle: Dumling.FeatureBundle;
	readonly panel: Dumling.TablePanel;
	/** A structural hole the schema lists as `absent`. */
	readonly absent: boolean;
};

type SchemaIndex = {
	readonly cells: readonly SchemaCell[];
	readonly byKey: ReadonlyMap<Dumling.CellKey, SchemaCell>;
	readonly order: ReadonlyMap<Dumling.CellKey, number>;
};

const indexes = new WeakMap<Dumling.TableSchema, SchemaIndex>();

/** The schema's cells in schema order: panel by panel, row by row. */
export function schemaIndex(schema: Dumling.TableSchema): SchemaIndex {
	const known = indexes.get(schema);
	if (known) return known;
	const cells: SchemaCell[] = [];
	for (const panel of schema.panels) {
		const holes = new Set(panel.absent ?? []);
		for (const row of panel.rows)
			for (const column of panel.columns) {
				const bundle = cellBundleOf(panel, row, column);
				const key = cellKeyOf(bundle, schema.keyFeatures);
				cells.push({ key, bundle, panel, absent: holes.has(key) });
			}
	}
	const index: SchemaIndex = {
		cells,
		byKey: new Map(cells.map((cell) => [cell.key, cell])),
		order: new Map(cells.map((cell, position) => [cell.key, position])),
	};
	indexes.set(schema, index);
	return index;
}

type Bag = Readonly<Record<string, unknown>>;
type SurfaceShape = {
	readonly inflectionalFeatures?: Bag | null;
	readonly syncretic?: readonly string[];
	readonly syncretized?: readonly SurfaceShape[];
};

/**
 * The Surface's inflectional features as plain bundles, one per value
 * combination: a value set (`["Dual", "Sing"]`) gives one bundle per value,
 * and a null or missing feature is left out (a null is never a wildcard).
 */
function bundlesOf(bag: Bag | null | undefined): Dumling.FeatureBundle[] {
	let bundles: Record<string, string>[] = [{}];
	for (const name of Object.keys(bag ?? {}).sort(compare)) {
		const values = valuesOf(bag?.[name]);
		if (values.length === 0) continue;
		bundles = bundles.flatMap((bundle) =>
			values.map((value) => ({ ...bundle, [name]: value })),
		);
	}
	return bundles;
}

function valuesOf(value: unknown): string[] {
	if (value === null || value === undefined) return [];
	if (Array.isArray(value)) return value.flatMap(valuesOf);
	if (typeof value === "object" && "mixed" in value)
		return valuesOf((value as { mixed: unknown }).mixed);
	if (typeof value === "string" || typeof value === "boolean")
		return [`${value}`];
	throw new Error(`A feature value is no value: ${JSON.stringify(value)}`);
}

/**
 * Where a Surface sits in a schema: see {@link Placement}. Without a schema
 * (a Lemma whose Surfaces don't inflect) every Surface is Unplaced.
 */
export function placeSurface(
	schema: Dumling.TableSchema | undefined,
	surface: Dumling.Surface,
): Placement {
	if (schema === undefined) return { kind: "Unplaced" };
	return placementOf(schema, surface as SurfaceShape).placement;
}

/** See {@link SurfaceAxes}. */
export function surfaceAxes(
	schema: Dumling.TableSchema | undefined,
	surface: Dumling.Surface,
): SurfaceAxes {
	const shape = surface as SurfaceShape;
	if (schema === undefined)
		return { placement: { kind: "Unplaced" }, bundles: ownBundles(shape) };
	const { placement, unfitting } = placementOf(schema, shape);
	if (placement.kind === "Unplaced")
		return { placement, bundles: ownBundles(shape) };
	const { byKey } = schemaIndex(schema);
	return {
		placement,
		bundles: unique([
			...placement.cells.map((key) => byKey.get(key)?.bundle ?? {}),
			...unfitting,
		]),
	};
}

/** The bundles a Surface marks itself: its units' for a Syncretism that holds them. */
function ownBundles(surface: SurfaceShape): Dumling.FeatureBundle[] {
	const units = surface.syncretized ?? [surface];
	return unique(
		units.flatMap((unit) => bundlesOf(unit.inflectionalFeatures)),
	).filter((bundle) => Object.keys(bundle).length > 0);
}

function placementOf(
	schema: Dumling.TableSchema,
	surface: SurfaceShape,
): { placement: Placement; unfitting: Dumling.FeatureBundle[] } {
	const index = schemaIndex(schema);
	const fitting = new Set<Dumling.CellKey>();
	const unfitting: Dumling.FeatureBundle[] = [];
	const open = new Set(surface.syncretic ?? []);
	const sources =
		surface.syncretized && surface.syncretized.length > 0
			? surface.syncretized.map((unit) => ({
					bag: unit.inflectionalFeatures,
					open: new Set<string>(),
				}))
			: [{ bag: surface.inflectionalFeatures, open }];
	for (const source of sources)
		for (const bundle of bundlesOf(source.bag)) {
			const cells = matchingCells(index, schema, bundle, source.open);
			if (cells.length === 0 && Object.keys(bundle).length > 0)
				unfitting.push(bundle);
			for (const cell of cells) fitting.add(cell);
		}
	const cells = [...fitting].sort(
		(left, right) =>
			(index.order.get(left) ?? 0) - (index.order.get(right) ?? 0),
	);
	if (cells.length === 0)
		return { placement: { kind: "Unplaced" }, unfitting };
	const uncertain = open.size > 0 && cells.length > 1;
	return {
		placement: { kind: uncertain ? "OneOf" : "Covers", cells },
		unfitting,
	};
}

/**
 * The cells a bundle fits: equal on every key feature, a feature missing
 * from both counting as equal. An `open` feature matches any value the cell
 * has, but the cell must have one.
 */
function matchingCells(
	index: SchemaIndex,
	schema: Dumling.TableSchema,
	bundle: Dumling.FeatureBundle,
	open: ReadonlySet<string>,
): Dumling.CellKey[] {
	const keyFeatures = schema.keyFeatures;
	const openKeys = keyFeatures.filter((name) => open.has(name));
	if (openKeys.length === 0) {
		const cell = index.byKey.get(cellKeyOf(bundle, keyFeatures));
		return cell && !cell.absent ? [cell.key] : [];
	}
	const closed = keyFeatures.filter((name) => !open.has(name));
	const wanted = cellKeyOf(bundle, closed);
	return index.cells
		.filter(
			(cell) =>
				!cell.absent &&
				openKeys.every((name) => Object.hasOwn(cell.bundle, name)) &&
				cellKeyOf(cell.bundle, closed) === wanted,
		)
		.map((cell) => cell.key);
}

function unique(
	bundles: readonly Dumling.FeatureBundle[],
): Dumling.FeatureBundle[] {
	const seen = new Map<string, Dumling.FeatureBundle>();
	for (const bundle of bundles) {
		const key = JSON.stringify(
			Object.entries(bundle).sort(([left], [right]) =>
				compare(left, right),
			),
		);
		if (!seen.has(key)) seen.set(key, bundle);
	}
	return [...seen.values()];
}

/** Code-point order, the same in every runtime, unlike `localeCompare`. */
export function compare(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}
