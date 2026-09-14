import { LinkButton, NoteTitle, NoteTitleRow } from "lego";

import type { GrammaticalDefaultRenderer } from "../../../renderer";
import { RouteMark } from "../../common/route-mark";

/**
 * An Attestation is the form exactly as it was met in a Text. The headword
 * is the attested spelling; the aside says what it was read as.
 */
export const renderDefaultAttestationHeader = (({
	noteData,
	PresentationCapabilities,
}) => {
	const attested = noteData.presented.members
		.map(({ attested }) => attested)
		.join(" ");
	const { surface } = noteData.presented;
	return (
		<header>
			<NoteTitleRow>
				<NoteTitle data-attestation-title="">{attested}</NoteTitle>
				<LinkButton
					tone="quiet"
					className="text-sm"
					aria-label={`Read as ${surface.lemma.canonicalForm}`}
					onClick={() =>
						PresentationCapabilities.follow(noteData.reading.target)
					}
				>
					<RouteMark hop="leadsTo" className="mr-1.5 min-w-0" />
					<span
						className={
							attested === surface.lemma.canonicalForm
								? "text-ink"
								: "mr-[0.35em] text-ink"
						}
					>
						{noteData.reading.emojiDescription}
					</span>
					{attested === surface.lemma.canonicalForm
						? null
						: surface.lemma.canonicalForm}
				</LinkButton>
			</NoteTitleRow>
		</header>
	);
}) satisfies GrammaticalDefaultRenderer<"Attestation">;
