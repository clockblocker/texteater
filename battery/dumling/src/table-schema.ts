import { isRecord } from "common-utils";
import { ParsingError } from "common-utils/validation";
import { inflectionalFeatures } from "./generated/inflectional-features.js";
import type { LemmaRoute } from "./types.js";

/** A Feature Pool name, as a route's inflectional bag spells it: `case`, `number[psor]`. */
export type FeatureName = string;
/** One value of a Feature Pool feature: `Dat`, `Plur`, `1`. */
export type FeatureValue = string;
/** Feature Pool features with one value each. It carries no label. */
export type FeatureBundle = Readonly<Record<FeatureName, FeatureValue>>;
/**
 * A Table Cell's key: its bundle reduced to its schema's key features, as
 * {@link cellKeyOf} spells it (`case=Dat|number=Plur`).
 */
export type CellKey = string;

/** One row or column of a Table Panel. */
export type AxisEntry = { readonly bundle: FeatureBundle };

/**
 * One grid of a Table Schema (ADR 0049). A cell's bundle is the panel's
 * `fixed` bundle with its row's and its column's, three disjoint parts.
 */
export type TablePanel = {
	/** Unique within its schema: `declension`, `present`, `possessed-1sg`. */
	readonly id: string;
	/** Whether a host draws the panel; the pack declares the core panels per Kind. */
	readonly core: boolean;
	/** The features every cell of the panel shares: `{ verbForm: "Fin", mood: "Ind", tense: "Pres" }`. */
	readonly fixed: FeatureBundle;
	readonly rows: readonly AxisEntry[];
	readonly columns: readonly AxisEntry[];
	/** Structural holes, cells the language never fills: no first person singular imperative. */
	readonly absent?: readonly CellKey[];
};

/**
 * One route's label-free inflection-table layout (ADR 0049). A language's
 * Inflection Pack supplies it; labels and forms stay in the pack.
 */
export type TableSchema = {
	/** `de/Lexeme/NOUN`. */
	readonly id: string;
	readonly version: number;
	/**
	 * The features a Cell Key keeps. A Surface fits a cell only when it
	 * matches the cell on every one of them, and a feature the cell lacks
	 * matches only a Surface that leaves it null: a passive
	 * `wurde geschrieben` marks `passive`, which no active cell has.
	 */
	readonly keyFeatures: readonly FeatureName[];
	readonly panels: readonly TablePanel[];
};

/**
 * The Cell Key of a bundle: its key features in code-point order, each as
 * `name=value`, joined by `|`. A key feature the bundle lacks is left out, and
 * so is every feature that is not a key feature, so `{ number: "Plur", case:
 * "Dat", gender: "Fem" }` keyed on `case` and `number` is `case=Dat|number=Plur`.
 */
export function cellKeyOf(
	bundle: FeatureBundle,
	keyFeatures: readonly FeatureName[],
): CellKey {
	return [...new Set(keyFeatures)]
		.filter((name) => Object.hasOwn(bundle, name))
		.sort(compare)
		.map((name) => `${name}=${bundle[name]}`)
		.join("|");
}

/**
 * A cell's bundle: its panel's `fixed` bundle with its row's and its column's.
 * The parts of a schema that {@link parseTableSchemaFor} accepted are disjoint.
 */
export function cellBundleOf(
	panel: Pick<TablePanel, "fixed">,
	row: AxisEntry,
	column: AxisEntry,
): FeatureBundle {
	return { ...panel.fixed, ...row.bundle, ...column.bundle };
}

/**
 * Checks a Table Schema against the route whose Surfaces it tabulates, and
 * answers it fresh or why it is not one:
 *
 * - its id is a non-empty string and its version a positive integer;
 * - every key feature, and every feature a bundle names, belongs to the
 *   route's inflectional bag, with a value the bag allows;
 * - a panel's id is unique, and it has at least one row and one column;
 * - each cell's `fixed`, row and column bundles name disjoint features;
 * - no two cells of the schema share a Cell Key;
 * - every `absent` key names a cell of its panel.
 *
 * A route whose Surfaces don't inflect has no bag, so no schema fits it.
 */
export function parseTableSchemaFor(
	input: unknown,
	route: LemmaRoute,
):
	| { readonly success: true; readonly value: TableSchema }
	| { readonly success: false; readonly error: ParsingError } {
	const parsed = tableSchemaShape(input);
	if (parsed instanceof ParsingError)
		return { success: false, error: parsed } as const;
	const failure = tableSchemaIssue(parsed, route);
	return failure
		? ({ success: false, error: failure } as const)
		: ({ success: true, value: parsed } as const);
}

