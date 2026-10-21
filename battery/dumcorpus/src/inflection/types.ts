import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";

/**
 * The shapes an Inflection Pack answers in. They are `dumdict/inflection`'s
 * `InflectionPack` seam spelled out here, since dumcorpus sits below dumdict
 * and can't import it; dumdict's tests check that each pack is one.
 */

/** Where a derived form comes from: an Authored Inventory, a Paradigm Variant or a rule. */
type Provenance = "Authored" | "Variant" | "Rule";

/** One form derived for a Table Cell, with the Paradigm Variant it comes from. */
export type PackDerivedForm<F> = {
	readonly form: F;
	readonly provenance: Provenance;
	readonly variant?: {
		readonly dimension: Dumrel.DimensionId;
		readonly id: Dumrel.VariantId;
	};
};

/**
 * One Licence Group's derivation by Cell Key: `Absent`, or the cell's forms.
 * A cell left out is Unknown, never guessed.
 */
export type PackDerivedTable<F> = Readonly<
	Partial<Record<Dumling.CellKey, "Absent" | readonly PackDerivedForm<F>[]>>
>;

/** The Paradigm Variants one Licence Group licenses, per dimension. */
export type PackSelection = Readonly<
	Partial<Record<Dumrel.DimensionId, readonly Dumrel.ParadigmVariant[]>>
>;

export type PackDeriveInput<L extends Dumling.Language> = {
	readonly lemma: Dumling.Lemma<L>;
	readonly selection: PackSelection;
	readonly schema: Dumling.TableSchema;
};

/** A table being derived: cells by key, each form added in order. */
export class Cells<F> {
	readonly #cells: Partial<
		Record<Dumling.CellKey, "Absent" | PackDerivedForm<F>[]>
	> = {};

	add(key: Dumling.CellKey, form: PackDerivedForm<F>): void {
		const known = this.#cells[key];
		if (known === undefined || known === "Absent")
			this.#cells[key] = [form];
		else known.push(form);
	}

	absent(key: Dumling.CellKey): void {
		this.#cells[key] = "Absent";
	}

	get table(): PackDerivedTable<F> {
		return this.#cells;
	}
}
