import type { ReactElement } from "react";

import { renderErrorNote } from "../error-note";
import type { NoteDataFor } from "../note-data";
import { deReadingNoteModule } from "./de";
import {
	createDefaultReadingNoteCapabilities,
	type ReadingNotePresentationCapabilities,
	type ReadingNoteRenderContext,
} from "./reading-note-render-context";
import {
	narrowReadingNoteRoute,
	type ReadingNoteRouteKey,
	type UnitReadingFamilyFor,
	type UnitReadingKindFor,
} from "./reading-note-route";
import { renderReadingNoteComposition } from "./render-reading-note";

export type ReadingNoteData = NoteDataFor<"UnitReadingNote">;

export type {
	ReadingNoteBlockRenderer,
	ReadingNoteDefaultRenderer,
	ReadingNotePresentationCapabilities,
	ReadingNoteRenderContext,
} from "./reading-note-render-context";
export type {
	ReadingNoteBlockMap,
	ReadingNoteRoute,
	ReadingNoteRouteKey,
	UnitReadingFamilyFor,
	UnitReadingKindFor,
} from "./reading-note-route";
export type {
	ReadingNoteRendererOverrideRegistry,
	ReadingNoteRouteRendererOverrides,
} from "./renderer-overrides";

export function renderReadingNote(
	note: ReadingNoteData,
	capabilities?: ReadingNotePresentationCapabilities,
): ReactElement {
	try {
		const route = narrowReadingNoteRoute(note);
		if (!route) {
			return renderErrorNote(
				`Unsupported Reading route: ${routeDescription(note)}.`,
				"Reading Note unavailable",
			);
		}
		const renderCapabilities =
			capabilities ?? createDefaultReadingNoteCapabilities(note);
		switch (route.targetLanguage) {
			case "de": {
				const context = createRenderContext(
					note,
					route,
					renderCapabilities,
				);
				return renderReadingNoteComposition(
					context,
					deReadingNoteModule.blockKindsFor(route),
					deReadingNoteModule.rendererOverrides,
				);
			}
			default:
				return renderUnconfiguredTargetLanguage(route.targetLanguage);
		}
	} catch (cause) {
		return renderErrorNote(cause, "Reading Note unavailable");
	}
}

function createRenderContext<
	L extends import("../target-language").TargetLanguage,
	F extends UnitReadingFamilyFor<L>,
	K extends UnitReadingKindFor<L, F>,
>(
	note: ReadingNoteData,
	route: ReadingNoteRouteKey<L, F, K>,
	capabilities: ReadingNotePresentationCapabilities,
): ReadingNoteRenderContext<L, F, K> {
	// `narrowReadingNoteRoute` validated these exact coordinates against the
	// exhaustive language map immediately before this helper is called.
	return { note, route, capabilities } as ReadingNoteRenderContext<L, F, K>;
}

function renderUnconfiguredTargetLanguage(language: never): ReactElement {
	return renderErrorNote(
		`Unsupported Reading target language: ${String(language)}.`,
		"Reading Note unavailable",
	);
}

function routeDescription(note: ReadingNoteData): string {
	const lemma = note.reading.lemma;
	return [lemma?.language, lemma?.family, lemma?.kind]
		.map((coordinate) =>
			typeof coordinate === "string" ? coordinate : "missing",
		)
		.join("/");
}
