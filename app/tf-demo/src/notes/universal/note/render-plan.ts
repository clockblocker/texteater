import type { ReactElement } from "react";

import type { NoteBlockKind } from "../blocks/kind";
import type { NoteCoordinates } from "./data";
import {
	availableLayoutBlockKinds,
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
 * every other Block. The Anchor Blocks are pinned (tf-demo ADR 0006): the
 * Heading first and Source Contexts right after it, at the top of the Body,
 * so a Card's box clips neither. A layout orders and hides only the rest.
 */
export type RenderPlan = {
	/** Null when the Note's route has no Heading Block. */
	readonly heading: PlannedBlock | null;
	/** Source Contexts, when the route has it, then the layout's visible Blocks. */
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
		availableLayoutBlockKinds(registry),
	);
	return {
		layout,
		plan: {
			heading: registry.Heading
				? { blockKind: "Heading", renderer: registry.Heading }
				: null,
			body: [
				...(registry.SourceContexts
					? [
							{
								blockKind: "SourceContexts" as const,
								renderer: registry.SourceContexts,
							},
						]
					: []),
				...layout.order.flatMap((blockKind) => {
					if (layout.hidden.has(blockKind)) return [];
					const renderer = registry[blockKind];
					return renderer ? [{ blockKind, renderer }] : [];
				}),
			],
		},
	};
}
