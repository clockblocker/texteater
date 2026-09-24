import type { FunctionReturnType } from "convex/server";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { api } from "../../convex/_generated/api";

type NoteData = NonNullable<
	| FunctionReturnType<typeof api.readingNotes.get>
	| FunctionReturnType<typeof api.routeNotes.get>
	| FunctionReturnType<typeof api.shadowNotes.get>
>;
type AnyReadingNoteData = Extract<NoteData, { readonly kind: "Reading" }>;
type ShadowNoteData = Extract<NoteData, { readonly kind: "Shadow" }>;
type ShadowNoteReferrer = ShadowNoteData["references"]["page"][number];
type NoteDataFor<K extends NoteData["kind"]> = Extract<
	NoteData,
	{ readonly kind: K }
>;

type PaginatedRouteNote = NoteDataFor<"Lemma"> | NoteDataFor<"Surface">;

export type PaginatedNote =
	| AnyReadingNoteData
	| PaginatedRouteNote
	| ShadowNoteData;

export type PaginatedNoteSnapshot<Note extends PaginatedNote> = {
	readonly note: Note;
	readonly hasMore: boolean;
	readonly isLoading: boolean;
	readonly error: string | null;
};

export type PaginatedNoteLoader<Note extends PaginatedNote> = {
	readonly current: () => PaginatedNoteSnapshot<Note>;
	readonly loadMore: () => Promise<void>;
	readonly reset: (
		note: Note,
		loadPage?: PaginatedNoteTransport<Note>,
	) => void;
	readonly refresh: (
		note: Note,
		loadPage?: PaginatedNoteTransport<Note>,
	) => void;
	readonly subscribe: (listener: () => void) => () => void;
};

/**
 * The part of a Note one "load more" returns. Each Note kind keeps its own
 * list shape; only the list and its continuation travel, never the body.
 */
export type NotePage<Note extends PaginatedNote> = Note extends {
	readonly kind: "Reading";
}
	? Note["sourceContexts"]
	: Note extends { readonly kind: "Shadow" }
		? Note["references"]
		: Note extends { readonly kind: "Lemma" }
			? Note["connections"]
			: Note extends { readonly kind: "Surface" }
				? Pick<Note, "analyses" | "continueCursor" | "isDone">
				: never;

export type PaginatedNoteTransport<Note extends PaginatedNote> = (
	cursor: string,
) => Promise<NotePage<Note> | null>;

/**
 * Owns pagination composition for every Note kind, including stale request
 * suppression. Tests and React callers cross this same transport-backed seam.
 */
export function createPaginatedNoteLoader<Note extends PaginatedNote>(
	initialNote: Note,
	initialLoadPage: PaginatedNoteTransport<Note>,
): PaginatedNoteLoader<Note> {
	let revision = 0;
	let loadPage = initialLoadPage;
	let seedKey = paginationSeedKey(initialNote);
	let snapshot = initialSnapshot(initialNote);
	const listeners = new Set<() => void>();
	const publish = (next: PaginatedNoteSnapshot<Note>) => {
		snapshot = next;
		for (const listener of listeners) listener();
	};

	return {
		current: () => snapshot,
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		reset(note, nextLoadPage = loadPage) {
			revision += 1;
			loadPage = nextLoadPage;
			seedKey = paginationSeedKey(note);
			publish(initialSnapshot(note));
		},
		refresh(note, nextLoadPage = loadPage) {
			loadPage = nextLoadPage;
			const nextSeedKey = paginationSeedKey(note);
			if (!sameNote(snapshot.note, note) || nextSeedKey !== seedKey) {
				revision += 1;
				seedKey = nextSeedKey;
				publish(initialSnapshot(note));
				return;
			}
			publish({
				...snapshot,
				note: rebaseNote(snapshot.note, note),
			});
		},
		async loadMore() {
			if (!snapshot.hasMore || snapshot.isLoading) return;
			const requestedRevision = revision;
			const requestedNote = snapshot.note;
			const cursor = continuation(requestedNote).cursor;
			publish({ ...snapshot, isLoading: true, error: null });
			try {
				const next = await loadPage(cursor);
				if (requestedRevision !== revision) return;
				if (!next) {
					publish({ ...snapshot, hasMore: false });
					return;
				}
				const merged = mergeNotePage(requestedNote, next);
				publish({
					note: merged,
					hasMore: !continuation(merged).isDone,
					isLoading: snapshot.isLoading,
					error: null,
				});
			} catch (cause) {
				if (requestedRevision !== revision) return;
				publish({
					...snapshot,
					error:
						cause instanceof Error
							? cause.message
							: defaultFailureMessage(requestedNote),
				});
			} finally {
				if (requestedRevision === revision) {
					publish({ ...snapshot, isLoading: false });
				}
			}
		},
	};
}

