import type * as Dumling from "dumling/types";

import type { DerivedForm, FormCodec } from "./pack";
import { compare, type SchemaCell } from "./placement";
import type { AttestedSource, CellView, FormView } from "./views";

/**
 * What one group's derivation says of a cell: no form (`Absent`), nothing
 * (`Unknown`), or its derived forms in variant order with their keys.
 */
export type CellState<F> =
	| { readonly kind: "Absent" }
	| { readonly kind: "Unknown" }
	| {
			readonly kind: "Known";
			readonly forms: readonly (DerivedForm<F> & {
				readonly key: string;
			})[];
			readonly keys: ReadonlySet<string>;
	  };

const variantOrder = (form: DerivedForm<unknown>) =>
	form.variant === undefined
		? ""
		: `${form.variant.dimension}\u0000${form.variant.id}`;

export function stateOf<F>(
	cell: SchemaCell | undefined,
	derived: "Absent" | readonly DerivedForm<F>[] | undefined,
	codec: FormCodec<F>,
): CellState<F> {
	if (cell?.absent === true || derived === "Absent")
		return { kind: "Absent" };
	if (derived === undefined || derived.length === 0)
		return { kind: "Unknown" };
	const forms = derived
		.map((form) => ({ ...form, key: codec.key(form.form) }))
		.sort(
			(left, right) =>
				compare(variantOrder(left), variantOrder(right)) ||
				compare(left.key, right.key),
		);
	return {
		kind: "Known",
		forms,
		keys: new Set(forms.map((form) => form.key)),
	};
}

/** Whether a met form of this key may stand in the cell for this group. */
export function fits(state: CellState<unknown>, key: string): boolean {
	return (
		state.kind === "Unknown" ||
		(state.kind === "Known" && state.keys.has(key))
	);
}

/** A met Surface a group writes into a cell. */
export type Attested<L extends Dumling.Language, F> = {
	readonly form: F;
	readonly key: string;
	readonly source: AttestedSource<L>;
};

/**
 * One cell's view: its derived forms merged with the met forms written into
 * it by key, derived ones first in variant order, then the met-only ones by
 * key.
 */
export function cellView<L extends Dumling.Language, F>(
	key: Dumling.CellKey,
	input: {
		readonly state: CellState<F>;
		readonly undescribed: boolean;
		readonly attested: readonly Attested<L, F>[];
	},
): CellView<L, F> {
	const { state } = input;
	const forms = new Map<
		string,
		{
			form: F;
			key: string;
			derived: FormView<L, F>["derived"][number][];
			attested: AttestedSource<L>[];
		}
	>();
	if (state.kind === "Known")
		for (const derived of state.forms) {
			const source = {
				provenance: derived.provenance,
				...(derived.variant === undefined
					? {}
					: { variant: derived.variant }),
			};
			const known = forms.get(derived.key);
			if (known) known.derived.push(source);
			else
				forms.set(derived.key, {
					form: derived.form,
					key: derived.key,
					derived: [source],
					attested: [],
				});
		}
	const metOnly = [...input.attested].sort(
		(left, right) =>
			compare(left.key, right.key) ||
			compare(left.source.surfaceId, right.source.surfaceId),
	);
	for (const met of metOnly) {
		const known = forms.get(met.key);
		if (known) known.attested.push(met.source);
		else
			forms.set(met.key, {
				form: met.form,
				key: met.key,
				derived: [],
				attested: [met.source],
			});
	}
	const views = [...forms.values()];
	return {
		key,
		status:
			state.kind === "Absent"
				? "Absent"
				: views.length > 0
					? "Filled"
					: "Unknown",
		forms: views,
		undescribed: input.undescribed,
	};
}
