import type { ReactElement } from "react";

import type { NoteBlockKind } from "../blocks/kind";
import type { NoteCoordinates } from "./data";
import { type NoteBlockLayout, reconcileNoteBlockLayout } from "./layout";

export type RenderPlan = readonly {
	readonly blockKind: NoteBlockKind;
	readonly renderer: (context: never) => ReactElement | null;
}[];

export function resolveRenderPlan(
	registryFor: (
		coordinates: NoteCoordinates,
	) => Partial<
		Record<NoteBlockKind, (context: never) => ReactElement | null>
	> | null,
	coordinates: NoteCoordinates,
	requestedLayout: NoteBlockLayout,
): { readonly layout: NoteBlockLayout; readonly plan: RenderPlan } {
	const registry = registryFor(coordinates);
	if (!registry) {
		throw new Error(
			`Unsupported ${coordinates.noteKind} route: ${coordinates.language}/${coordinates.family ?? "direct"}/${coordinates.kind ?? "direct"}.`,
		);
	}
	const available = Object.keys(registry) as NoteBlockKind[];
	const layout = reconcileNoteBlockLayout(requestedLayout, available);
	return {
		layout,
		plan: layout.order.flatMap((blockKind) => {
			if (layout.hidden.has(blockKind)) return [];
			const renderer = registry[blockKind];
			return renderer ? [{ blockKind, renderer }] : [];
		}),
	};
}