export function usePaginatedNoteLoading<Note extends PaginatedNote>(
	initialNote: Note,
	loadPage: PaginatedNoteTransport<Note>,
): PaginatedNoteSnapshot<Note> & { readonly loadMore: () => Promise<void> } {
	const [loader] = useState(() =>
		createPaginatedNoteLoader(initialNote, loadPage),
	);
	const snapshot = useSyncExternalStore(
		loader.subscribe,
		loader.current,
		loader.current,
	);
	useEffect(() => {
		loader.refresh(initialNote, loadPage);
	}, [initialNote, loadPage, loader]);
	return { ...snapshot, loadMore: loader.loadMore };
}

function initialSnapshot<Note extends PaginatedNote>(
	note: Note,
): PaginatedNoteSnapshot<Note> {
	return {
		note,
		hasMore: !continuation(note).isDone,
		isLoading: false,
		error: null,
	};
}

function continuation(note: PaginatedNote): {
	readonly cursor: string;
	readonly isDone: boolean;
} {
	if (note.kind === "Reading") {
		return {
			cursor: note.sourceContexts.continueCursor,
			isDone: note.sourceContexts.isDone,
		};
	}
	if (note.kind === "Shadow") {
		return {
			cursor: note.references.continueCursor,
			isDone: note.references.isDone,
		};
	}
	if (note.kind === "Surface") {
		return {
			cursor: note.continueCursor,
			isDone: note.isDone,
		};
	}
	return {
		cursor: note.connections.continueCursor,
		isDone: note.connections.isDone,
	};
}

function sameNote(current: PaginatedNote, next: PaginatedNote): boolean {
	if (current.kind !== next.kind) return false;
	if (current.kind === "Reading") {
		return (
			next.kind === "Reading" &&
			next.target.readingId === current.target.readingId
		);
	}
	if (current.kind === "Shadow") {
		return (
			next.kind === "Shadow" &&
			next.target.shadowId === current.target.shadowId
		);
	}
	if (current.kind === "Surface") {
		return (
			next.kind === "Surface" &&
			next.target.language === current.target.language &&
			next.target.normalizedSurface === current.target.normalizedSurface
		);
	}
	return (
		next.kind === "Lemma" && next.target.lemmaId === current.target.lemmaId
	);
}

function paginationSeedKey(note: PaginatedNote): string {
	if (note.kind === "Reading") {
		return JSON.stringify([
			note.sourceContexts.page.map(({ attestationId }) => attestationId),
			note.sourceContexts.continueCursor,
			note.sourceContexts.isDone,
		]);
	}
	if (note.kind === "Shadow") {
		return JSON.stringify([
			note.references.page,
			note.references.continueCursor,
			note.references.isDone,
		]);
	}
	if (note.kind === "Surface") {
		return JSON.stringify([
			note.analyses.map(({ analysisKey }) => analysisKey),
			note.continueCursor,
			note.isDone,
		]);
	}
	return JSON.stringify([
		note.connections,
		note.connections.continueCursor,
		note.connections.isDone,
	]);
}

