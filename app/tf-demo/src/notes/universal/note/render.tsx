import { DensityScope, NoteTags } from "lego";
import { createElement, type ReactElement } from "react";
import { DEFAULT_KNOWLEDGE_SETTINGS } from "../../../../shared/knowledge-preferences";
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
import { ErrorBlock, NoteBlockErrorBoundary } from "./error-block";
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
				rendered = <ErrorBlock blockKind={blockKind} cause={cause} />;
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
		const presentation =
			(renderCapabilities as { presentation?: "Card" | "Sheet" })
				.presentation ?? "Sheet";
		const hasHeader = plan.some(({ blockKind }) => blockKind === "Header");
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
					{blocks}
					{hasHeader ? renderNoteMetadata(noteData) : null}
				</article>
			</DensityScope>
		);
	} catch (cause) {
		return renderErrorNote(cause, `${safeKind(noteData)} Note unavailable`);
	}
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
	return (noteKindSchema.options as readonly string[]).includes(note.kind)
		? note.kind
		: "Unknown";
}
