import { DensityScope, NoteTags } from "lego";
import { createElement, type ReactElement } from "react";
import { DEFAULT_KNOWLEDGE_SETTINGS } from "../../../../shared/knowledge-preferences";
import type { NoteBlockKind } from "../blocks/kind";
import { ReadingMetadata } from "../blocks/renderers/reading/heading/default";
import type {
	ReadingPresentationCapabilities,
	RoutePresentationCapabilities,
	ShadowPresentationCapabilities,
	SurfacePresentationCapabilities,
} from "./capabilities";
import { describeNote, type NoteCoordinates, type NoteData } from "./data";
import { renderErrorNote } from "./error";
import { ErrorBlock, NoteBlockErrorBoundary } from "./error-block";
import type { NoteKind } from "./kind";
import { noteKindSchema } from "./kind";
import type { NoteBlockLayout } from "./layout";
import { resolveRenderPlan } from "./render-plan";

type RegistryFor = (
	coordinates: NoteCoordinates,
) => Partial<
	Record<NoteBlockKind, (context: never) => ReactElement | null>
> | null;

/**
 * The Heading Block alone, which a Card or a Cover draws as its lift handle.
 * It is pinned first and stands outside the stored layout, so it needs none.
 * Null when the Note's route has no Heading Block or the Note cannot render;
 * its Body then shows why.
 */
export function renderUniversalNoteHeading({
	noteData,
	capabilities,
	registryFor,
}: {
	readonly noteData: NoteData;
	readonly capabilities?: unknown;
	readonly registryFor: RegistryFor;
}): ReactElement | null {
	try {
		if (!isKnownKind(noteData)) return null;
		const { coordinates, identity } = describeNote(noteData);
		const renderer = registryFor(coordinates)?.Heading;
		if (!renderer) return null;
		const context = blockContext(
			noteData,
			coordinates,
			capabilities ?? defaultCapabilities(noteData),
		);
		return renderBlock("Heading", renderer, context, identity);
	} catch {
		return null;
	}
}

/**
 * The Note's frame holding every Block but the Heading, closed by the tags
 * that name the Note. A host that draws no handle of its own passes the
 * Heading back as `heading`; it goes first, as the pinned Block.
 */
export function renderUniversalNoteBody({
	noteData,
	capabilities,
	layout,
	registryFor,
	heading = null,
}: {
	readonly noteData: NoteData;
	readonly capabilities?: unknown;
	readonly layout: NoteBlockLayout;
	readonly registryFor: RegistryFor;
	readonly heading?: ReactElement | null;
}): ReactElement {
	try {
		if (!isKnownKind(noteData)) {
			const kind = (noteData as { readonly kind?: unknown }).kind;
			return renderErrorNote(
				`Unknown Note kind: ${typeof kind === "string" ? kind : "missing"}.`,
				"Unknown Note",
			);
		}
		const { coordinates, identity } = describeNote(noteData);
		const renderCapabilities =
			capabilities ?? defaultCapabilities(noteData);
		const { plan } = resolveRenderPlan(registryFor, coordinates, layout);
		const context = blockContext(noteData, coordinates, renderCapabilities);
		const blocks = plan.body.flatMap(({ blockKind, renderer }) => {
			const rendered = renderBlock(
				blockKind,
				renderer,
				context,
				identity,
			);
			return rendered ? [rendered] : [];
		});
		const presentation =
			(renderCapabilities as { presentation?: "Card" | "Sheet" })
				.presentation ?? "Sheet";
		return (
			<DensityScope
				density={presentation === "Card" ? "compact" : "comfortable"}
				data-note-presentation={presentation}
				data-note-kind={noteData.kind}
				className="min-h-full bg-paper text-base text-ink compact:text-sm"
			>
				<article
					className="mx-auto w-full max-w-note px-note-gutter pt-note-top pb-note-top compact:p-3.5"
					aria-label={`${noteData.kind} Note`}
				>
					{heading}
					{blocks}
					{plan.heading ? renderNoteMetadata(noteData) : null}
				</article>
			</DensityScope>
		);
	} catch (cause) {
		return renderErrorNote(cause, `${safeKind(noteData)} Note unavailable`);
	}
}

