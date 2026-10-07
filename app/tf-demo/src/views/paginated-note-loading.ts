import type { FunctionReturnType } from "convex/server";
import { useEffect, useState, useSyncExternalStore } from "react";
import { visitorErrorMessage } from "@/lib/visitor-error";
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

type PaginatedNoteSnapshot<Note extends PaginatedNote> = {
	readonly note: Note;
	readonly hasMore: boolean;
	readonly isLoading: boolean;
	readonly error: string | null;
};

export type PaginatedNoteLoader<Note extends PaginatedNote> = {
	readonly current: () => PaginatedNoteSnapshot<Note>;
	readonly loadMore: () => Promise<void>;
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
type NotePage<Note extends PaginatedNote> = Note extends {
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
	let seedKey = paginationOf(initialNote).seedKey(initialNote);
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
		refresh(note, nextLoadPage = loadPage) {
			loadPage = nextLoadPage;
			const pagination = paginationOf(note);
			const nextSeedKey = pagination.seedKey(note);
			if (!sameNote(snapshot.note, note) || nextSeedKey !== seedKey) {
				revision += 1;
				seedKey = nextSeedKey;
				publish(initialSnapshot(note));
				return;
			}
			publish({
				...snapshot,
				note: pagination.rebase(snapshot.note, note),
			});
		},
		async loadMore() {
			if (!snapshot.hasMore || snapshot.isLoading) return;
			const requestedRevision = revision;
			const requestedNote = snapshot.note;
			const pagination = paginationOf(requestedNote);
			const cursor = pagination.continuation(requestedNote).cursor;
			publish({ ...snapshot, isLoading: true, error: null });
			try {
				const next = await loadPage(cursor);
				if (requestedRevision !== revision) return;
				if (!next) {
					publish({ ...snapshot, hasMore: false });
					return;
				}
				const merged = pagination.merge(requestedNote, next);
				publish({
					note: merged,
					hasMore: !pagination.continuation(merged).isDone,
					isLoading: snapshot.isLoading,
					error: null,
				});
			} catch (cause) {
				if (requestedRevision !== revision) return;
				publish({
					...snapshot,
					error: visitorErrorMessage(
						cause,
						pagination.failureMessage,
					),
				});
			} finally {
				if (requestedRevision === revision) {
					publish({ ...snapshot, isLoading: false });
				}
			}
		},
	};
}

/**
 * Returns the merged Note and the pagination capability its Note renders,
 * whose `loadMore` is null once the last page has arrived.
 */
export function usePaginatedNoteLoading<Note extends PaginatedNote>(
	initialNote: Note,
	loadPage: PaginatedNoteTransport<Note>,
): {
	readonly note: Note;
	readonly pagination: {
		readonly hasMore: boolean;
		readonly isLoading: boolean;
		readonly error: string | null;
		readonly loadMore: (() => Promise<void>) | null;
	};
} {
	const [loader] = useState(() =>
		createPaginatedNoteLoader(initialNote, loadPage),
	);
	const { note, hasMore, isLoading, error } = useSyncExternalStore(
		loader.subscribe,
		loader.current,
		loader.current,
	);
	useEffect(() => {
		loader.refresh(initialNote, loadPage);
	}, [initialNote, loadPage, loader]);
	return {
		note,
		pagination: {
			hasMore,
			isLoading,
			error,
			loadMore: hasMore ? loader.loadMore : null,
		},
	};
}

function initialSnapshot<Note extends PaginatedNote>(
	note: Note,
): PaginatedNoteSnapshot<Note> {
	return {
		note,
		hasMore: !paginationOf(note).continuation(note).isDone,
		isLoading: false,
		error: null,
	};
}

function sameNote<Note extends PaginatedNote>(
	current: Note,
	next: Note,
): boolean {
	return (
		current.kind === next.kind &&
		paginationOf(current).sameTarget(current, next)
	);
}

type NoteByKind = {
	[K in PaginatedNote["kind"]]: Extract<PaginatedNote, { readonly kind: K }>;
};

/** How one Note kind paginates: where its list continues and how pages merge. */
type Pagination<Note extends PaginatedNote> = {
	readonly continuation: (note: Note) => {
		readonly cursor: string;
		readonly isDone: boolean;
	};
	/** Whether both Notes describe the same subject. */
	readonly sameTarget: (current: Note, next: Note) => boolean;
	/**
	 * Changes whenever the server reseeds the first page or changes a row on
	 * it. An unchanged key rebases, which keeps the rows already shown.
	 */
	readonly seedKey: (note: Note) => string;
	/** Takes the latest body while keeping the pages already loaded. */
	readonly rebase: (current: Note, latest: Note) => Note;
	readonly merge: (current: Note, page: NotePage<Note>) => Note;
	readonly failureMessage: string;
};

