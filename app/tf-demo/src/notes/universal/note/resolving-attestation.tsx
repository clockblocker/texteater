import {
	NoteFrame,
	NoteRouteRowsSkeleton,
	NoteSection,
	NoteTags,
	NoteTitle,
} from "lego";
import type { ReactElement } from "react";

import type { SourceSegment } from "../blocks/renderers/common/link-members";
import { RouteMark } from "../blocks/renderers/common/route-mark";
import { SourceQuote } from "../blocks/renderers/common/source-quote";
import { CaptionedHeading } from "../caption/heading-caption";
import { UnitTitle, type UnitTitlePart } from "../caption/unit-title";
import type { Caption } from "../caption/wording";

type ResolvingAttestation = {
	/** The clicked unit, as the stored Note's Heading will spell it. */
	readonly title: readonly UnitTitlePart[];
	/** What the words are to the next Card, once Grammar has read them. */
	readonly caption: Caption | null;
	readonly segments: readonly SourceSegment[];
	readonly memberSegmentIndices: readonly number[];
	/** The sentence's language. */
	readonly language: string;
	/** The Session ended without an occurrence: nothing is on its way any more. */
	readonly settled: boolean;
	readonly presentation: "Card" | "Sheet";
	/** Opens the source Scroll. */
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
		<CaptionedHeading
			presentation={input.presentation}
			title={
				<NoteTitle data-attestation-title="" lang={input.language}>
					<UnitTitle parts={input.title} />
				</NoteTitle>
			}
			caption={input.caption}
		/>
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
		<NoteFrame
			mode={input.presentation === "Card" ? "card" : "sheet"}
			underHeading={!heading}
			frameAs={heading ? "article" : "div"}
			data-note-presentation={input.presentation}
			data-note-kind="Attestation"
			frameLabel={heading ? "Attestation Note" : undefined}
			frameBusy={!input.settled}
		>
			{heading}
			<NoteSection label="Source">
				<SourceQuote
					segments={input.segments}
					memberSegmentIndices={input.memberSegmentIndices}
					language={input.language}
					origin={{ kind: "Scroll" }}
					follow={input.follow}
				/>
			</NoteSection>
			{input.settled ? null : (
				<NoteSection label="Route" aria-busy="true">
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
				<span>In text</span>
			</NoteTags>
		</NoteFrame>
	);
}
