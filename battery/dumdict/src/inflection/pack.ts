import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";

/**
 * Equality of a pack's forms: two forms are one when their keys are equal.
 * A key folds what the language does not tell apart in a table, such as
 * letter case, so a met form merges with the derived form it spells.
 */
export type FormCodec<F> = {
	readonly key: (form: F) => string;
};

/**
 * Where a derived form comes from: an Authored Inventory's closed paradigm, a
 * Paradigm Variant of the Lemma (`Bänke`), or a rule of the language
 * (`Bänken` from `Bänke`).
 */
export type DerivedProvenance = "Authored" | "Variant" | "Rule";

/** The Paradigm Variant a derived form comes from. */
export type VariantRef = {
	readonly dimension: Dumrel.DimensionId;
	readonly id: Dumrel.VariantId;
};

/**
 * One form a pack derives for a Table Cell. A form derived from a Paradigm
 * Variant names it, so a cell that several licensed variants fill holds one
 * form per variant (`molk / melkte`).
 */
export type DerivedForm<F> = {
	readonly form: F;
	readonly provenance: DerivedProvenance;
	readonly variant?: VariantRef;
};

/**
 * A pack's derivation for one Licence Group, by Cell Key. A cell is `Absent`
 * when the licensed selection gives it no form (the plural of a `NoPlural`
 * noun), or its forms. A cell the table leaves out, or gives no forms, is
 * Unknown: derivation never guesses a cell it doubts, and a met form may
 * fill it. Keys that name no cell of the schema are ignored.
 */
export type DerivedTable<F> = Readonly<
	Partial<Record<Dumling.CellKey, "Absent" | readonly DerivedForm<F>[]>>
>;

/**
 * The Paradigm Variants one Licence Group licenses, per dimension, in id
 * order. A dimension the Lemma Paradigm lacks is absent: its forms come from
 * the language's rules alone.
 */
export type ParadigmSelection<P = string> = Readonly<
	Partial<Record<Dumrel.DimensionId, readonly Dumrel.ParadigmVariant<P>[]>>
>;

/**
 * What a pack derives from: the Lemma, one Licence Group's selection, the
 * schema `schemaFor` chose for the Lemma, and the group's Readings with their
 * Knowledge, in key order. A pack may read a Reading's frame there, such as
 * the Reflexive Slot every Reading of a German group shares (ADR 0052).
 */
export type DeriveInput<L extends Dumling.Language, P = string> = {
	readonly lemma: Dumling.Lemma<L>;
	readonly selection: ParadigmSelection<P>;
	readonly schema: Dumling.TableSchema;
	readonly readings: readonly DeriveReading<L>[];
};

/** One Reading of a Licence Group, with the Knowledge its entry holds. */
export type DeriveReading<L extends Dumling.Language> = {
	readonly reading: Dumling.Reading<L>;
	readonly knowledge?: Dumrel.ReadingKnowledge<Dumling.Reading<L>>;
};

/**
 * One run of a form's display. A host joins the runs' texts as given and may
 * style them by role: `Form` is the inflected word, `Context` a word shown
 * beside it for orientation (`er`, `der`), and `Gap` the break in a
 * discontinuous form (`er fährt … ab`).
 */
export type DisplayRun = {
	readonly text: string;
	readonly role: "Form" | "Context" | "Gap";
};

/**
 * A language's words for its tables (ADR 0049). Core DTOs carry no labels,
 * so the host applies these: no locale, no fallback chain.
 */
export type InflectionLabels = {
	/** A panel's caption: German `present` is `Präsens`. */
	readonly panel: (panelId: string) => string;
	/** A row's or a column's heading: German `{ case: "Nom" }` is `N`. */
	readonly axis: (bundle: Dumling.FeatureBundle) => string;
	/** A whole bundle on a Surface Axes line: German `{ case: "Dat", number: "Plur" }` is `Dat.Pl`. */
	readonly bundle: (bundle: Dumling.FeatureBundle) => string;
};

/**
 * A language's Inflection Pack (system ADR 0049), the only language seam of
 * `dumdict/inflection`. Dumdict knows a pack only as this type; the packs
 * live in `dumcorpus/inflection`.
 *
 * - `F` is the pack's form, opaque to Dumdict: a German verb form may carry
 *   its pronoun, finite word and split-off particle. Dumdict only keys forms
 *   with `codec`; a host shows them with `display`.
 * - `P` is the value type of the Lemma Paradigm's variants, Dumrel's string
 *   by default.
 *
 * `projectLemmaTables` calls `schemaFor`, `derive`, `formOfSurface` and
 * `codec`. `display` and `labels` are projections the host applies when it
 * draws a view.
 */
export type InflectionPack<L extends Dumling.Language, F, P = string> = {
	readonly language: L;
	/** Changes whenever derivation, display or labels change; views carry it, so hosts may cache on it. */
	readonly version: string;
	/**
	 * The Table Schema for a Lemma's route and Core, or undefined when its
	 * Surfaces don't inflect (a Foreign Lemma, a CCONJ). The schema passes
	 * Dumling's `parseTableSchemaFor` for the Lemma's route, and declares
	 * which panels are core for the Kind.
	 */
	readonly schemaFor: (
		lemma: Dumling.Lemma<L>,
	) => Dumling.TableSchema | undefined;
	/**
	 * The forms of one Licence Group's table. Pure and deterministic: the
	 * same input derives the same table. Stored variants win over rules,
	 * and a cell in doubt is left out.
	 */
	readonly derive: (input: DeriveInput<L, P>) => DerivedTable<F>;
	/** The form a met Surface spells, as the pack's cells hold it. */
	readonly formOfSurface: (surface: Dumling.Surface<L>) => F;
	readonly codec: FormCodec<F>;
	/** How a host shows a form. */
	readonly display: (form: F) => readonly DisplayRun[];
	readonly labels: InflectionLabels;
};
