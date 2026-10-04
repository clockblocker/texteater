import { Skeleton } from "lego";
import { createContext, type ReactElement, useContext } from "react";
import { NoteSkeletonFor, renderNote, renderNoteParts } from "@/notes";

/**
 * Which part of a Note a host is drawing (tf-demo ADR 0006). The Compass
 * places a Note's Heading Block and its Body apart: the Heading is a Card's
 * title row, a Cover's bar, or a Floating Pane's title, and the Body is
 * every other Block. Outside a workspace there is no part: the whole Note.
 */
export type NotePart = "heading" | "body";

const NotePartContext = createContext<NotePart | null>(null);

export const NotePartProvider = NotePartContext.Provider;

/** The part being drawn, or `null` for the whole Note. */
export function useNotePart(): NotePart | null {
	return useContext(NotePartContext);
}

/**
 * Side effects a Note view runs once per Presentation, such as asking for
 * Knowledge or keeping its Deck up to date, belong to its Body: the Heading
 * is drawn as well, and may be drawn more than once.
 */
export function useOwnsNoteEffects(): boolean {
	return useNotePart() !== "heading";
}

type NoteInput = Parameters<typeof renderNote>[0];

/** A loaded Note, in the part its host draws. */
export function PlacedNote({ input }: { readonly input: NoteInput }) {
	const part = useNotePart();
	if (part === null) return renderNote(input);
	const parts = renderNoteParts(input);
	return part === "heading" ? parts.heading : parts.body;
}

/** A Note's stand-in while it loads, in the part its host draws. */
export function PlacedNoteSkeleton({
	kind,
	presentation,
}: {
	readonly kind: Parameters<typeof NoteSkeletonFor>[0]["kind"];
	readonly presentation: "Card" | "Sheet";
}): ReactElement {
	const part = useNotePart();
	if (part === "heading") return <HeadingSkeleton />;
	return (
		<NoteSkeletonFor
			kind={kind}
			presentation={presentation}
			part={part === "body" ? "Body" : "Note"}
		/>
	);
}

/** The Heading's words before they arrive. */
export function HeadingSkeleton() {
	return (
		<Skeleton
			role="status"
			aria-label="Loading"
			className="h-5 w-32 max-w-full"
		/>
	);
}
