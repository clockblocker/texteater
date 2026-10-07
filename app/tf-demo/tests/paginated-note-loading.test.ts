import { describe, expect, test } from "bun:test";

import {
	createPaginatedNoteLoader,
	type PaginatedNote,
} from "../src/views/paginated-note-loading";

type NoteFor<K extends PaginatedNote["kind"]> = Extract<
	PaginatedNote,
	{ readonly kind: K }
>;

/** Widens branded ids so they compare against string literals. */
function strings(values: readonly string[]): string[] {
	return [...values];
}

// Only the fields pagination reads are filled in; the rest of each Note body
// is irrelevant to the loader.
function fixture<K extends PaginatedNote["kind"]>(value: {
	readonly kind: K;
	readonly [field: string]: unknown;
}): NoteFor<K> {
	return value as unknown as NoteFor<K>;
}

function readingNote(
	attestationIds: readonly string[],
	continuation: { continueCursor: string; isDone: boolean },
	body = "first body",
) {
	return fixture({
		kind: "Reading",
		target: { kind: "Reading", readingId: "reading-1" },
		body,
		sourceContexts: {
			page: attestationIds.map((attestationId) => ({ attestationId })),
			...continuation,
		},
	});
}

describe("merging a page", () => {
	test("Reading Notes deduplicate Source Contexts by Attestation", async () => {
		const loader = createPaginatedNoteLoader(
			readingNote(["a-1", "a-2"], {
				continueCursor: "page-2",
				isDone: false,
			}),
			async (cursor) => {
				expect(cursor).toBe("page-2");
				return readingNote(["a-2", "a-3"], {
					continueCursor: "",
					isDone: true,
				}).sourceContexts;
			},
		);

		await loader.loadMore();

		expect(
			strings(
				loader
					.current()
					.note.sourceContexts.page.map(
						({ attestationId }) => attestationId,
					),
			),
		).toEqual(["a-1", "a-2", "a-3"]);
		expect(loader.current().hasMore).toBe(false);
	});

	test("Lemma Notes deduplicate each connection list by its own key", async () => {
		const lemma = fixture({
			kind: "Lemma",
			target: { kind: "Lemma", lemmaId: "lemma-1" },
			connections: {
				surfaces: [{ surfaceId: "s-1" }],
				readings: [{ readingId: "r-1" }],
				sameWrittenForm: [{ lemmaId: "l-1" }],
				continueCursor: "page-2",
				isDone: false,
			},
		});
		const page = fixture({
			kind: "Lemma",
			connections: {
				surfaces: [{ surfaceId: "s-1" }, { surfaceId: "s-2" }],
				readings: [{ readingId: "r-1" }, { readingId: "r-2" }],
				sameWrittenForm: [{ lemmaId: "l-1" }, { lemmaId: "l-2" }],
				continueCursor: "page-3",
				isDone: false,
			},
		}).connections;
		const loader = createPaginatedNoteLoader(lemma, async () => page);

		await loader.loadMore();

		const { connections } = loader.current().note;
		expect(
			strings(connections.surfaces.map(({ surfaceId }) => surfaceId)),
		).toEqual(["s-1", "s-2"]);
		expect(
			strings(connections.readings.map(({ readingId }) => readingId)),
		).toEqual(["r-1", "r-2"]);
		expect(
			strings(connections.sameWrittenForm.map(({ lemmaId }) => lemmaId)),
		).toEqual(["l-1", "l-2"]);
		expect(connections.continueCursor).toBe("page-3");
		expect(loader.current().hasMore).toBe(true);
	});

	test("Surface Notes deduplicate analyses by analysis key", async () => {
		const surface = fixture({
			kind: "Surface",
			target: {
				kind: "Surface",
				language: "de",
				normalizedSurface: "Bank",
			},
			analyses: [{ analysisKey: "noun" }],
			continueCursor: "page-2",
			isDone: false,
		});
		const loader = createPaginatedNoteLoader(surface, async () => ({
			analyses: fixture({
				kind: "Surface",
				analyses: [{ analysisKey: "noun" }, { analysisKey: "verb" }],
			}).analyses,
			continueCursor: "",
			isDone: true,
		}));

		await loader.loadMore();

		expect(
			strings(
				loader
					.current()
					.note.analyses.map(({ analysisKey }) => analysisKey),
			),
		).toEqual(["noun", "verb"]);
	});

	test("Shadow Notes merge referrers that share a Reading", async () => {
		const referrer = (locatorKey: string) => ({
			reading: { readingId: "reading-1" },
			pendingRelations: [{ locatorKey }],
			structuralReferences: [],
		});
		const shadow = fixture({
			kind: "Shadow",
			target: { kind: "Shadow", shadowId: "shadow-1" },
			references: {
				page: [referrer("one")],
				continueCursor: "page-2",
				isDone: false,
			},
		});
		const loader = createPaginatedNoteLoader(shadow, async () => ({
			...shadow.references,
			page: fixture({
				kind: "Shadow",
				references: { page: [referrer("two")] },
			}).references.page,
			continueCursor: "",
			isDone: true,
		}));

		await loader.loadMore();

		const page = loader.current().note.references.page;
		expect(page).toHaveLength(1);
		expect(
			page[0]?.pendingRelations.map(({ locatorKey }) => locatorKey),
		).toEqual(["one", "two"]);
	});
});

test("a refresh of the same subject takes the new body and keeps loaded pages", async () => {
	const first = readingNote(["a-1"], {
		continueCursor: "page-2",
		isDone: false,
	});
	const loader = createPaginatedNoteLoader(
		first,
		async () =>
			readingNote(["a-2"], { continueCursor: "", isDone: true })
				.sourceContexts,
	);
	await loader.loadMore();

	loader.refresh(
		readingNote(
			["a-1"],
			{ continueCursor: "page-2", isDone: false },
			"new",
		),
	);

	const { note, hasMore } = loader.current();
	expect((note as unknown as { body: string }).body).toBe("new");
	expect(
		strings(
			note.sourceContexts.page.map(({ attestationId }) => attestationId),
		),
	).toEqual(["a-1", "a-2"]);
	expect(hasMore).toBe(false);
});

test("a page that arrives after the Note was reseeded is dropped", async () => {
	let resolvePage: (page: unknown) => void = () => {};
	const first = readingNote(["a-1"], {
		continueCursor: "page-2",
		isDone: false,
	});
	const loader = createPaginatedNoteLoader(
		first,
		() =>
			new Promise((resolve) => {
				resolvePage = resolve as (page: unknown) => void;
			}),
	);
	const pending = loader.loadMore();
	expect(loader.current().isLoading).toBe(true);

	const reseeded = readingNote(["b-1"], {
		continueCursor: "other-page-2",
		isDone: false,
	});
	loader.refresh(reseeded);
	resolvePage(
		readingNote(["a-2"], { continueCursor: "", isDone: true })
			.sourceContexts,
	);
	await pending;

	expect(loader.current()).toEqual({
		note: reseeded,
		hasMore: true,
		isLoading: false,
		error: null,
	});
});

test("a failed page reports its kind's fallback message", async () => {
	const loader = createPaginatedNoteLoader(
		readingNote(["a-1"], { continueCursor: "page-2", isDone: false }),
		async () => {
			throw new Error("internal detail");
		},
	);

	await loader.loadMore();

	expect(loader.current().error).toBe("Source Contexts could not be loaded.");
	expect(loader.current().isLoading).toBe(false);
});