function rebaseNote<Note extends PaginatedNote>(
	current: Note,
	latest: Note,
): Note {
	if (current.kind === "Reading" && latest.kind === "Reading") {
		return { ...latest, sourceContexts: current.sourceContexts } as Note;
	}
	if (current.kind === "Shadow" && latest.kind === "Shadow") {
		return { ...latest, references: current.references } as Note;
	}
	if (current.kind === "Surface" && latest.kind === "Surface") {
		return {
			...latest,
			analyses: current.analyses,
			continueCursor: current.continueCursor,
			isDone: current.isDone,
		} as Note;
	}
	if (current.kind === "Lemma" && latest.kind === "Lemma") {
		return { ...latest, connections: current.connections } as Note;
	}
	throw new Error("Paginated Note refresh must describe the same subject.");
}

function mergeNotePage<Note extends PaginatedNote>(
	current: Note,
	pageValue: NotePage<Note>,
): Note {
	if (current.kind === "Reading") {
		const next = pageValue as NotePage<AnyReadingNoteData>;
		return {
			...current,
			sourceContexts: {
				page: deduplicateBy(
					[...current.sourceContexts.page, ...next.page],
					(value) => value.attestationId,
				),
				continueCursor: next.continueCursor,
				isDone: next.isDone,
			},
		} as Note;
	}
	if (current.kind === "Shadow") {
		const next = pageValue as NotePage<ShadowNoteData>;
		return {
			...current,
			references: {
				page: mergeReferrers([
					...current.references.page,
					...next.page,
				]),
				continueCursor: next.continueCursor,
				isDone: next.isDone,
			},
		} as Note;
	}
	if (current.kind === "Surface") {
		const next = pageValue as NotePage<NoteDataFor<"Surface">>;
		return {
			...current,
			analyses: deduplicateBy(
				[...current.analyses, ...next.analyses],
				(value) => value.analysisKey,
			),
			continueCursor: next.continueCursor,
			isDone: next.isDone,
		} as Note;
	}
	const next = pageValue as NotePage<NoteDataFor<"Lemma">>;
	const connections = (current as NoteDataFor<"Lemma">).connections;
	return {
		...current,
		connections: {
			surfaces: deduplicateBy(
				[...connections.surfaces, ...next.surfaces],
				(value) => value.surfaceId,
			),
			readings: deduplicateBy(
				[...connections.readings, ...next.readings],
				(value) => value.readingId,
			),
			sameWrittenForm: deduplicateBy(
				[...connections.sameWrittenForm, ...next.sameWrittenForm],
				(value) => value.lemmaId,
			),
			continueCursor: next.continueCursor,
			isDone: next.isDone,
		},
	} as Note;
}

function mergeReferrers(
	referrers: readonly ShadowNoteReferrer[],
): ShadowNoteReferrer[] {
	const merged = new Map<string, ShadowNoteReferrer>();
	for (const referrer of referrers) {
		const current = merged.get(referrer.reading.readingId);
		if (!current) {
			merged.set(referrer.reading.readingId, referrer);
			continue;
		}
		merged.set(referrer.reading.readingId, {
			reading: current.reading,
			pendingRelations: [
				...current.pendingRelations,
				...referrer.pendingRelations,
			],
			structuralReferences: [
				...current.structuralReferences,
				...referrer.structuralReferences,
			],
		});
	}
	return [...merged.values()];
}

function deduplicateBy<Value>(
	values: readonly Value[],
	key: (value: Value) => string,
): Value[] {
	const seen = new Set<string>();
	return values.filter((value) => {
		const identity = key(value);
		if (seen.has(identity)) return false;
		seen.add(identity);
		return true;
	});
}

function defaultFailureMessage(note: PaginatedNote): string {
	return note.kind === "Reading"
		? "Source Contexts could not be loaded."
		: note.kind === "Shadow"
			? "Shadow references could not be loaded."
			: note.kind === "Surface"
				? "Surface analyses could not be loaded."
				: "Route connections could not be loaded.";
}
