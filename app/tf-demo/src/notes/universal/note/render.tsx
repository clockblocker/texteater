import "./reading-note.css";
import { DEFAULT_KNOWLEDGE_SETTINGS } from "dumrel";
import { createElement, type ReactElement } from "react";
import type { NoteBlockKind } from "../blocks/kind";
import { ReadingMetadata } from "../blocks/renderers/reading/header/default";
import type {
	ReadingPresentationCapabilities,
	RoutePresentationCapabilities,
	ShadowPresentationCapabilities,
	SurfacePresentationCapabilities,
} from "./capabilities";
import { describeNote, type NoteCoordinates, type NoteData } from "./data";
import { renderErrorNote } from "./error";
import { NoteBlockErrorBoundary, renderErrorBlock } from "./error-block";
import type { NoteKind } from "./kind";
import { noteKindSchema } from "./kind";
import type { NoteBlockLayout } from "./layout";
import { resolveRenderPlan } from "./render-plan";

export function renderUniversalNote({
	noteData,
	capabilities,
	layout,
	registryFor,
}: {
	readonly noteData: NoteData;
	readonly capabilities?: unknown;
	readonly layout: NoteBlockLayout;
	readonly registryFor: (
		coordinates: NoteCoordinates,
	) => Partial<
		Record<NoteBlockKind, (context: never) => ReactElement | null>
	> | null;
}): ReactElement {
	try {
		if (
			!(noteKindSchema.options as readonly string[]).includes(
				noteData.kind,
			)
		) {
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
		const context =
			noteData.kind === "Surface"
				? { noteData, PresentationCapabilities: renderCapabilities }
				: {
						noteData,
						RouteKey: { ...coordinates, noteKind: noteData.kind },
						PresentationCapabilities: renderCapabilities,
					};
		const blocks = plan.flatMap(({ blockKind, renderer }) => {
			let rendered: ReactElement | null;
			try {
				rendered = renderer(context as never);
			} catch (cause) {
				rendered = renderErrorBlock(blockKind, cause);
			}
			if (rendered === null) return [];
			return [
				createElement(
					NoteBlockErrorBoundary,
					{
						key: `${identity}:${blockKind}`,
						blockKind,
						resetToken: context,
					},
					rendered,
				),
			];
		});
		if (noteData.kind === "Reading") {
			const presentation =
				(renderCapabilities as ReadingPresentationCapabilities)
					.presentation ?? "Sheet";
			return (
				<div
					className="reading-note"
					data-note-presentation={presentation}
				>
					<article
						className="reading-note__article"
						aria-label="Reading Note"
					>
						{blocks}
						{plan.some(
							({ blockKind }) => blockKind === "Header",
						) ? (
							<ReadingMetadata lemma={noteData.reading.lemma} />
						) : null}
					</article>
				</div>
			);
		}
		return (
			<div className="flex-1 bg-background px-4 py-8 sm:px-6 sm:py-12">
				<div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
					{blocks}
				</div>
			</div>
		);
	} catch (cause) {
		return renderErrorNote(cause, `${safeKind(noteData)} Note unavailable`);
	}
}

function defaultCapabilities(
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
			definition: { isSaving: false, error: null, save: null },
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
	return (noteKindSchema.options as readonly string[]).includes(note.kind)
		? note.kind
		: "Unknown";
}
