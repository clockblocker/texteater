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
 * every other Block. The Heading is pinned first; on Reading Notes, Source
 * Contexts follows the lookup blocks (right before Personal Annotation) so
 * mid-sentence lookup lands on Translations and Definition first, while on
 * Attestation Notes Source Contexts leads the Body.
 */
export type RenderPlan = {
	/** Null when the Note's route has no Heading Block. */
	readonly heading: PlannedBlock | null;
	/** The Body's visible Blocks, with Source Contexts placed by Note kind. */
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
	const body: PlannedBlock[] = layout.order.flatMap((blockKind) => {
		if (layout.hidden.has(blockKind)) return [];
		const renderer = registry[blockKind];
		return renderer ? [{ blockKind, renderer }] : [];
	});
	if (registry.SourceContexts) {
		const sourceContextsBlock: PlannedBlock = {
			blockKind: "SourceContexts",
			renderer: registry.SourceContexts,
		};
		if (coordinates.noteKind === "Reading") {
			const annotationIndex = body.findIndex(
				({ blockKind }) => blockKind === "PersonalAnnotation",
			);
			if (annotationIndex === -1) {
				body.push(sourceContextsBlock);
			} else {
				body.splice(annotationIndex, 0, sourceContextsBlock);
			}
		} else {
			body.unshift(sourceContextsBlock);
		}
	}
	return {
		layout,
		plan: {
			heading: registry.Heading
				? { blockKind: "Heading", renderer: registry.Heading }
				: null,
			body,
		},
	};
}
