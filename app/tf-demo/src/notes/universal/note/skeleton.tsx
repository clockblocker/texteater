import {
	NoteBone,
	NoteLinesSkeleton,
	NoteList,
	NoteMorphReveal,
	NoteQuoteSkeleton,
	NoteRouteRowsSkeleton,
	NoteSectionSkeleton,
	NoteSkeleton,
	NoteTagsSkeleton,
	NoteTitleSkeleton,
} from "lego";
import { LockIcon } from "lucide-react";

import { RelationMark } from "../blocks/renderers/common/relation-mark";
import {
	type RouteHop,
	RouteMark,
} from "../blocks/renderers/common/route-mark";

type NoteSkeletonKind =
	| "Reading"
	| "Lemma"
	| "Surface"
	| "Attestation"
	| "Shadow";
type Presentation = "Card" | "Sheet";
/** The whole Note, or its Body alone when the host already draws the Heading. */
export type NoteSkeletonPart = "Note" | "Body";
type SkeletonProps = {
	presentation: Presentation;
	part: NoteSkeletonPart;
};

/**
 * What a Note looks like while its data is still on the way. Each kind uses
 * one unified skeleton tree across Card and Sheet forms: primary blocks stay
 * anchored in both, while secondary blocks fold smoothly via `visibility="sheet"`.
 */
export function NoteSkeletonFor({
	kind,
	presentation,
	part = "Note",
}: {
	kind: NoteSkeletonKind;
	presentation: Presentation;
	part?: NoteSkeletonPart;
}) {
	const props = { presentation, part };
	switch (kind) {
		case "Reading":
			return <ReadingNoteSkeleton {...props} />;
		case "Lemma":
			return <LemmaNoteSkeleton {...props} />;
		case "Surface":
			return <SurfaceNoteSkeleton {...props} />;
		case "Attestation":
			return <AttestationNoteSkeleton {...props} />;
		case "Shadow":
			return <ShadowNoteSkeleton {...props} />;
	}
}

function densityFor(presentation: Presentation) {
	return presentation === "Card" ? "compact" : "comfortable";
}

/** The hop a row will state, already known before its word is. */
function Hop({ hop }: { hop: RouteHop }) {
	return <RouteMark hop={hop} className="text-ink-faint" />;
}

function ReadingNoteSkeleton({ presentation, part }: SkeletonProps) {
	return (
		<NoteSkeleton
			density={densityFor(presentation)}
			underHeading={part === "Body"}
			label="Loading Reading Note"
		>
			{part === "Note" ? (
				<NoteTitleSkeleton>
					<NoteBone className="me-[0.35em] h-[0.9em] w-[1em] rounded-[0.3em]" />
					<NoteBone tone="headword" className="h-[0.8em] w-28" />
				</NoteTitleSkeleton>
			) : null}
			<NoteSectionSkeleton>
				<NoteList as="div" gap="loose">
					<NoteQuoteSkeleton />
					<NoteMorphReveal visibility="sheet">
						<NoteQuoteSkeleton
							widths={["w-full", "w-5/6", "w-2/5"]}
						/>
					</NoteMorphReveal>
				</NoteList>
			</NoteSectionSkeleton>
			<NoteSectionSkeleton>
				<NoteRouteRowsSkeleton
					mark={
						<RelationMark
							relation="nearSynonym"
							className="text-ink-faint"
						/>
					}
					widths={["w-24", "w-32"]}
				/>
			</NoteSectionSkeleton>
			<NoteSectionSkeleton>
				<NoteLinesSkeleton
					className="max-w-[36rem] leading-relaxed"
					widths={["w-full", "w-1/2"]}
				/>
			</NoteSectionSkeleton>
			<NoteTagsSkeleton count={3} />
		</NoteSkeleton>
	);
}

function LemmaNoteSkeleton({ presentation, part }: SkeletonProps) {
	return (
		<NoteSkeleton
			density={densityFor(presentation)}
			underHeading={part === "Body"}
			label="Loading Lemma Note"
		>
			{part === "Note" ? <NoteTitleSkeleton width="w-24" /> : null}
			<NoteSectionSkeleton>
				<NoteRouteRowsSkeleton
					mark={<Hop hop="leadsTo" />}
					widths={["w-36", "w-28"]}
				/>
			</NoteSectionSkeleton>
			<NoteSectionSkeleton visibility="sheet">
				<NoteRouteRowsSkeleton
					mark={<Hop hop="reachedFrom" />}
					widths={["w-20", "w-24", "w-16"]}
					layout="wrap"
				/>
			</NoteSectionSkeleton>
			<NoteTagsSkeleton count={3} />
		</NoteSkeleton>
	);
}

function SurfaceNoteSkeleton({ presentation, part }: SkeletonProps) {
	return (
		<NoteSkeleton
			density={densityFor(presentation)}
			underHeading={part === "Body"}
			label="Loading Surface Note"
		>
			{part === "Note" ? <NoteTitleSkeleton width="w-32" /> : null}
			<NoteSectionSkeleton>
				<NoteRouteRowsSkeleton
					mark={<Hop hop="leadsTo" />}
					widths={["w-40", "w-32"]}
				/>
			</NoteSectionSkeleton>
			<NoteTagsSkeleton count={2} />
		</NoteSkeleton>
	);
}

function AttestationNoteSkeleton({ presentation, part }: SkeletonProps) {
	return (
		<NoteSkeleton
			density={densityFor(presentation)}
			underHeading={part === "Body"}
			label="Loading Attestation Note"
		>
			{part === "Note" ? <NoteTitleSkeleton width="w-36" /> : null}
			<NoteSectionSkeleton>
				<NoteQuoteSkeleton widths={["w-full", "w-4/5"]} />
			</NoteSectionSkeleton>
			<NoteSectionSkeleton visibility="sheet">
				<NoteRouteRowsSkeleton
					mark={<Hop hop="leadsTo" />}
					widths={["w-40"]}
				/>
			</NoteSectionSkeleton>
			<NoteTagsSkeleton count={2} />
		</NoteSkeleton>
	);
}

function ShadowNoteSkeleton({ presentation, part }: SkeletonProps) {
	return (
		<NoteSkeleton
			density={densityFor(presentation)}
			underHeading={part === "Body"}
			label="Loading Shadow Note"
		>
			{part === "Note" ? (
				<NoteTitleSkeleton className="opacity-70">
					<LockIcon
						aria-hidden="true"
						className="me-2 inline size-[0.8em] align-middle text-ink-faint"
					/>
					<NoteBone tone="headword" className="h-[0.8em] w-24" />
				</NoteTitleSkeleton>
			) : null}
			<NoteSectionSkeleton>
				<NoteRouteRowsSkeleton
					mark={<Hop hop="reachedFrom" />}
					widths={["w-32", "w-28"]}
				/>
			</NoteSectionSkeleton>
			<NoteSectionSkeleton visibility="sheet">
				<NoteRouteRowsSkeleton
					mark={<Hop hop="candidate" />}
					widths={["w-24"]}
				/>
			</NoteSectionSkeleton>
			<NoteTagsSkeleton count={4} />
		</NoteSkeleton>
	);
}
