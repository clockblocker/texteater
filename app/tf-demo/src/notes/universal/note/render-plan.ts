import type { ReactElement } from "react";

import type { NoteBlockKind } from "../blocks/kind";
import type { NoteCoordinates } from "./data";
import {
	availableBodyBlockKinds,
	type NoteBlockLayout,
	reconcileNoteBlockLayout,
} from "./layout";

type PlannedBlock = {
	readonly blockKind: NoteBlockKind;
	readonly renderer: (context: never) => ReactElement | null;
};

/**
 * The Blocks a Note renders, split where a host places them: the Heading
 * Block, which a Card or a Cover draws as its lift handle, and the Body,
 * every other Block. The Heading is pinned first (tf-demo ADR 0006), so a
 * layout names only Body Blocks.
 */
export type RenderPlan = {
	/** Null when the Note's route has no Heading Block. */
	readonly heading: PlannedBlock | null;
	readonly body: readonly PlannedBlock[];
};

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
	const layout = reconcileNoteBlockLayout(
		requestedLayout,
		availableBodyBlockKinds(registry),
	);
	return {
		layout,
		plan: {
			heading: registry.Heading
				? { blockKind: "Heading", renderer: registry.Heading }
				: null,
			body: layout.order.flatMap((blockKind) => {
				if (layout.hidden.has(blockKind)) return [];
				const renderer = registry[blockKind];
				return renderer ? [{ blockKind, renderer }] : [];
			}),
		},
	};
}
