import { cellBundleOf, cellKeyOf, readingIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";
import { isFree, licenceGroups } from "dumrel";
import type * as Dumrel from "dumrel/types";

import type { SurfaceId } from "../dumling-id";
import {
	type Attested,
	type CellState,
	cellView,
	fits,
	stateOf,
} from "./cells";
import type { DeriveReading, InflectionPack, ParadigmSelection } from "./pack";
import {
	compare,
	type Placement,
	type SurfaceAxes,
	schemaIndex,
	surfaceAxes,
} from "./placement";
import type {
	LemmaTablesSlice,
	LemmaTablesView,
	LicenceConflict,
	PanelView,
	SurfaceLine,
	TableGroupView,
} from "./views";

/** A met Surface with its form, key, placement and refs. */
type Met<L extends Dumling.Language, F> = {
	readonly id: SurfaceId<L>;
	readonly surface: Dumling.Surface<L>;
	readonly form: F;
	readonly key: string;
	readonly axes: SurfaceAxes;
	readonly placement: Placement;
	readonly refs: readonly string[];
};

/** One Licence Group and what its derivation says of each cell. */
type Group<F> = {
	readonly group: Dumrel.LicenceGroup;
	readonly state: (key: Dumling.CellKey) => CellState<F>;
};

/**
 * A Lemma's Inflection Tables (system ADR 0049): one table per Licence Group
 * (ADR 0048) of the pack's core panels, the list of met Surfaces and the
 * Licence Conflicts. Pure, with no storage, language or labels:
 *
 * - Each group's cells hold the forms the pack derives from the variants it
 *   licenses, several where a dimension is Free (`molk / melkte`), merged
 *   with the met forms placed there by `codec.key`.
 * - A met Surface is written into every cell it Covers or may be OneOf, in
 *   every group whose variants derive its form there or leave the cell
 *   Unknown. A cell it Covers where no group does is flagged
 *   `undescribed`, and the Surface goes to the list; nothing stored changes.
 * - An occurrence whose form fits other groups but not its Reading's is a
 *   Licence Conflict, and its form is never written into that Reading's
 *   table.
 *
 * The view depends on the slice as a set: order and repeats don't change it.
 */
export function projectLemmaTables<L extends Dumling.Language, F, P = string>(
	pack: InflectionPack<L, F, P>,
	slice: LemmaTablesSlice<L, P>,
): LemmaTablesView<L, F> {
	const { lemma } = slice.lemmaRecord;
	const paradigm: Dumrel.LemmaParadigm<P> = slice.lemmaRecord.paradigm ?? {
		dimensions: {},
	};
	const schema = pack.schemaFor(lemma);
	const readings = new Map<Dumrel.ReadingKey, Dumling.Reading<L>>();
	const entries = new Map<Dumrel.ReadingKey, DeriveReading<L>>();
	for (const entry of slice.readingEntries) {
		const key = readingIdentityKey(entry.reading);
		readings.set(key, entry.reading);
		entries.set(key, {
			reading: entry.reading,
			...(entry.knowledge === undefined
				? {}
				: { knowledge: entry.knowledge }),
		});
	}
	const readingKeys = [...readings.keys()].sort(compare);
	const groups = licenceGroups(paradigm, readingKeys).map(
		(group): Group<F> => {
			const derived =
				schema === undefined
					? {}
					: pack.derive({
							lemma,
							selection: selectionOf(paradigm, group),
							schema,
							readings: group.readings.flatMap(
								(key) => entries.get(key) ?? [],
							),
						});
			const states = new Map<Dumling.CellKey, CellState<F>>();
			const cells = schema && schemaIndex(schema);
			return {
				group,
				state: (key) => {
					const known = states.get(key);
					if (known) return known;
					const state = stateOf(
						cells?.byKey.get(key),
						derived[key],
						pack.codec,
					);
					states.set(key, state);
					return state;
				},
			};
		},
	);
	const links = linksOf(slice);
	const met = metSurfaces(pack, schema, slice, links);
	const core = new Set(
		schema === undefined
			? []
			: schemaIndex(schema)
					.cells.filter((cell) => cell.panel.core)
					.map((cell) => cell.key),
	);
	const placed = (surface: Met<L, F>) =>
		surface.placement.kind === "Unplaced" ? [] : surface.placement.cells;
	const fitsIn = (surface: Met<L, F>, group: Group<F>) =>
		placed(surface).some((key) => fits(group.state(key), surface.key));

	const undescribed = new Set<Dumling.CellKey>();
	const lines: SurfaceLine<L, F>[] = met.map((surface) => {
		const { placement } = surface;
		const nowhere = placed(surface).filter(
			(key) =>
				groups.length > 0 &&
				groups.every((group) => !fits(group.state(key), surface.key)),
		);
		if (placement.kind === "Covers")
			for (const key of nowhere) undescribed.add(key);
		return {
			surfaceId: surface.id,
			form: surface.form,
			key: surface.key,
			axes: surface.axes,
			inCore:
				placement.kind === "Covers" &&
				groups.some((group) =>
					placement.cells.some(
						(key) =>
							core.has(key) &&
							fits(group.state(key), surface.key),
					),
				),
			undescribed:
				placement.kind === "Covers"
					? nowhere.length > 0
					: placement.kind === "OneOf" &&
						nowhere.length === placement.cells.length,
			groups: groups
				.filter((group) => fitsIn(surface, group))
				.map(({ group }) => group.key),
			refs: surface.refs,
			unattested: surface.refs.length === 0,
		};
	});

	const groupOf = new Map<Dumrel.ReadingKey, Group<F>>();
	for (const group of groups)
		for (const reading of group.group.readings) groupOf.set(reading, group);
	const metById = new Map(
		met.map((surface) => [surface.id as string, surface]),
	);
	const lineById = new Map(
		lines.map((line) => [line.surfaceId as string, line]),
	);
	const conflicts: LicenceConflict<L>[] = [];
	for (const link of links) {
		const surface = metById.get(link.surfaceId);
		const own = groupOf.get(link.reading);
		const fitsGroups = surface
			? (lineById.get(surface.id)?.groups ?? [])
			: [];
		if (surface && own && fitsGroups.length > 0 && !fitsIn(surface, own))
			conflicts.push({
				ref: link.ref,
				reading: link.reading,
				surfaceId: surface.id,
				fitsGroups,
			});
	}

	return {
		pack: { language: pack.language, version: pack.version },
		...(schema === undefined
			? {}
			: { schema: { id: schema.id, version: schema.version } }),
		free: isFree(paradigm, readingKeys),
		groups: groups.map((group) =>
			groupView(group, readings, schema, (key) => ({
				state: group.state(key),
				undescribed: undescribed.has(key),
				attested: attestedIn(met, group, key),
			})),
		),
		surfaces: lines,
		conflicts,
	};
}

/** The variants a group licenses, per dimension in id order, as the pack derives from them. */
function selectionOf<P>(
	paradigm: Dumrel.LemmaParadigm<P>,
	group: Dumrel.LicenceGroup,
): ParadigmSelection<P> {
	const selection: Partial<
		Record<Dumrel.DimensionId, Dumrel.ParadigmVariant<P>[]>
	> = {};
	for (const dimension of Object.keys(group.selection).sort(
		compare,
	) as Dumrel.DimensionId[]) {
		const taken = new Set(group.selection[dimension]);
		selection[dimension] = (paradigm.dimensions[dimension]?.variants ?? [])
			.filter((variant) => taken.has(variant.id))
			.sort((left, right) => compare(left.id, right.id));
	}
	return selection;
}

type Link = {
	readonly ref: string;
	readonly surfaceId: string;
	readonly reading: Dumrel.ReadingKey;
};

/** Every Attestation Link once, by ref, then Reading key. */
function linksOf<L extends Dumling.Language, P>(
	slice: LemmaTablesSlice<L, P>,
): Link[] {
	const links = new Map<string, Link>();
	for (const entry of slice.readingEntries)
		for (const link of entry.attestationLinks) {
			const reading = readingIdentityKey(link.reading);
			links.set(JSON.stringify([link.ref, reading, link.surfaceId]), {
				ref: link.ref,
				surfaceId: link.surfaceId,
				reading,
			});
		}
	return [...links.values()].sort(
		(left, right) =>
			compare(left.ref, right.ref) ||
			compare(left.reading, right.reading) ||
			compare(left.surfaceId ?? "", right.surfaceId ?? ""),
	);
}

/** The Lemma's Surface Entries once each, ordered by form key, then id. */
function metSurfaces<L extends Dumling.Language, F, P>(
	pack: InflectionPack<L, F, P>,
	schema: Dumling.TableSchema | undefined,
	slice: LemmaTablesSlice<L, P>,
	links: readonly Link[],
): Met<L, F>[] {
	const entries = new Map<string, Met<L, F>>();
	for (const entry of slice.ownedSurfaceEntries) {
		if (entries.has(entry.id)) continue;
		const form = pack.formOfSurface(entry.surface);
		const axes = surfaceAxes(schema, entry.surface);
		entries.set(entry.id, {
			id: entry.id,
			surface: entry.surface,
			form,
			key: pack.codec.key(form),
			axes,
			placement: axes.placement,
			refs: [
				...new Set(
					links
						.filter((link) => link.surfaceId === entry.id)
						.map((link) => link.ref),
				),
			].sort(compare),
		});
	}
	return [...entries.values()].sort(
		(left, right) =>
			compare(left.key, right.key) || compare(left.id, right.id),
	);
}

/** The met Surfaces a group writes into one cell. */
function attestedIn<L extends Dumling.Language, F>(
	met: readonly Met<L, F>[],
	group: Group<F>,
	key: Dumling.CellKey,
): Attested<L, F>[] {
	return met
		.filter(
			(surface) =>
				surface.placement.kind !== "Unplaced" &&
				surface.placement.cells.includes(key) &&
				fits(group.state(key), surface.key),
		)
		.map((surface) => ({
			form: surface.form,
			key: surface.key,
			source: {
				surfaceId: surface.id,
				refs: surface.refs,
				uncertain: surface.placement.kind === "OneOf",
			},
		}));
}

function groupView<L extends Dumling.Language, F>(
	{ group }: Group<F>,
	readings: ReadonlyMap<Dumrel.ReadingKey, Dumling.Reading<L>>,
	schema: Dumling.TableSchema | undefined,
	cell: (key: Dumling.CellKey) => Parameters<typeof cellView<L, F>>[1],
): TableGroupView<L, F> {
	const panels: PanelView<L, F>[] = (schema?.panels ?? [])
		.filter((panel) => panel.core)
		.map((panel) => ({
			id: panel.id,
			fixed: panel.fixed,
			rows: panel.rows.map((row) => row.bundle),
			columns: panel.columns.map((column) => column.bundle),
			cells: panel.rows.map((row) =>
				panel.columns.map((column) => {
					const key = cellKeyOf(
						cellBundleOf(panel, row, column),
						schema?.keyFeatures ?? [],
					);
					return cellView(key, cell(key));
				}),
			),
		}));
	return {
		readings: group.readings.flatMap((key) => readings.get(key) ?? []),
		readingKeys: group.readings,
		selectionKey: group.key,
		selection: group.selection,
		panels,
	};
}
