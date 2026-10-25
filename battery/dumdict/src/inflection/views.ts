import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";

import type { AttestationLink } from "../domain-types";
import type { SurfaceId } from "../dumling-id";
import type { DerivedProvenance, VariantRef } from "./pack";
import type { SurfaceAxes } from "./placement";

/**
 * What `projectLemmaTables` reads: one Lemma with its Paradigm, its Readings'
 * Attestation Links and its Surface Entries. A `LemmaSlice`, and so a
 * serialized dictionary note, is one.
 */
export type LemmaTablesSlice<L extends Dumling.Language, P = string> = {
	readonly lemmaRecord: {
		readonly lemma: Dumling.Lemma<L>;
		readonly paradigm?: Dumrel.LemmaParadigm<P>;
	};
	readonly readingEntries: readonly {
		readonly reading: Dumling.Reading<L>;
		readonly attestationLinks: readonly AttestationLink<L>[];
	}[];
	readonly ownedSurfaceEntries: readonly {
		readonly id: SurfaceId<L>;
		readonly surface: Dumling.Surface<L>;
	}[];
};

/**
 * A Lemma's Inflection Tables (system ADR 0049): plain data, the same for
 * the same slice, pack and schema whatever order the slice lists things in.
 * It names no case or tense: a host draws it with the pack's `labels` and
 * `display`, and may cache it on `pack` and `schema`.
 */
export type LemmaTablesView<L extends Dumling.Language, F> = {
	readonly pack: { readonly language: L; readonly version: string };
	/** The Lemma's Table Schema; without one, there are no panels and every Surface is listed. */
	readonly schema?: { readonly id: string; readonly version: number };
	/** Whether every Variation Dimension is Free, so the Lemma has one group. */
	readonly free: boolean;
	/** One table per Licence Group, ordered by their smallest Reading key. */
	readonly groups: readonly TableGroupView<L, F>[];
	/** Every met Surface, ordered by form key, then id. */
	readonly surfaces: readonly SurfaceLine<L, F>[];
	/** Occurrences whose form their judged Reading's Licence doesn't take, by ref. */
	readonly conflicts: readonly LicenceConflict<L>[];
};

/** One Licence Group's table: the Readings it captions, and its core panels. */
export type TableGroupView<L extends Dumling.Language, F> = {
	/** In code-unit order of their keys. */
	readonly readings: readonly Dumling.Reading<L>[];
	/** Each Reading's `readingIdentityKey`, in the same order. */
	readonly readingKeys: readonly Dumrel.ReadingKey[];
	/** The canonical key of the group's licensed selection: stable while its Licences are, for Block IDs. */
	readonly selectionKey: string;
	/** The variant ids the group licenses, per dimension. */
	readonly selection: Readonly<
		Partial<Record<Dumrel.DimensionId, readonly Dumrel.VariantId[]>>
	>;
	/** The schema's core panels, in schema order. */
	readonly panels: readonly PanelView<L, F>[];
};

/** One grid: `cells[row][column]`, rows and columns in schema order. */
export type PanelView<L extends Dumling.Language, F> = {
	readonly id: string;
	readonly fixed: Dumling.FeatureBundle;
	readonly rows: readonly Dumling.FeatureBundle[];
	readonly columns: readonly Dumling.FeatureBundle[];
	readonly cells: readonly (readonly CellView<L, F>[])[];
};

/**
 * One Table Cell. `Filled` means it holds a form, derived or met, perhaps
 * only an uncertain one; `Absent` that the language or the licensed
 * selection gives it no form; `Unknown` that neither derivation nor a met
 * form fills it. `undescribed` flags a met Surface that Covers the cell
 * with a form no stored variant derives here; it is listed, not written
 * here.
 */
export type CellView<L extends Dumling.Language, F> = {
	readonly key: Dumling.CellKey;
	readonly status: "Filled" | "Unknown" | "Absent";
	/** Derived forms in variant order, then met forms no derivation gives, by key. */
	readonly forms: readonly FormView<L, F>[];
	readonly undescribed: boolean;
};

/**
 * One form in a cell, merged by the pack's form key. It is derived, met, or
 * both: `Bänke` derived from its variant and met in a text.
 */
export type FormView<L extends Dumling.Language, F> = {
	readonly form: F;
	readonly key: string;
	readonly derived: readonly {
		readonly provenance: DerivedProvenance;
		readonly variant?: VariantRef;
	}[];
	/** The met Surfaces spelling it here, by id. */
	readonly attested: readonly AttestedSource<L>[];
};

/**
 * A met Surface in a cell. It is `uncertain` when it is only OneOf its
 * candidate cells, so the cell may not be its.
 */
export type AttestedSource<L extends Dumling.Language> = {
	readonly surfaceId: SurfaceId<L>;
	readonly refs: readonly string[];
	readonly uncertain: boolean;
};

/**
 * One met Surface, for the list of Surfaces beside the tables. A host lists
 * the lines that are not `inCore`: forms in non-core panels, forms with no
 * place or an uncertain one, and undescribed forms.
 */
export type SurfaceLine<L extends Dumling.Language, F> = {
	readonly surfaceId: SurfaceId<L>;
	readonly form: F;
	readonly key: string;
	readonly axes: SurfaceAxes;
	/** Written into a core cell of some group by a Covers placement. */
	readonly inCore: boolean;
	/** Placed, but in some cell no stored variant derives its form. */
	readonly undescribed: boolean;
	/** The `selectionKey` of each group whose variants it fits. */
	readonly groups: readonly string[];
	/** The refs of its Attestation Links, in code-unit order. */
	readonly refs: readonly string[];
	/** It has no Attestation Link: kept for its user text. */
	readonly unattested: boolean;
};

/**
 * An occurrence judged to be a Reading whose Licence doesn't take its form
 * (system ADR 0048): `Banken` met under 🪑. The form shows in the groups it
 * fits and never in the Reading's own; nothing is relicensed or moved.
 */
export type LicenceConflict<L extends Dumling.Language> = {
	readonly ref: string;
	readonly reading: Dumrel.ReadingKey;
	readonly surfaceId: SurfaceId<L>;
	/** The `selectionKey` of each group whose variants the form fits. */
	readonly fitsGroups: readonly string[];
};
