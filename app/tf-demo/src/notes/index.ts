import { createElement, Fragment, type ReactElement } from "react";

import { renderErrorNote } from "./error-note";
import type { NoteBlockKind } from "./note-block-kind";
import {
	defaultNoteBlockLayout,
	reconcileNoteBlockLayout,
} from "./note-block-layout";
import type { NotePresentationCapabilitiesFor } from "./note-block-renderer-registry";
import { registeredNoteBlockMap } from "./note-block-renderer-registry-runtime";
import type { NoteData, NoteDataFor } from "./note-data";
import type { NoteKind } from "./note-kind";
import { noteKindSchema } from "./note-kind";
import {
	type AnyReadingNoteData,
	createDefaultReadingNoteCapabilities,
	type ReadingNotePresentationCapabilities,
	renderReadingNote,
} from "./reading";
import {
	createDefaultRouteNoteCapabilities,
	type RouteNotePresentationCapabilities,
} from "./route";
import {
	createDefaultShadowNoteCapabilities,
	type ShadowNoteData,
	type ShadowNotePresentationCapabilities,
} from "./shadow";
import {
	type ConcreteSurfaceNoteData,
	createDefaultSurfaceNoteCapabilities,
	type SurfaceNoteData,
	type SurfaceNotePresentationCapabilities,
} from "./surface";

export { renderErrorNote } from "./error-note";
export type { NoteBlockKind } from "./note-block-kind";
export { noteBlockKindSchema } from "./note-block-kind";
export {
	defaultNoteBlockLayout,
	type NoteBlockLayout,
	reconcileNoteBlockLayout,
} from "./note-block-layout";
export {
	orderNoteBlockKinds,
	WEIGHT_FOR_NOTE_BLOCK_KIND,
} from "./note-block-order";
export type {
	GrammaticalNoteDataFor,
	GrammaticalNoteKind,
	GrammaticalNoteRenderContext,
	NoteBlockRenderer,
	NoteBlockRendererRegistry,
	NoteFamilyFor,
	NoteLemmaKindFor,
	NotePresentationCapabilitiesFor,
} from "./note-block-renderer-registry";
export { NOTE_BLOCK_RENDERER_REGISTRY } from "./note-block-renderer-registry-runtime";
export type { NoteData, NoteDataFor } from "./note-data";
export type { NoteKind } from "./note-kind";
export { noteKindSchema } from "./note-kind";
export type {
	ConcreteSurfaceNoteData,
	SurfaceAnalysis,
	SurfaceAnalysisDescriptionRenderer,
	SurfaceAnalysisDescriptionRendererRegistry,
	SurfaceAnalysisFor,
	SurfaceNoteBlockRenderer,
	SurfaceNoteData,
	SurfaceNotePresentationCapabilities,
	SurfaceNoteRenderContext,
} from "./surface";
export type { TargetLanguage } from "./target-language";
export { targetLanguageSchema } from "./target-language";

type LemmaNoteData = NoteDataFor<"Lemma">;
type AttestationNoteData = NoteDataFor<"Attestation">;

export function renderNote(
	note: AnyReadingNoteData,
	capabilities?: ReadingNotePresentationCapabilities,
): ReactElement;
export function renderNote(
	note: LemmaNoteData,
	capabilities?: RouteNotePresentationCapabilities,
): ReactElement;
export function renderNote(
	note: SurfaceNoteData,
	capabilities?: SurfaceNotePresentationCapabilities,
): ReactElement;
export function renderNote(
	note: AttestationNoteData,
	capabilities?: RouteNotePresentationCapabilities,
): ReactElement;
export function renderNote(
	note: ShadowNoteData,
	capabilities?: ShadowNotePresentationCapabilities,
): ReactElement;
export function renderNote(note: NoteData): ReactElement;
export function renderNote(
	note: NoteData,
	capabilities?: NotePresentationCapabilitiesFor<NoteKind>,
): ReactElement {
	try {
		if (
			!(noteKindSchema.options as readonly string[]).includes(note.kind)
		) {
			return renderUnknownNote(note);
		}
		if (note.kind === "Reading") {
			return renderReadingNote(
				note,
				(capabilities as
					| ReadingNotePresentationCapabilities
					| undefined) ?? createDefaultReadingNoteCapabilities(note),
			);
		}
		return renderRegisteredNote(note, capabilities);
	} catch (cause) {
		return renderErrorNote(cause, unavailableTitle(note.kind));
	}
}

