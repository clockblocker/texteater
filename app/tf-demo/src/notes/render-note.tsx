import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import type { ReactElement } from "react";

import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import { api } from "../../convex/_generated/api";
import { registeredBlockMap } from "./renderer-registry";
import type { NoteBlockKind } from "./universal/blocks/kind";
import type { NotePresentationCapabilitiesFor } from "./universal/blocks/renderer";
import {
	describeNote,
	type NoteData,
	type NoteDataFor,
} from "./universal/note/data";
import { renderErrorNote } from "./universal/note/error";
import type { NoteKind } from "./universal/note/kind";
import {
	defaultNoteBlockLayout,
	type NoteBlockLayout,
} from "./universal/note/layout";
import { renderUniversalNote } from "./universal/note/render";

type RenderNoteInputFor<K extends NoteKind> = {
	readonly noteData: NoteDataFor<K>;
	readonly capabilities?: NotePresentationCapabilitiesFor<K>;
};
type RenderNoteInput = {
	readonly [K in NoteKind]: RenderNoteInputFor<K>;
}[NoteKind];

type LayoutAdapter = (
	input: RenderNoteInput,
	renderWithLayout: (layout: NoteBlockLayout) => ReactElement,
) => ReactElement;

function configureRenderNote(layoutAdapter: LayoutAdapter) {
	return function renderNote(input: RenderNoteInput): ReactElement {
		return layoutAdapter(input, (layout) =>
			renderUniversalNote({
				noteData: input.noteData,
				capabilities: input.capabilities,
				layout,
				registryFor: registeredBlockMap,
			}),
		);
	};
}

function defaultConfiguredLayout(noteData: NoteData): NoteBlockLayout {
	const registry = configuredRegistry(noteData);
	return defaultNoteBlockLayout(
		registry ? (Object.keys(registry) as NoteBlockKind[]) : [],
	);
}

function configuredRegistry(noteData: NoteData) {
	try {
		return registeredBlockMap(describeNote(noteData).coordinates);
	} catch {
		return null;
	}
}

function isReadingInput(
	input: RenderNoteInput,
): input is RenderNoteInputFor<"Reading"> {
	return input.noteData.kind === "Reading";
}

/**
 * The application configures acquisition once. The universal renderer receives
 * only a concrete persisted layout after loading succeeds.
 */
const acquireConfiguredLayout: LayoutAdapter = (input, renderWithLayout) => {
	if (!isReadingInput(input) || typeof window === "undefined") {
		return renderWithLayout(defaultConfiguredLayout(input.noteData));
	}
	if (!configuredRegistry(input.noteData)) {
		return renderWithLayout(defaultConfiguredLayout(input.noteData));
	}
	return (
		<ReadingWithConfiguredLayout
			input={input}
			renderWithLayout={renderWithLayout}
		/>
	);
};

function ReadingWithConfiguredLayout({
	input,
	renderWithLayout,
}: {
	readonly input: RenderNoteInputFor<"Reading">;
	readonly renderWithLayout: (layout: NoteBlockLayout) => ReactElement;
}) {
	const visitorId = useAnonymousVisitorId();
	const lemma = input.noteData.reading.lemma;
	const layoutQuery = useQuery({
		...convexQuery(api.readingBlockLayouts.getFamilyKind, {
			visitorId,
			route: {
				targetLanguage: lemma.language as "de",
				family: lemma.family,
				kind: lemma.kind,
			},
		}),
		gcTime: 10_000,
	});
	if (layoutQuery.isPending) {
		return (
			<div
				className="reading-note"
				role="status"
				aria-label="Loading Reading note"
			/>
		);
	}
	if (layoutQuery.isError || !layoutQuery.data) {
		return renderErrorNote(
			layoutQuery.error ?? "Reading layout could not be loaded.",
			"Reading Note unavailable",
		);
	}
	return renderWithLayout({
		order: layoutQuery.data.order,
		hidden: new Set(layoutQuery.data.hidden),
	});
}

/** The sole application-facing Notes interface. */
export const renderNote = configureRenderNote(acquireConfiguredLayout);
