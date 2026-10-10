import {
	DensityScope,
	NoteRouteRowsSkeleton,
	NoteSection,
	NoteTags,
	NoteTitle,
	NoteTitleRow,
} from "lego";
import type { ReactElement } from "react";

import type { SourceSegment } from "../blocks/renderers/common/link-members";
import { RouteMark } from "../blocks/renderers/common/route-mark";
import { SourceQuote } from "../blocks/renderers/common/source-quote";

type ResolvingAttestation = {
	/** The clicked words, as the stored Note's Heading will spell them. */
	readonly attested: string;
	readonly segments: readonly SourceSegment[];
	readonly memberSegmentIndices: readonly number[];
	/** The Session ended without an occurrence: nothing is on its way any more. */
	readonly settled: boolean;
	readonly presentation: "Card" | "Sheet";
	/** Opens the source Text. */
	readonly follow: () => void;
};

/**
 * The Attestation Note of a running Resolution, split where a host places
 * it. The occurrence's words and sentence are known from the click; what
 * they were read as keeps its bones until the stored Note takes over at
 * commit. The Blocks are those of the stored Note, in its order.
 */
export function resolvingAttestationNoteParts(input: ResolvingAttestation) {
	const heading = (
		<header>
			<NoteTitleRow>
				<NoteTitle data-attestation-title="">
					{input.attested}
				</NoteTitle>
			</NoteTitleRow>
		</header>
	);
	return {
		heading,
		body: <ResolvingAttestationBody input={input} heading={null} />,
		note: <ResolvingAttestationBody input={input} heading={heading} />,
	};
}

function ResolvingAttestationBody({
	input,
	heading,
}: {
	readonly input: ResolvingAttestation;
	readonly heading: ReactElement | null;
}) {
	return (
		<DensityScope
			density={input.presentation === "Card" ? "compact" : "comfortable"}
			data-note-presentation={input.presentation}
			data-note-kind="Attestation"
			className="min-h-full bg-paper text-base text-ink compact:text-sm"
		>
			<article
				className="mx-auto w-full max-w-note px-note-gutter pt-note-top pb-note-top compact:p-3.5"
				aria-label="Attestation Note"
				aria-busy={input.settled ? undefined : true}
			>
				{heading}
				<NoteSection
					aria-label="Source"
					label="Source"
					className="compact:before:hidden"
				>
					<SourceQuote
						segments={input.segments}
						memberSegmentIndices={input.memberSegmentIndices}
						origin={{ kind: "Text" }}
						follow={input.follow}
					/>
				</NoteSection>
				{input.settled ? null : (
					<NoteSection
						aria-label="Route"
						label="Route"
						aria-busy="true"
					>
						<NoteRouteRowsSkeleton
							mark={
								<RouteMark
									hop="leadsTo"
									className="text-ink-faint"
								/>
							}
							widths={["w-36", "w-28"]}
						/>
					</NoteSection>
				)}
				<NoteTags>
					<span>de</span>
					<span>Attestation</span>
				</NoteTags>
			</article>
		</DensityScope>
	);
}
