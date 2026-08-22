import { Fragment, type ReactElement } from "react";

import { renderErrorNote } from "../error-note";
import type { NoteBlockKindFor } from "../note-block-kind";
import { orderNoteBlockKinds } from "../note-block-order";
import { DEFAULT_SHADOW_NOTE_RENDERER_FOR } from "./default-renderers";
import {
	createDefaultShadowNoteCapabilities,
	type ShadowNoteData,
	type ShadowNotePresentationCapabilities,
} from "./shadow-note-render-context";

export type {
	ShadowNoteData,
	ShadowNoteDefaultRenderer,
	ShadowNotePresentationCapabilities,
	ShadowNoteReferrer,
	ShadowNoteRenderContext,
} from "./shadow-note-render-context";

const SHADOW_NOTE_BLOCKS = new Set<NoteBlockKindFor<"ShadowNote">>([
	"Header",
	"Relations",
]);

export function renderShadowNote(
	note: ShadowNoteData,
	capabilities?: ShadowNotePresentationCapabilities,
): ReactElement {
	try {
		const renderCapabilities =
			capabilities ?? createDefaultShadowNoteCapabilities(note);
		return (
			<div className="flex-1 bg-background px-4 py-8 sm:px-6 sm:py-12">
				<div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
					{(
						orderNoteBlockKinds(
							SHADOW_NOTE_BLOCKS,
						) as readonly NoteBlockKindFor<"ShadowNote">[]
					).map((blockKind) => {
						const renderer =
							DEFAULT_SHADOW_NOTE_RENDERER_FOR[blockKind];
						return (
							<Fragment
								key={`${note.target.shadowId}:${blockKind}`}
							>
								{renderer({
									note,
									capabilities: renderCapabilities,
								})}
							</Fragment>
						);
					})}
				</div>
			</div>
		);
	} catch (cause) {
		return renderErrorNote(cause, "Shadow Note unavailable");
	}
}