const PAGINATION: {
	readonly [K in keyof NoteByKind]: Pagination<NoteByKind[K]>;
} = {
	Reading: {
		continuation: (note) => ({
			cursor: note.sourceContexts.continueCursor,
			isDone: note.sourceContexts.isDone,
		}),
		sameTarget: (current, next) =>
			next.target.readingId === current.target.readingId,
		// Whole rows: a Source Context's segments gain a gender once the
		// Visitor encounters another noun in its Sentence, under the same id.
		seedKey: (note) => JSON.stringify(note.sourceContexts),
		rebase: (current, latest) => ({
			...latest,
			sourceContexts: current.sourceContexts,
		}),
		merge: (current, next) => ({
			...current,
			sourceContexts: {
				page: deduplicateBy(
					[...current.sourceContexts.page, ...next.page],
					(value) => value.attestationId,
				),
				continueCursor: next.continueCursor,
				isDone: next.isDone,
			},
		}),
		failureMessage: "Source Contexts could not be loaded.",
	},
	Shadow: {
		continuation: (note) => ({
			cursor: note.references.continueCursor,
			isDone: note.references.isDone,
		}),
		sameTarget: (current, next) =>
			next.target.shadowId === current.target.shadowId,
		seedKey: (note) => JSON.stringify(note.references),
		rebase: (current, latest) => ({
			...latest,
			references: current.references,
		}),
		merge: (current, next) => ({
			...current,
			references: {
				page: mergeReferrers([
					...current.references.page,
					...next.page,
				]),
				continueCursor: next.continueCursor,
				isDone: next.isDone,
			},
		}),
		failureMessage: "Shadow references could not be loaded.",
	},
	Surface: {
		continuation: (note) => ({
			cursor: note.continueCursor,
			isDone: note.isDone,
		}),
		sameTarget: (current, next) =>
			next.target.language === current.target.language &&
			next.target.normalizedSurface === current.target.normalizedSurface,
		// Ids suffice: an analysis is projected from its Surface and Lemma
		// rows alone, and Dumdict only ever creates those, never patches them.
		seedKey: (note) =>
			JSON.stringify([
				note.analyses.map(({ analysisKey }) => analysisKey),
				note.continueCursor,
				note.isDone,
			]),
		rebase: (current, latest) => ({
			...latest,
			analyses: current.analyses,
			continueCursor: current.continueCursor,
			isDone: current.isDone,
		}),
		merge: (current, next) => ({
			...current,
			analyses: deduplicateBy(
				[...current.analyses, ...next.analyses],
				(value) => value.analysisKey,
			),
			continueCursor: next.continueCursor,
			isDone: next.isDone,
		}),
		failureMessage: "Surface analyses could not be loaded.",
	},
	Lemma: {
		continuation: (note) => ({
			cursor: note.connections.continueCursor,
			isDone: note.connections.isDone,
		}),
		sameTarget: (current, next) =>
			next.target.lemmaId === current.target.lemmaId,
		seedKey: (note) => JSON.stringify(note.connections),
		rebase: (current, latest) => ({
			...latest,
			connections: current.connections,
		}),
		merge: (current, next) => ({
			...current,
			connections: {
				surfaces: deduplicateBy(
					[...current.connections.surfaces, ...next.surfaces],
					(value) => value.surfaceId,
				),
				readings: deduplicateBy(
					[...current.connections.readings, ...next.readings],
					(value) => value.readingId,
				),
				sameWrittenForm: deduplicateBy(
					[
						...current.connections.sameWrittenForm,
						...next.sameWrittenForm,
					],
					(value) => value.lemmaId,
				),
				continueCursor: next.continueCursor,
				isDone: next.isDone,
			},
		}),
		failureMessage: "Route connections could not be loaded.",
	},
};

function paginationOf<Note extends PaginatedNote>(
	note: Note,
): Pagination<Note> {
	// TypeScript cannot relate a generic Note to the entry its own `kind`
	// selects (correlated unions, microsoft/TypeScript#47109). Each entry is
	// checked against its kind above, so this is the module's one cast.
	return PAGINATION[note.kind] as unknown as Pagination<Note>;
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
