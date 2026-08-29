import { useEffect, useState, useSyncExternalStore } from "react";

import type { ReadingNoteData } from "./reading";
import type { RouteNoteData } from "./route";
import type { ShadowNoteData, ShadowNoteReferrer } from "./shadow";

type PaginatedRouteNote = Extract<
	RouteNoteData,
	{ routeKind: "Surface" | "Lemma" }
>;

export type PaginatedNote =
	| ReadingNoteData
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

export type PaginatedNoteTransport<Note extends PaginatedNote> = (
	cursor: string,
) => Promise<Note | null>;

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
				if (!next || !sameNote(requestedNote, next)) {
					publish({ ...snapshot, hasMore: false });
					return;
				}
				const merged = mergeNotePages(requestedNote, next);
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
	if (note.kind === "UnitReadingNote") {
		return {
			cursor: note.sourceContexts.continueCursor,
			isDone: note.sourceContexts.isDone,
		};
	}
	if (note.kind === "ShadowNote") {
		return {
			cursor: note.references.continueCursor,
			isDone: note.references.isDone,
		};
	}
	return {
		cursor: note.connections.continueCursor,
		isDone: note.connections.isDone,
	};
}

function sameNote(current: PaginatedNote, next: PaginatedNote): boolean {
	if (current.kind !== next.kind) return false;
	if (current.kind === "UnitReadingNote") {
		return (
			next.kind === "UnitReadingNote" &&
			next.target.readingId === current.target.readingId
		);
	}
	if (current.kind === "ShadowNote") {
		return (
			next.kind === "ShadowNote" &&
			next.target.shadowId === current.target.shadowId
		);
	}
	return (
		next.kind === "RouteNote" &&
		next.routeKind === current.routeKind &&
		next.target.id === current.target.id
	);
}

function paginationSeedKey(note: PaginatedNote): string {
	if (note.kind === "UnitReadingNote") {
		return JSON.stringify([
			note.sourceContexts.page.map(({ attestationId }) => attestationId),
			note.sourceContexts.continueCursor,
			note.sourceContexts.isDone,
		]);
	}
	if (note.kind === "ShadowNote") {
		return JSON.stringify([
			note.references.page,
			note.references.continueCursor,
			note.references.isDone,
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
	if (
		current.kind === "UnitReadingNote" &&
		latest.kind === "UnitReadingNote"
	) {
		return { ...latest, sourceContexts: current.sourceContexts } as Note;
	}
	if (current.kind === "ShadowNote" && latest.kind === "ShadowNote") {
		return { ...latest, references: current.references } as Note;
	}
	if (
		current.kind === "RouteNote" &&
		latest.kind === "RouteNote" &&
		current.routeKind === latest.routeKind
	) {
		return { ...latest, connections: current.connections } as Note;
	}
	throw new Error("Paginated Note refresh must describe the same subject.");
}

function mergeNotePages<Note extends PaginatedNote>(
	current: Note,
	next: Note,
): Note {
	if (current.kind === "UnitReadingNote" && next.kind === "UnitReadingNote") {
		return {
			...current,
			sourceContexts: {
				page: deduplicateBy(
					[
						...current.sourceContexts.page,
						...next.sourceContexts.page,
					],
					(value) => value.attestationId,
				),
				continueCursor: next.sourceContexts.continueCursor,
				isDone: next.sourceContexts.isDone,
			},
		} as Note;
	}
	if (current.kind === "ShadowNote" && next.kind === "ShadowNote") {
		return {
			...current,
			references: {
				page: mergeReferrers([
					...current.references.page,
					...next.references.page,
				]),
				continueCursor: next.references.continueCursor,
				isDone: next.references.isDone,
			},
		} as Note;
	}
	if (
		current.kind === "RouteNote" &&
		next.kind === "RouteNote" &&
		current.routeKind === "Surface" &&
		next.routeKind === "Surface"
	) {
		return {
			...current,
			connections: {
				occurrences: deduplicateBy(
					[
						...current.connections.occurrences,
						...next.connections.occurrences,
					],
					(value) => value.attestationId,
				),
				sameWrittenForm: deduplicateBy(
					[
						...current.connections.sameWrittenForm,
						...next.connections.sameWrittenForm,
					],
					(value) => value.surfaceId,
				),
				continueCursor: next.connections.continueCursor,
				isDone: next.connections.isDone,
			},
		} as Note;
	}
	if (
		current.kind === "RouteNote" &&
		next.kind === "RouteNote" &&
		current.routeKind === "Lemma" &&
		next.routeKind === "Lemma"
	) {
		return {
			...current,
			connections: {
				surfaces: deduplicateBy(
					[
						...current.connections.surfaces,
						...next.connections.surfaces,
					],
					(value) => value.surfaceId,
				),
				readings: deduplicateBy(
					[
						...current.connections.readings,
						...next.connections.readings,
					],
					(value) => value.readingId,
				),
				sameWrittenForm: deduplicateBy(
					[
						...current.connections.sameWrittenForm,
						...next.connections.sameWrittenForm,
					],
					(value) => value.lemmaId,
				),
				continueCursor: next.connections.continueCursor,
				isDone: next.connections.isDone,
			},
		} as Note;
	}
	throw new Error("Paginated Note pages must describe the same subject.");
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
	return note.kind === "UnitReadingNote"
		? "Source Contexts could not be loaded."
		: note.kind === "ShadowNote"
			? "Shadow references could not be loaded."
			: "Route connections could not be loaded.";
}
