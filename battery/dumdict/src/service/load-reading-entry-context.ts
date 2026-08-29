import type { SupportedLanguage } from "dumling/types";
import type {
	AddNewNoteRequest,
	ApplyGeneratedKnowledgeRequest,
	EnsureOwnedSurfaceRequest,
	EnsureReadingEntryRequest,
} from "../public";
import type {
	LoadReadingEntryContextRequest,
	ReadingEntryContext,
} from "../storage";
import type { DumdictServiceRuntimeOptions } from "./runtime-options";

export type ReadingEntryContextLoad<L extends SupportedLanguage> =
	| { intent: "addNewNote"; request: AddNewNoteRequest<L> }
	| {
			intent: "applyGeneratedKnowledge";
			request: ApplyGeneratedKnowledgeRequest<L>;
	  }
	| {
			intent: "ensureOwnedSurface";
			request: EnsureOwnedSurfaceRequest<L>;
	  }
	| {
			intent: "ensureReadingEntry";
			request: EnsureReadingEntryRequest<L>;
	  };

type ContextFor<
	L extends SupportedLanguage,
	Load extends ReadingEntryContextLoad<L>,
> = Extract<ReadingEntryContext<L>, { intent: Load["intent"] }>;

function storageRequestFor<L extends SupportedLanguage>(
	load: ReadingEntryContextLoad<L>,
): LoadReadingEntryContextRequest<L> {
	switch (load.intent) {
		case "addNewNote":
			return {
				intent: load.intent,
				reading: load.request.draft.reading,
				ownedSurfaces:
					load.request.draft.ownedSurfaces?.map(
						({ surface }) => surface,
					) ?? [],
				relations: [...(load.request.draft.relations ?? [])],
			};
		case "applyGeneratedKnowledge":
			return {
				intent: load.intent,
				reading: load.request.reading,
				pendingRelations: [...load.request.pendingRelations],
			};
		case "ensureOwnedSurface":
			return {
				intent: load.intent,
				reading: load.request.reading,
				surface: load.request.ownedSurface.surface,
			};
		case "ensureReadingEntry":
			return {
				intent: load.intent,
				reading: load.request.entry.reading,
			};
	}
}

export async function loadReadingEntryContext<
	L extends SupportedLanguage,
	Load extends ReadingEntryContextLoad<L>,
>(
	options: DumdictServiceRuntimeOptions<L>,
	load: Load,
): Promise<ContextFor<L, Load>> {
	const request = storageRequestFor(load);
	const context = await options.storage.loadReadingEntryContext(request);
	options.sliceValidation.readingEntryContext(context, request);
	return context as ContextFor<L, Load>;
}
