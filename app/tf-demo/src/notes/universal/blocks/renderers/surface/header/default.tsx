import { NoteTitle, NoteTitleRow } from "lego";

import type { SurfaceDefaultRenderer } from "../../../renderer";

/**
 * A Surface is one written form. It has no family, kind, or gender of its
 * own, so the headword stays in the neutral link tone.
 */
export const renderDefaultSurfaceHeader = (({ noteData }) => {
	const count = noteData.analyses.length;
	return (
		<header>
			<NoteTitleRow>
				<NoteTitle data-surface-title="">
					{noteData.target.normalizedSurface}
				</NoteTitle>
				<span className="text-sm text-ink-muted">
					{count === 1 ? "1 reading" : `${count} readings`}
					{noteData.isDone ? "" : "+"}
				</span>
			</NoteTitleRow>
		</header>
	);
}) satisfies SurfaceDefaultRenderer;
