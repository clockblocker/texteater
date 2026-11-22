import { LinkButton, NoteList, NoteSection } from "lego";

import { formatLemmaClassLine } from "../../../../caption/metadata";
import { citationText } from "../../../citation";
import type { GrammaticalDefaultRenderer } from "../../../renderer";
import { featureSummary } from "../../common/feature-values";
import { RouteAside } from "../../common/features";
import { RouteMark } from "../../common/route-mark";

/**
 * The hops from this attested form to its Reading. The Lemma is named but
 * not linked: the projection carries no Lemma identity, only the Surface's.
 */
export const renderDefaultAttestationRoutes = (({
	noteData,
	PresentationCapabilities,
	Citation,
}) => {
	const { surface } = noteData.presented;
	const inflection = featureSummary(surface.inflectionalFeatures);
	const spelling =
		surface.spelling.kind === "Canonical"
			? null
			: `Variant: ${surface.spelling.variantTags.join(", ")}`;
	return (
		<NoteSection label="Route">
			<NoteList>
				<li>
					<LinkButton
						onClick={() =>
							PresentationCapabilities.follow(
								noteData.surfaceTarget,
							)
						}
					>
						<RouteMark hop="leadsTo" />
						{surface.normalizedSurface}
					</LinkButton>
					{spelling ||
					inflection ||
					surface.surfaceFeatures.historicalStatus ? (
						<RouteAside>
							{[
								spelling,
								inflection,
								surface.surfaceFeatures.historicalStatus,
							]
								.filter(Boolean)
								.join(" · ")}
						</RouteAside>
					) : null}
				</li>
				<li>
					<LinkButton
						onClick={() =>
							PresentationCapabilities.follow(
								noteData.reading.target,
							)
						}
					>
						<RouteMark hop="leadsTo" />
						<span
							aria-hidden="true"
							className="me-[0.35em] text-ink"
						>
							{noteData.reading.emojiDescription}
						</span>
						{citationText(
							Citation({
								...noteData.reading,
								lemma: surface.lemma,
							}),
						)}
					</LinkButton>
					<RouteAside>
						{formatLemmaClassLine(
							surface.lemma.family,
							surface.lemma.kind,
						)}
					</RouteAside>
				</li>
			</NoteList>
		</NoteSection>
	);
}) satisfies GrammaticalDefaultRenderer<"Attestation">;