type Path = (number | string)[];

const issue = (path: Path, message: string) =>
	new ParsingError([{ code: "custom", path, message }]);

type Bag = Readonly<Record<string, readonly string[]>>;

function tableSchemaIssue(
	schema: TableSchema,
	route: LemmaRoute,
): ParsingError | undefined {
	const key = `${route.language}/${route.family}/${route.kind}`;
	const bag = Object.hasOwn(inflectionalFeatures, key)
		? inflectionalFeatures[key]
		: undefined;
	if (bag === undefined)
		return issue(
			[],
			`The route ${key} has no inflectional bag to tabulate`,
		);
	for (const [index, name] of schema.keyFeatures.entries()) {
		if (!Object.hasOwn(bag, name))
			return issue(
				["keyFeatures", index],
				`${name} is not a feature of the ${key} inflectional bag`,
			);
		if (schema.keyFeatures.indexOf(name) !== index)
			return issue(["keyFeatures", index], `${name} is listed twice`);
	}
	const panels = new Set<string>();
	const cells = new Map<CellKey, string>();
	for (const [index, panel] of schema.panels.entries()) {
		const path = ["panels", index];
		if (panels.has(panel.id))
			return issue([...path, "id"], `The panel id ${panel.id} is taken`);
		panels.add(panel.id);
		const failure =
			bundleIssue(panel.fixed, bag, key, [...path, "fixed"]) ??
			axisIssue(panel, "rows", bag, key, path) ??
			axisIssue(panel, "columns", bag, key, path) ??
			cellsIssue(panel, schema.keyFeatures, cells, path);
		if (failure) return failure;
	}
	return undefined;
}

/**
 * Why a panel's cells don't fit, or undefined: a cell whose parts overlap, a
 * Cell Key another cell of the schema holds, or an `absent` key that is no
 * cell of the panel. Records the panel's cells in `cells`.
 */
function cellsIssue(
	panel: TablePanel,
	keyFeatures: readonly FeatureName[],
	cells: Map<CellKey, string>,
	path: Path,
): ParsingError | undefined {
	const own = new Set<CellKey>();
	for (const [rowIndex, row] of panel.rows.entries())
		for (const [columnIndex, column] of panel.columns.entries()) {
			const cellPath = [...path, "rows", rowIndex];
			const overlap =
				shared(panel.fixed, row.bundle) ??
				shared(panel.fixed, column.bundle) ??
				shared(row.bundle, column.bundle);
			if (overlap !== undefined)
				return issue(
					cellPath,
					`A cell's fixed, row and column bundles are disjoint, but column ${columnIndex} shares ${overlap}`,
				);
			const cell = cellKeyOf(
				cellBundleOf(panel, row, column),
				keyFeatures,
			);
			const holder = cells.get(cell);
			if (holder !== undefined)
				return issue(
					cellPath,
					`The cell ${JSON.stringify(cell)} at column ${columnIndex} already belongs to the panel ${holder}`,
				);
			cells.set(cell, panel.id);
			own.add(cell);
		}
	for (const [index, cell] of (panel.absent ?? []).entries())
		if (!own.has(cell))
			return issue(
				[...path, "absent", index],
				`${JSON.stringify(cell)} is no cell of the panel ${panel.id}`,
			);
	return undefined;
}

function axisIssue(
	panel: TablePanel,
	axis: "rows" | "columns",
	bag: Bag,
	route: string,
	path: Path,
): ParsingError | undefined {
	if (panel[axis].length === 0)
		return issue(
			[...path, axis],
			`A panel has at least one of its ${axis}`,
		);
	for (const [index, entry] of panel[axis].entries()) {
		const failure = bundleIssue(entry.bundle, bag, route, [
			...path,
			axis,
			index,
			"bundle",
		]);
		if (failure) return failure;
	}
	return undefined;
}

function bundleIssue(
	bundle: FeatureBundle,
	bag: Bag,
	route: string,
	path: Path,
): ParsingError | undefined {
	for (const [name, value] of Object.entries(bundle)) {
		const values = Object.hasOwn(bag, name) ? bag[name] : undefined;
		if (values === undefined)
			return issue(
				[...path, name],
				`${name} is not a feature of the ${route} inflectional bag`,
			);
		if (!values.includes(value))
			return issue(
				[...path, name],
				`${JSON.stringify(value)} is not a value of ${name} in the ${route} inflectional bag`,
			);
	}
	return undefined;
}