function blockContext(
	noteData: NoteData,
	coordinates: NoteCoordinates,
	capabilities: unknown,
) {
	return noteData.kind === "Surface"
		? { noteData, PresentationCapabilities: capabilities }
		: {
				noteData,
				RouteKey: { ...coordinates, noteKind: noteData.kind },
				PresentationCapabilities: capabilities,
			};
}

/** A Block whose failure stays inside it, so its siblings still render. */
function renderBlock(
	blockKind: NoteBlockKind,
	renderer: (context: never) => ReactElement | null,
	context: ReturnType<typeof blockContext>,
	identity: string,
): ReactElement | null {
	let rendered: ReactElement | null;
	try {
		rendered = renderer(context as never);
	} catch (cause) {
		rendered = <ErrorBlock blockKind={blockKind} cause={cause} />;
	}
	if (rendered === null) return null;
	return createElement(
		NoteBlockErrorBoundary,
		{
			key: `${identity}:${blockKind}`,
			blockKind,
			resetToken: context,
		},
		rendered,
	);
}

/** The quiet tag row that closes every Note and names what it is. */
function renderNoteMetadata(note: NoteData): ReactElement {
	switch (note.kind) {
		case "Reading":
			return <ReadingMetadata lemma={note.reading.lemma} />;
		case "Lemma":
			return <ReadingMetadata lemma={note.presented} />;
		case "Surface":
			return (
				<NoteTags>
					<span>{note.target.language}</span>
					<span>Surface</span>
				</NoteTags>
			);
		case "Attestation": {
			const { surface, members, realizationCoverage } = note.presented;
			const orthographies = [
				...new Set(members.map(({ orthography }) => orthography)),
			].filter((orthography) => orthography !== "Standard");
			return (
				<NoteTags>
					<span>{surface.language}</span>
					<span>Attestation</span>
					{orthographies.map((orthography) => (
						<span key={orthography}>{orthography}</span>
					))}
					{realizationCoverage !== "Full" ? (
						<span>{realizationCoverage}</span>
					) : null}
				</NoteTags>
			);
		}
		case "Shadow":
			return (
				<NoteTags>
					<span>{note.descriptor.language}</span>
					<span>Shadow</span>
					<span>{note.descriptor.family}</span>
					<span>{note.descriptor.kind}</span>
				</NoteTags>
			);
	}
}

export function defaultCapabilities(
	note: NoteData,
):
	| ReadingPresentationCapabilities
	| RoutePresentationCapabilities
	| SurfacePresentationCapabilities
	| ShadowPresentationCapabilities {
	if (note.kind === "Reading")
		return {
			knowledgeSettings: DEFAULT_KNOWLEDGE_SETTINGS,
			sourceContexts: {
				items: note.sourceContexts.page,
				hasMore: !note.sourceContexts.isDone,
				isLoading: false,
				error: null,
				loadMore: null,
			},
			personalAnnotation: { isSaving: false, error: null, save: null },
			follow: () => {},
		};
	if (note.kind === "Shadow")
		return {
			references: {
				items: note.references.page,
				hasMore: !note.references.isDone,
				isLoading: false,
				error: null,
				loadMore: null,
			},
			cleanup: {
				activeLocator: null,
				actionError: null,
				outcome: null,
				resolve: null,
			},
			follow: () => {},
		};
	if (note.kind === "Surface")
		return {
			pagination: {
				hasMore: false,
				isLoading: false,
				error: null,
				loadMore: null,
			},
			follow: () => {},
		};
	return {
		pagination: {
			hasMore: false,
			isLoading: false,
			error: null,
			loadMore: null,
		},
		follow: () => {},
	};
}

function safeKind(note: NoteData): NoteKind | "Unknown" {
	return isKnownKind(note) ? note.kind : "Unknown";
}

function isKnownKind(note: NoteData): boolean {
	return (noteKindSchema.options as readonly string[]).includes(note.kind);
}
