import {
	NoteBone,
	NoteLinesSkeleton,
	NoteQuoteSkeleton,
	NoteRouteRowsSkeleton,
	NoteRule,
	NoteSection,
	NoteSectionSkeleton,
	NoteSkeleton,
	NoteTagsSkeleton,
	NoteTitleSkeleton,
} from "lego";
import { LockIcon } from "lucide-react";

import { RelationMark } from "@/notes/universal/blocks/renderers/common/relation-mark";
import {
	type RouteHop,
	RouteMark,
} from "@/notes/universal/blocks/renderers/common/route-mark";

export type NoteSkeletonKind =
	| "Reading"
	| "Lemma"
	| "Surface"
	| "Attestation"
	| "Shadow";
type Presentation = "Card" | "Sheet";

/**
 * What a Note looks like while its data is still on the way. Each kind keeps
 * the blocks its loaded form will have, in the density its Presentation
 * gives it: a Card shows the first block only, a Sheet the whole route.
 */
export function renderNoteSkeleton(
	kind: NoteSkeletonKind,
	presentation: Presentation,
) {
	switch (kind) {
		case "Reading":
			return <ReadingNoteSkeleton presentation={presentation} />;
		case "Lemma":
			return <LemmaNoteSkeleton presentation={presentation} />;
		case "Surface":
			return <SurfaceNoteSkeleton presentation={presentation} />;
		case "Attestation":
			return <AttestationNoteSkeleton presentation={presentation} />;
		case "Shadow":
			return <ShadowNoteSkeleton presentation={presentation} />;
	}
}

function densityFor(presentation: Presentation) {
	return presentation === "Card" ? "compact" : "comfortable";
}

/** The hop a row will state, already known before its word is. */
function Hop({ hop }: { hop: RouteHop }) {
	return <RouteMark hop={hop} className="text-ink-faint" />;
}

export function ReadingNoteSkeleton({
	presentation,
}: {
	presentation: Presentation;
}) {
	const isCard = presentation === "Card";
	return (
		<NoteSkeleton
			density={densityFor(presentation)}
			label="Loading Reading Note"
		>
			<NoteTitleSkeleton>
				<NoteBone className="mr-[0.35em] h-[0.9em] w-[1em] rounded-[0.3em]" />
				<NoteBone tone="headword" className="h-[0.8em] w-28" />
			</NoteTitleSkeleton>
			<NoteSection className="compact:before:hidden">
				<NoteRule className="mb-3" />
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

export function LemmaNoteSkeleton({
	presentation,
}: {
	presentation: Presentation;
}) {
	const isCard = presentation === "Card";
	return (
		<NoteSkeleton
			density={densityFor(presentation)}
			label="Loading Lemma Note"
		>
			<NoteTitleSkeleton width="w-24" />
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

export function SurfaceNoteSkeleton({
	presentation,
}: {
	presentation: Presentation;
}) {
	const isCard = presentation === "Card";
	return (
		<NoteSkeleton
			density={densityFor(presentation)}
			label="Loading Surface Note"
		>
			<NoteTitleSkeleton width="w-32" />
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

export function AttestationNoteSkeleton({
	presentation,
}: {
	presentation: Presentation;
}) {
	const isCard = presentation === "Card";
	return (
		<NoteSkeleton
			density={densityFor(presentation)}
			label="Loading Attestation Note"
		>
			<NoteTitleSkeleton width="w-36" />
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

export function ShadowNoteSkeleton({
	presentation,
}: {
	presentation: Presentation;
}) {
	const isCard = presentation === "Card";
	return (
		<NoteSkeleton
			density={densityFor(presentation)}
			label="Loading Shadow Note"
		>
			<NoteTitleSkeleton className="opacity-70">
				<LockIcon
					aria-hidden="true"
					className="mr-2 inline size-[0.8em] align-middle text-ink-faint"
				/>
				<NoteBone tone="headword" className="h-[0.8em] w-24" />
			</NoteTitleSkeleton>
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
