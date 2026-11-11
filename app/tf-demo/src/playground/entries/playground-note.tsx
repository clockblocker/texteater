import { renderFixtureNoteParts } from "@/notes";
import { PlainTitle } from "@/presentation/heading";
import { ScrollPresentation } from "@/views/scroll-view";
import { subjectLabel } from "@/views/subject-presentation";
import { applicationRenderer } from "@/workspace/application-renderer";
import type {
	NotePresentationContext,
	WorkspaceSubject,
	WorkspaceTarget,
} from "@/workspace/workspace-subject";
import { scrollTitle } from "../../../shared/scroll-title";
import type { PlaygroundSnapshot } from "../../../tooling/playground-snapshot";
import type { StagedParts } from "./staged-presentation";

/** The fake db, built by the Vite plugin; every playground reads the same one. */
export const playgroundNotesQuery = {
	queryKey: ["playground-notes"],
	queryFn: async (): Promise<PlaygroundSnapshot> => {
		const response = await fetch("/__playground/notes");
		if (!response.ok)
			throw new Error("Could not load playground fixtures.");
		return response.json();
	},
} as const;

function subjectFor(target: WorkspaceTarget): WorkspaceSubject {
	return target.kind === "Scroll"
		? { kind: "Scroll", target }
		: target.kind === "Section"
			? { kind: "Section", target }
			: ({ kind: "Note", target } as WorkspaceSubject);
}

/** The fake db's key for a Note target, or null for a target that is no Note. */
export function fixtureNoteKey(target: WorkspaceTarget): string | null {
	const id =
		target.kind === "Reading"
			? target.readingId
			: target.kind === "Lemma"
				? target.lemmaId
				: target.kind === "Surface"
					? target.normalizedSurface
					: target.kind === "Attestation"
						? target.attestationId
						: target.kind === "Shadow"
							? target.shadowId
							: null;
	return id ? `${target.kind}:${id}` : null;
}

/**
 * A fake db target as the parts a Presentation is drawn from: a Note's
 * Heading Block and its other Blocks from the Notes renderers, as the app
 * splits them, or a Scroll's title and its reader.
 */
export function playgroundParts({
	target,
	snapshot,
	follow,
	context,
}: {
	target: WorkspaceTarget;
	snapshot: PlaygroundSnapshot;
	follow: (target: WorkspaceTarget) => void;
	/** What the click that dealt a Note tells its Presentation. */
	context?: NotePresentationContext;
}): StagedParts {
	const subject = subjectFor(target);
	const shared = {
		label: subjectLabel(subject),
		columnRem: applicationRenderer.columnRem(subject),
	};
	if (target.kind === "Scroll") {
		const text = snapshot.scrolls[target.scrollId];
		const title = text ? (
			<PlainTitle>{scrollTitle(text)}</PlainTitle>
		) : null;
		const body = text ? (
			<ScrollPresentation
				sentences={text.sentences}
				selectedSegmentKey={null}
				onSegmentClick={async (sentence, index) => {
					const attestationId = sentence.segments.find(
						(segment) => segment.index === index,
					)?.attestationId;
					if (attestationId)
						follow({ kind: "Attestation", attestationId });
				}}
			/>
		) : (
			<p className="p-3.5 text-sm text-ink-muted">
				This Scroll is not part of the playground fixtures.
			</p>
		);
		return {
			...shared,
			heading: { card: title, cover: title },
			body: { card: body, sheet: body },
		};
	}
	const key = fixtureNoteKey(target);
	const noteData = key ? snapshot.notes[key] : null;
	if (!noteData) {
		const missing = (
			<p className="p-3.5 text-sm text-ink-muted">
				This target is not part of the playground fixtures.
			</p>
		);
		return {
			...shared,
			heading: { card: null, cover: null },
			body: { card: missing, sheet: missing },
		};
	}
	const card = renderFixtureNoteParts({
		noteData,
		presentation: "Card",
		follow,
		context,
	});
	const sheet = renderFixtureNoteParts({
		noteData,
		presentation: "Sheet",
		follow,
		context,
	});
	return {
		...shared,
		heading: { card: card.heading, cover: sheet.heading },
		body: { card: card.body, sheet: sheet.body },
	};
}
