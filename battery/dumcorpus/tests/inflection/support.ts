import { cellBundleOf, cellKeyOf } from "dumling";
import type * as Dumling from "dumling/types";
import { variantIdOf } from "dumrel";
import type * as Dumrel from "dumrel/types";

import { type GermanForm, inflectionPacks } from "../../src/inflection.js";

export const pack = inflectionPacks.de;

type De = "de";

export function noun(
	canonicalForm: string,
	gender: Dumling.Lemma<De, "Lexeme", "NOUN">["coreFeatures"]["gender"],
): Dumling.Lemma<De, "Lexeme", "NOUN"> {
	return {
		canonicalForm,
		coreFeatures: { gender },
		family: "Lexeme",
		kind: "NOUN",
		language: "de",
		unitKind: "Lemma",
	};
}

export function verb(
	canonicalForm: string,
	core: {
		readonly hasSepPrefix?: string | null;
		readonly lexicallyReflexive?: "Acc" | "Dat" | null;
	} = {},
): Dumling.Lemma<De, "Lexeme", "VERB"> {
	return {
		canonicalForm,
		coreFeatures: {
			hasSepPrefix: core.hasSepPrefix ?? null,
			lexicallyReflexive: core.lexicallyReflexive ?? null,
		},
		family: "Lexeme",
		kind: "VERB",
		language: "de",
		unitKind: "Lemma",
	};
}

export function lexeme<K extends "ADJ" | "ADV">(
	kind: K,
	canonicalForm: string,
	coreFeatures: Dumling.Lemma<De, "Lexeme", K>["coreFeatures"],
): Dumling.Lemma<De, "Lexeme", K> {
	return {
		canonicalForm,
		coreFeatures,
		family: "Lexeme",
		kind,
		language: "de",
		unitKind: "Lemma",
	} as Dumling.Lemma<De, "Lexeme", K>;
}

/** Forms by dimension, as a Licence Group's selection of Produced variants. */
export type Parts = Partial<Record<Dumrel.DimensionId, readonly string[]>>;

export function selectionOf(
	lemma: Dumling.Lemma<De>,
	parts: Parts,
): Partial<Record<Dumrel.DimensionId, Dumrel.ParadigmVariant[]>> {
	const selection: Partial<
		Record<Dumrel.DimensionId, Dumrel.ParadigmVariant[]>
	> = {};
	for (const [dimension, values] of Object.entries(parts) as [
		Dumrel.DimensionId,
		readonly string[],
	][])
		selection[dimension] = values
			.map((value) => ({
				id: variantIdOf(lemma, dimension, value),
				value,
				provenance: "Produced" as const,
			}))
			.sort((left, right) => (left.id < right.id ? -1 : 1));
	return selection;
}

/** A form as plain text: its runs joined, a Gap read as a space. */
function text(form: GermanForm): string {
	return pack
		.display(form)
		.map((run) => (run.role === "Gap" ? " " : run.text))
		.join("");
}

type Cell = {
	readonly panel: Dumling.TablePanel;
	readonly row: Dumling.AxisEntry;
	readonly column: Dumling.AxisEntry;
	readonly forms: "Absent" | readonly string[];
};

/** Every cell of the Lemma's schema in schema order, with its derived forms as text. */
export function cellsOf(lemma: Dumling.Lemma<De>, parts: Parts = {}): Cell[] {
	const schema = pack.schemaFor(lemma);
	if (schema === undefined) throw new Error("Expected a Table Schema");
	const table = pack.derive({
		lemma,
		schema,
		selection: selectionOf(lemma, parts),
	});
	return schema.panels.flatMap((panel) =>
		panel.rows.flatMap((row) =>
			panel.columns.map((column) => {
				const derived =
					table[
						cellKeyOf(
							cellBundleOf(panel, row, column),
							schema.keyFeatures,
						)
					];
				return {
					panel,
					row,
					column,
					forms:
						derived === "Absent"
							? "Absent"
							: (derived ?? []).map(({ form }) => text(form)),
				};
			}),
		),
	);
}

const known = (cell: Cell) => (cell.forms === "Absent" ? [] : cell.forms);

/**
 * Each panel's known forms in cell order, joined by `, `, by panel label;
 * a panel with none is left out. Konjunktiv I and Imperativ are not core,
 * but their derived forms show here.
 */
export function panels(
	lemma: Dumling.Lemma<De>,
	parts: Parts = {},
): Record<string, string> {
	const lines: Record<string, string> = {};
	for (const cell of cellsOf(lemma, parts)) {
		const label = pack.labels.panel(cell.panel.id);
		const forms = known(cell);
		if (forms.length > 0)
			lines[label] = [lines[label], ...forms].filter(Boolean).join(", ");
	}
	return lines;
}

/**
 * One line per row with known forms, `N: der Tag, die Tage`, as the
 * dictionary notes write a table; `columns` adds each column's label
 * (`dieser (m)`).
 */
export function lines(
	lemma: Dumling.Lemma<De>,
	parts: Parts = {},
	options: { readonly columns?: boolean } = {},
): string | undefined {
	const rows = new Map<string, string[]>();
	for (const cell of cellsOf(lemma, parts)) {
		const label = pack.labels.axis(cell.row.bundle);
		const forms = known(cell);
		if (forms.length === 0) continue;
		const shown = options.columns
			? `${forms.join("/")} (${pack.labels.axis(cell.column.bundle).toLowerCase()})`
			: forms;
		rows.set(label, [...(rows.get(label) ?? []), ...[shown].flat()]);
	}
	return rows.size === 0
		? undefined
		: [...rows]
				.map(([label, forms]) => `${label}: ${forms.join(", ")}`)
				.join("\n");
}
