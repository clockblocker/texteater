import {
	NoteBone,
	NoteLinesSkeleton,
	NoteQuoteSkeleton,
	NoteRouteRowsSkeleton,
	NoteSection,
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
 * What a Note looks like while its data is still on the way. Each kind keeps
 * the blocks its loaded form will have, in the density its Presentation
 * gives it: a Card shows the first block only, a Sheet the whole route.
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
	const isCard = presentation === "Card";
	return (
		<NoteSkeleton
			density={densityFor(presentation)}
			label="Loading Reading Note"
		>
			{part === "Note" ? (
				<NoteTitleSkeleton>
					<NoteBone className="me-[0.35em] h-[0.9em] w-[1em] rounded-[0.3em]" />
					<NoteBone tone="headword" className="h-[0.8em] w-28" />
				</NoteTitleSkeleton>
			) : null}
			<NoteSection label="">
				<NoteLinesSkeleton
					className="px-2"
					widths={
						isCard
							? ["w-full", "w-2/3"]
							: ["w-full", "w-11/12", "w-1/2"]
					}
				/>
			</NoteSection>
			{isCard ? null : (
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
			)}
			<NoteSectionSkeleton className="compact:before:hidden">
				<div className="grid gap-5 compact:gap-3">
					<NoteQuoteSkeleton />
					{isCard ? null : (
						<NoteQuoteSkeleton
							widths={["w-full", "w-5/6", "w-2/5"]}
						/>
					)}
				</div>
			</NoteSectionSkeleton>
			<NoteTagsSkeleton count={4} />
		</NoteSkeleton>
	);
}

function LemmaNoteSkeleton({ presentation, part }: SkeletonProps) {
	const isCard = presentation === "Card";
	return (
		<NoteSkeleton
			density={densityFor(presentation)}
			label="Loading Lemma Note"
		>
			{part === "Note" ? <NoteTitleSkeleton width="w-24" /> : null}
			<NoteSectionSkeleton>
				<NoteRouteRowsSkeleton
					mark={<Hop hop="leadsTo" />}
					widths={isCard ? ["w-36"] : ["w-36", "w-28"]}
				/>
			</NoteSectionSkeleton>
			{isCard ? null : (
				<NoteSectionSkeleton>
					<NoteRouteRowsSkeleton
						mark={<Hop hop="reachedFrom" />}
						widths={["w-20", "w-24", "w-16"]}
						className="flex flex-wrap gap-x-5 gap-y-2"
					/>
				</NoteSectionSkeleton>
			)}
			<NoteTagsSkeleton count={3} />
		</NoteSkeleton>
	);
}

function SurfaceNoteSkeleton({ presentation, part }: SkeletonProps) {
	const isCard = presentation === "Card";
	return (
		<NoteSkeleton
			density={densityFor(presentation)}
			label="Loading Surface Note"
		>
			{part === "Note" ? <NoteTitleSkeleton width="w-32" /> : null}
			<NoteSectionSkeleton>
				<NoteRouteRowsSkeleton
					mark={<Hop hop="leadsTo" />}
					widths={isCard ? ["w-40"] : ["w-40", "w-32"]}
				/>
			</NoteSectionSkeleton>
			<NoteTagsSkeleton count={2} />
		</NoteSkeleton>
	);
}

function AttestationNoteSkeleton({ presentation, part }: SkeletonProps) {
	const isCard = presentation === "Card";
	return (
		<NoteSkeleton
			density={densityFor(presentation)}
			label="Loading Attestation Note"
		>
			{part === "Note" ? <NoteTitleSkeleton width="w-36" /> : null}
			<NoteSectionSkeleton className="compact:before:hidden">
				<NoteQuoteSkeleton
					widths={
						isCard
							? ["w-full", "w-3/5"]
							: ["w-full", "w-full", "w-2/5"]
					}
				/>
			</NoteSectionSkeleton>
			{isCard ? null : (
				<NoteSectionSkeleton>
					<NoteRouteRowsSkeleton
						mark={<Hop hop="leadsTo" />}
						widths={["w-40"]}
					/>
				</NoteSectionSkeleton>
			)}
			<NoteTagsSkeleton count={2} />
		</NoteSkeleton>
	);
}

function ShadowNoteSkeleton({ presentation, part }: SkeletonProps) {
	const isCard = presentation === "Card";
	return (
		<NoteSkeleton
			density={densityFor(presentation)}
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
					widths={isCard ? ["w-32"] : ["w-32", "w-28"]}
				/>
			</NoteSectionSkeleton>
			{isCard ? null : (
				<NoteSectionSkeleton>
					<NoteRouteRowsSkeleton
						mark={<Hop hop="candidate" />}
						widths={["w-24"]}
					/>
				</NoteSectionSkeleton>
			)}
			<NoteTagsSkeleton count={4} />
		</NoteSkeleton>
	);
}
