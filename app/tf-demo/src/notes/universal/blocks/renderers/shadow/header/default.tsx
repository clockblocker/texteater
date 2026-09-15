import { NoteTitle, NoteTitleRow } from "lego";
import { LockIcon } from "lucide-react";

import type { GrammaticalDefaultRenderer } from "../../../renderer";

/**
 * A Shadow is a word other Readings point at that the dictionary does not
 * hold yet. It wears the same lock and shadow tone a relation to it wears
 * inside a Reading Note.
 */
export const renderDefaultShadowHeader = (({ noteData }) => {
	const { descriptor, inspection } = noteData;
	return (
		<header>
			<NoteTitleRow>
				<NoteTitle
					data-shadow-title=""
					className="flex items-center gap-2 text-link-shadow"
				>
					<LockIcon
						aria-label="Not in the dictionary yet"
						className="size-[0.8em] shrink-0"
					/>
					{descriptor.canonicalForm}
				</NoteTitle>
				<span className="text-sm text-ink-muted">
					{inspection.candidates.length === 0
						? "not in the dictionary yet"
						: inspection.candidates.length === 1
							? "1 possible Lemma"
							: `${inspection.candidates.length} possible Lemmas`}
				</span>
			</NoteTitleRow>
		</header>
	);
}) satisfies GrammaticalDefaultRenderer<"Shadow">;
