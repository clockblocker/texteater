import { useQuery } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import { registeredBlockMap } from "@/notes/renderer-registry";
import { ReadingHeader } from "@/notes/universal/blocks/renderers/reading/header/default";
import type { ReadingPresentationCapabilities } from "@/notes/universal/note/capabilities";
import type { NoteData } from "@/notes/universal/note/data";
import { describeNote } from "@/notes/universal/note/data";
import { defaultNoteBlockLayout } from "@/notes/universal/note/layout";
import {
	defaultCapabilities,
	renderUniversalNote,
} from "@/notes/universal/note/render";
import type { WorkspaceTarget } from "@/workspace/sheet-workspace";
import { nounHeadingArticle } from "../../../../shared/grammatical-gender";
import type { PlaygroundSnapshot } from "../../../../tooling/playground-snapshot";
import { playgroundNotesQuery } from "../playground-note";
import { type DummyNote, type NoteLink, noteId, sourceOf } from "./dummy";

/**
 * A ported Note: a dummy Note whose `fixture` names a Note in the fake db
 * renders the real renderers instead of the dummy Blocks. Its Header Block
 * is lifted out of the Blocks and drawn in the deck's Heading, which is
 * the Note's handle; everything the real Note links to opens as a dummy
 * Note of the same word, so the deck's algebra is untouched.
 */

type ReadingNote = Extract<NoteData, { kind: "Reading" }>;

const FixtureContext = createContext<PlaygroundSnapshot | null>(null);

export function FixtureNotesProvider({ children }: { children: ReactNode }) {
	const snapshot = useQuery(playgroundNotesQuery);
	return (
		<FixtureContext.Provider value={snapshot.data ?? null}>
			{children}
		</FixtureContext.Provider>
	);
}

/**
 * The fixture behind a ported Reading, or null while the fake db loads or
 * when the Note is not ported. The fixtures carry no noun genders yet; the
 * port gives its noun one, so the Heading shows an article to follow.
 */
export function usePortedReading(note: DummyNote | null): ReadingNote | null {
	const snapshot = useContext(FixtureContext);
	const form = note?.fixture;
	return useMemo(() => {
		const data = form
			? Object.values(snapshot?.notes ?? {}).find(
					(candidate) =>
						candidate.kind === "Reading" &&
						candidate.reading.lemma.canonicalForm === form,
				)
			: undefined;
		if (data?.kind !== "Reading") return null;
		const { lemma } = data.reading;
		/* the spread loses which Lemma kind this is; it is the same one */
		return {
			...data,
			reading: {
				...data.reading,
				lemma: {
					...lemma,
					coreFeatures: { ...lemma.coreFeatures, gender: "Fem" },
				},
			},
		} as ReadingNote;
	}, [snapshot, form]);
}

/** Every link of a ported Note, as the deck's own: a Note of the word, or its source. */
export function usePortedFollow(
	word: string,
	onFollow: (link: NoteLink) => void,
): {
	follow: (target: WorkspaceTarget) => void;
	article: (article: string) => void;
} {
	const snapshot = useContext(FixtureContext);
	return {
		follow: (target) => {
			const link = linkFor(snapshot, target, word);
			if (link) onFollow(link);
		},
		article: (article) =>
			onFollow({
				kind: "Note",
				noteId: noteId("Reading", article),
				label: `Reading of ${article}`,
			}),
	};
}

function linkFor(
	snapshot: PlaygroundSnapshot | null,
	target: WorkspaceTarget,
	word: string,
): NoteLink | null {
	switch (target.kind) {
		case "Text":
		case "Attestation":
			return target.kind === "Text"
				? sourceOf(word)
				: {
						kind: "Note",
						noteId: noteId("Attestation", word),
						label: `Attestation of ${word}`,
					};
		case "Surface":
			return {
				kind: "Note",
				noteId: noteId("Surface", target.normalizedSurface),
				label: `Surface ${target.normalizedSurface}`,
			};
		case "Lemma":
		case "Reading":
		case "Shadow": {
			const id =
				target.kind === "Lemma"
					? target.lemmaId
					: target.kind === "Reading"
						? target.readingId
						: target.shadowId;
			const form =
				canonicalFormOf(snapshot?.notes[`${target.kind}:${id}`]) ??
				word;
			const kind = target.kind === "Lemma" ? "Lemma" : "Reading";
			return {
				kind: "Note",
				noteId: noteId(kind, form),
				label: `${kind} ${form}`,
			};
		}
		default:
			return null;
	}
}

/** The shallowest `canonicalForm` in a Note: its own, not a relation's. */
function canonicalFormOf(note: unknown): string | null {
	let level: unknown[] = [note];
	for (let depth = 0; depth < 4 && level.length; depth++) {
		const next: unknown[] = [];
		for (const value of level) {
			if (!value || typeof value !== "object") continue;
			const record = value as Record<string, unknown>;
			if (typeof record.canonicalForm === "string")
				return record.canonicalForm;
			next.push(...Object.values(record));
		}
		level = next;
	}
	return null;
}

function capabilitiesOf(
	note: ReadingNote,
	presentation: "Card" | "Sheet",
	follow: ReturnType<typeof usePortedFollow>,
): ReadingPresentationCapabilities {
	return {
		...(defaultCapabilities(note) as ReadingPresentationCapabilities),
		presentation,
		follow: follow.follow,
		nounArticle: {
			follow: () => {
				const article = nounHeadingArticle(note.reading.lemma);
				if (article) follow.article(article);
			},
			pending: false,
			error: null,
		},
	};
}

/** The real Reading Header, drawn in the deck's Heading. */
export function PortedTitle({
	note,
	presentation,
	follow,
}: {
	note: ReadingNote;
	presentation: "Card" | "Sheet";
	follow: ReturnType<typeof usePortedFollow>;
}) {
	return (
		<ReadingHeader
			note={note}
			capabilities={capabilitiesOf(note, presentation, follow)}
		/>
	);
}

/** Every Block but the Header, as the Notes page renders them. */
export function PortedBlocks({
	note,
	presentation,
	follow,
}: {
	note: ReadingNote;
	presentation: "Card" | "Sheet";
	follow: ReturnType<typeof usePortedFollow>;
}) {
	const registry = registeredBlockMap(describeNote(note).coordinates);
	const layout = defaultNoteBlockLayout(
		Object.keys(registry ?? {}) as Parameters<
			typeof defaultNoteBlockLayout
		>[0],
	);
	return renderUniversalNote({
		noteData: note,
		capabilities: capabilitiesOf(note, presentation, follow),
		layout: { ...layout, hidden: new Set(["Header"]) },
		registryFor: registeredBlockMap,
	});
}