function renderUnknownNote(note: NoteData): ReactElement {
	const kind = (note as { readonly kind?: unknown }).kind;
	return renderErrorNote(
		`Unknown Note kind: ${typeof kind === "string" ? kind : "missing"}.`,
		"Unknown Note",
	);
}

function renderRegisteredNote(
	note: Exclude<NoteData, { readonly kind: "Reading" }>,
	capabilities?: NotePresentationCapabilitiesFor<NoteKind>,
): ReactElement {
	const coordinates = noteCoordinates(note);
	const registry = registeredNoteBlockMap(
		coordinates.language,
		note.kind,
		coordinates.family,
		coordinates.kind,
	);
	if (!registry) {
		throw new Error(
			`Unsupported ${note.kind} route: ${coordinates.language}/${coordinates.family ?? "direct"}/${coordinates.kind ?? "direct"}.`,
		);
	}
	const available = Object.keys(registry) as NoteBlockKind[];
	const renderCapabilities = capabilitiesFor(note, capabilities);
	const requestedLayout =
		"blockLayout" in renderCapabilities
			? renderCapabilities.blockLayout
			: undefined;
	const layout = reconcileNoteBlockLayout(
		requestedLayout ?? defaultNoteBlockLayout(available),
		available,
	);
	const hidden = layout.hidden;
	const context =
		note.kind === "Surface"
			? {
					noteData: note as ConcreteSurfaceNoteData<"de">,
					PresentationCapabilities:
						renderCapabilities as SurfaceNotePresentationCapabilities,
				}
			: {
					noteData: note,
					RouteKey: { ...coordinates, noteKind: note.kind },
					PresentationCapabilities: renderCapabilities,
				};
	const blocks = layout.order.flatMap((blockKind) => {
		if (hidden.has(blockKind)) return [];
		const renderer = registry[blockKind];
		if (!renderer) return [];
		return [
			createElement(
				Fragment,
				{ key: `${noteIdentity(note)}:${blockKind}` },
				(
					renderer as unknown as (
						value: typeof context,
					) => ReactElement | null
				)(context),
			),
		];
	});
	return createElement(
		"div",
		{ className: "flex-1 bg-background px-4 py-8 sm:px-6 sm:py-12" },
		createElement(
			"div",
			{ className: "mx-auto flex w-full max-w-5xl flex-col gap-8" },
			...blocks,
		),
	);
}

function noteCoordinates(
	note: Exclude<NoteData, { readonly kind: "Reading" }>,
): {
	readonly language: string;
	readonly family?: string;
	readonly kind?: string;
} {
	switch (note.kind) {
		case "Lemma":
			return note.presented;
		case "Attestation": {
			const lemma = note.presented.surface.lemma;
			return {
				language: lemma.language,
				family: lemma.family,
				kind: lemma.kind,
			};
		}
		case "Shadow":
			return note.descriptor;
		case "Surface":
			return { language: note.target.language };
	}
}

function capabilitiesFor(
	note: Exclude<NoteData, { readonly kind: "Reading" }>,
	capabilities?: NotePresentationCapabilitiesFor<NoteKind>,
) {
	if (capabilities) return capabilities;
	if (note.kind === "Surface") return createDefaultSurfaceNoteCapabilities();
	if (note.kind === "Shadow")
		return createDefaultShadowNoteCapabilities(note);
	return createDefaultRouteNoteCapabilities();
}

function noteIdentity(
	note: Exclude<NoteData, { readonly kind: "Reading" }>,
): string {
	switch (note.kind) {
		case "Lemma":
			return note.target.lemmaId;
		case "Surface":
			return `${note.target.language}:${note.target.normalizedSurface}`;
		case "Attestation":
			return note.target.attestationId;
		case "Shadow":
			return note.target.shadowId;
	}
}

function unavailableTitle(kind: NoteKind): string {
	return `${kind} Note unavailable`;
}
