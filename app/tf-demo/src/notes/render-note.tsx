import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import type { ReactElement } from "react";

import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import type { WorkspaceTarget } from "@/workspace/workspace-subject";
import { api } from "../../convex/_generated/api";
import { registeredBlockMap } from "./renderer-registry";
import type { NotePresentationCapabilitiesFor } from "./universal/blocks/renderer";
import type { NoteData, NoteDataFor } from "./universal/note/data";
import { renderErrorNote } from "./universal/note/error";
import type { NoteKind } from "./universal/note/kind";
import {
	availableLayoutBlockKinds,
	defaultNoteBlockLayout,
	type NoteBlockLayout,
} from "./universal/note/layout";
import {
	defaultCapabilities,
	describeRenderableNote,
	renderUniversalNoteBody,
	renderUniversalNoteHeading,
} from "./universal/note/render";
import {
	NoteSkeletonFor,
	type NoteSkeletonPart,
} from "./universal/note/skeleton";

type RenderNoteInputFor<K extends NoteKind> = {
	readonly noteData: NoteDataFor<K>;
	readonly capabilities?: NotePresentationCapabilitiesFor<K>;
};
type RenderNoteInput = {
	readonly [K in NoteKind]: RenderNoteInputFor<K>;
}[NoteKind];

/**
 * A Note split where a host places it. A Card or a Cover draws the Heading
 * Block as its lift handle; a Ground folds it shut. `renderNote` composes the
 * two the way a host that draws no handle shows them.
 */
export type NoteParts = {
	/** Null when the Note's route has no Heading Block or the Note cannot render. */
	readonly heading: ReactElement | null;
	/** The Note's frame holding every other Block, or what stands in for it. */
	readonly body: ReactElement;
};

/**
 * Hands the universal renderer a concrete layout. `part` names what a
 * stand-in shows while the layout loads: the whole Note, or its Body when the
 * host already draws the Heading.
 */
type LayoutAdapter = (
	input: RenderNoteInput,
	part: NoteSkeletonPart,
	renderWithLayout: (layout: NoteBlockLayout) => ReactElement,
) => ReactElement;

function configureRenderNote(layoutAdapter: LayoutAdapter) {
	const universalInput = (input: RenderNoteInput) => ({
		noteData: input.noteData,
		capabilities: input.capabilities,
		registryFor: registeredBlockMap,
	});
	return {
		renderNote(input: RenderNoteInput): ReactElement {
			return layoutAdapter(input, "Note", (layout) =>
				renderUniversalNoteBody({
					...universalInput(input),
					layout,
					heading: renderUniversalNoteHeading(universalInput(input)),
				}),
			);
		},
		renderNoteParts(input: RenderNoteInput): NoteParts {
			return {
				heading: renderUniversalNoteHeading(universalInput(input)),
				body: layoutAdapter(input, "Body", (layout) =>
					renderUniversalNoteBody({
						...universalInput(input),
						layout,
					}),
				),
			};
		},
	};
}

function defaultConfiguredLayout(noteData: NoteData): NoteBlockLayout {
	const registry = configuredRegistry(noteData);
	return defaultNoteBlockLayout(
		registry ? availableLayoutBlockKinds(registry) : [],
	);
}

function configuredRegistry(noteData: NoteData) {
	const described = describeRenderableNote(noteData);
	return described ? registeredBlockMap(described.coordinates) : null;
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
const acquireConfiguredLayout: LayoutAdapter = (
	input,
	part,
	renderWithLayout,
) => {
	if (!isReadingInput(input) || typeof window === "undefined") {
		return renderWithLayout(defaultConfiguredLayout(input.noteData));
	}
	if (!configuredRegistry(input.noteData)) {
		return renderWithLayout(defaultConfiguredLayout(input.noteData));
	}
	return (
		<ReadingWithConfiguredLayout
			input={input}
			part={part}
			renderWithLayout={renderWithLayout}
		/>
	);
};

function ReadingWithConfiguredLayout({
	input,
	part,
	renderWithLayout,
}: {
	readonly input: RenderNoteInputFor<"Reading">;
	readonly part: NoteSkeletonPart;
	readonly renderWithLayout: (layout: NoteBlockLayout) => ReactElement;
}) {
	const visitorId = useAnonymousVisitorId();
	const lemma = input.noteData.reading.lemma;
	const layoutQuery = useQuery(
		convexQuery(api.readingBlockLayouts.getFamilyKind, {
			visitorId,
			route: {
				targetLanguage: lemma.language as "de",
				family: lemma.family,
				kind: lemma.kind,
			},
		}),
	);
	if (layoutQuery.isPending) {
		return (
			<NoteSkeletonFor
				kind="Reading"
				presentation={input.capabilities?.presentation ?? "Sheet"}
				part={part}
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

/** The application-facing Notes interface. */
export const { renderNote, renderNoteParts } = configureRenderNote(
	acquireConfiguredLayout,
);

/** Fixtures carry no stored layout; they render on the default one. */
const fixtureNotes = configureRenderNote((input, _part, renderWithLayout) =>
	renderWithLayout(defaultConfiguredLayout(input.noteData)),
);

type FixtureNoteInput = {
	readonly noteData: NoteData;
	readonly presentation: "Card" | "Sheet";
	readonly follow: (target: WorkspaceTarget) => void;
};

/**
 * Renders a Note from fixture data, as the playground does: on the default
 * Block layout instead of a stored one, with the default capabilities plus
 * the host's presentation and follow.
 */
export function renderFixtureNote(input: FixtureNoteInput): ReactElement {
	return fixtureNotes.renderNote(fixtureInput(input));
}

/** `renderFixtureNote`, split like `renderNoteParts`. */
export function renderFixtureNoteParts(input: FixtureNoteInput): NoteParts {
	return fixtureNotes.renderNoteParts(fixtureInput(input));
}

function fixtureInput({
	noteData,
	presentation,
	follow,
}: FixtureNoteInput): RenderNoteInput {
	// `defaultCapabilities` answers for every kind at once; what it returns
	// is the capabilities of this Note's own kind.
	return {
		noteData,
		capabilities: {
			...defaultCapabilities(noteData),
			presentation,
			follow,
		},
	} as RenderNoteInput;
}
