import type { NoteSkeletonFor } from "@/notes";
import { CodexSkeleton } from "@/views/codex-view";
import { ScrollViewSkeleton } from "@/views/scroll-view";
import { applicationRenderer } from "@/workspace/application-renderer";
import {
	HeadingSkeleton,
	NotePartProvider,
	PlacedNoteSkeleton,
} from "@/workspace/note-part";
import {
	Stage,
	type StagedParts,
	StagedPresentation,
} from "./staged-presentation";

type NoteKind = Parameters<typeof NoteSkeletonFor>[0]["kind"];

const NOTE_KINDS: readonly NoteKind[] = [
	"Reading",
	"Lemma",
	"Surface",
	"Attestation",
	"Shadow",
];

/** A Sheet's chrome while its Note loads: there, and not yet to press. */
const WAITING = {
	back: { label: "Back", enabled: false, onPress: () => {} },
	clear: { label: "Close", enabled: false, onPress: () => {} },
};

/** The column every Note lays out in as a Sheet. */
const NOTE_COLUMN_REM = applicationRenderer.columnRem({
	kind: "Note",
	target: { kind: "Reading", readingId: "" },
});

/**
 * A Note of `kind` while it loads, rendered through `NotePartProvider` and
 * `PlacedNoteSkeleton` exactly as `applicationRenderer` and the Note views do.
 */
function loadingNote(kind: NoteKind): StagedParts {
	return {
		label: `Loading ${kind}`,
		columnRem: NOTE_COLUMN_REM,
		heading: {
			card: (
				<NotePartProvider value="heading">
					<PlacedNoteSkeleton kind={kind} presentation="Card" />
				</NotePartProvider>
			),
			cover: (
				<NotePartProvider value="heading">
					<PlacedNoteSkeleton kind={kind} presentation="Sheet" />
				</NotePartProvider>
			),
		},
		body: {
			card: (
				<NotePartProvider value="body">
					<PlacedNoteSkeleton kind={kind} presentation="Card" />
				</NotePartProvider>
			),
			sheet: (
				<NotePartProvider value="body">
					<PlacedNoteSkeleton kind={kind} presentation="Sheet" />
				</NotePartProvider>
			),
		},
	};
}

const LOADING_SCROLL: StagedParts = {
	label: "Loading Text",
	columnRem: applicationRenderer.columnRem({
		kind: "Scroll",
		target: { kind: "Scroll", scrollId: "" },
	}),
	heading: { card: <HeadingSkeleton />, cover: <HeadingSkeleton /> },
	body: { card: <ScrollViewSkeleton />, sheet: <ScrollViewSkeleton /> },
};

const LOADING_SECTION: StagedParts = {
	label: "Loading Section",
	columnRem: applicationRenderer.columnRem({
		kind: "Section",
		target: { kind: "Section", sectionId: "" },
	}),
	heading: { card: <HeadingSkeleton />, cover: <HeadingSkeleton /> },
	body: { card: <CodexSkeleton />, sheet: <CodexSkeleton /> },
};

/**
 * Every Note kind, Scroll and Section while its data is still on the way, in
 * the forms the app shows it in: a Card, a Card Tail and a Cover, each drawn
 * by the Presentation foundation and live skeleton components.
 */
export function LoadingGallery() {
	return (
		<div className="grid gap-10 p-6">
			{NOTE_KINDS.map((kind) => {
				const parts = loadingNote(kind);
				return (
					<section
						key={kind}
						aria-label={kind}
						className="flex flex-wrap items-start gap-8"
					>
						<div className="grid max-w-full gap-8">
							<Stage label={`${kind} · Card`}>
								<StagedPresentation form="card" parts={parts} />
							</Stage>
							<Stage label={`${kind} · Card Tail`}>
								<StagedPresentation
									form="tail-above"
									parts={parts}
								/>
							</Stage>
						</div>
						<Stage
							label={`${kind} · Cover`}
							className="min-w-0 flex-1"
						>
							<StagedPresentation
								form="cover"
								parts={parts}
								chrome={WAITING}
							/>
						</Stage>
					</section>
				);
			})}
			<Stage label="Scroll · Cover">
				<StagedPresentation
					form="cover"
					parts={LOADING_SCROLL}
					chrome={WAITING}
				/>
			</Stage>
			<Stage label="Section · Cover">
				<StagedPresentation
					form="cover"
					parts={LOADING_SECTION}
					chrome={WAITING}
				/>
			</Stage>
		</div>
	);
}