/** The first feature both bundles name, or undefined. */
function shared(left: FeatureBundle, right: FeatureBundle) {
	return Object.keys(left).find((name) => Object.hasOwn(right, name));
}

/** The input as a Table Schema's structure, fresh, or why it isn't one. */
function tableSchemaShape(input: unknown): TableSchema | ParsingError {
	if (!isRecord(input)) return issue([], "A Table Schema is an object");
	const { id, version, keyFeatures, panels } = input;
	if (typeof id !== "string" || id === "")
		return issue(["id"], "A Table Schema's id is a non-empty string");
	if (
		typeof version !== "number" ||
		!Number.isInteger(version) ||
		version < 1
	)
		return issue(
			["version"],
			"A Table Schema's version is a positive integer",
		);
	const names = stringsOf(keyFeatures, ["keyFeatures"]);
	if (names instanceof ParsingError) return names;
	if (!Array.isArray(panels))
		return issue(["panels"], "A Table Schema's panels are a list");
	const parsed: TablePanel[] = [];
	for (const [index, panel] of panels.entries()) {
		const value = panelShape(panel, ["panels", index]);
		if (value instanceof ParsingError) return value;
		parsed.push(value);
	}
	return { id, version, keyFeatures: names, panels: parsed };
}

function panelShape(input: unknown, path: Path): TablePanel | ParsingError {
	if (!isRecord(input)) return issue(path, "A Table Panel is an object");
	const { id, core, fixed, rows, columns, absent } = input;
	if (typeof id !== "string" || id === "")
		return issue(
			[...path, "id"],
			"A Table Panel's id is a non-empty string",
		);
	if (typeof core !== "boolean")
		return issue(
			[...path, "core"],
			"A Table Panel says whether it is core",
		);
	const bundle = bundleShape(fixed, [...path, "fixed"]);
	if (bundle instanceof ParsingError) return bundle;
	const rowEntries = axisShape(rows, [...path, "rows"]);
	if (rowEntries instanceof ParsingError) return rowEntries;
	const columnEntries = axisShape(columns, [...path, "columns"]);
	if (columnEntries instanceof ParsingError) return columnEntries;
	if (
		absent !== undefined &&
		!(
			Array.isArray(absent) &&
			absent.every((key) => typeof key === "string")
		)
	)
		return issue(
			[...path, "absent"],
			"A panel's absent cells are Cell Keys",
		);
	const holes: CellKey[] | undefined = absent && [...absent];
	return {
		id,
		core,
		fixed: bundle,
		rows: rowEntries,
		columns: columnEntries,
		...(holes === undefined ? {} : { absent: holes }),
	};
}

function axisShape(input: unknown, path: Path): AxisEntry[] | ParsingError {
	if (!Array.isArray(input)) return issue(path, "A panel axis is a list");
	const entries: AxisEntry[] = [];
	for (const [index, entry] of input.entries()) {
		if (!isRecord(entry))
			return issue([...path, index], "An axis entry is an object");
		const bundle = bundleShape(entry.bundle, [...path, index, "bundle"]);
		if (bundle instanceof ParsingError) return bundle;
		entries.push({ bundle });
	}
	return entries;
}

/**
 * Feature names and values are plain strings without `=` or `|`, the
 * characters a Cell Key spells them with.
 */
function bundleShape(input: unknown, path: Path): FeatureBundle | ParsingError {
	if (!isRecord(input))
		return issue(path, "A feature bundle is an object of feature values");
	const bundle: Record<FeatureName, FeatureValue> = {};
	for (const [name, value] of Object.entries(input)) {
		if (typeof value !== "string" || !plain(name) || !plain(value))
			return issue(
				[...path, name],
				"A feature bundle names each feature once, with one string value, neither holding = or |",
			);
		bundle[name] = value;
	}
	return bundle;
}

function stringsOf(input: unknown, path: Path): string[] | ParsingError {
	if (
		!Array.isArray(input) ||
		!input.every((value) => typeof value === "string" && plain(value))
	)
		return issue(path, "Expected a list of strings without = or |");
	return [...input];
}

const plain = (text: string) => text !== "" && !/[=|]/u.test(text);

/** Code-point order, the same in every runtime, unlike `localeCompare`. */
function compare(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}
