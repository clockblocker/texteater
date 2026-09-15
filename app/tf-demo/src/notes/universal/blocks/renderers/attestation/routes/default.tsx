import { LinkButton, NoteSection } from "lego";

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
}) => {
	const { surface } = noteData.presented;
	const inflection = featureSummary(surface.inflectionalFeatures);
	const spelling = surface.spelling === "Canonical" ? null : surface.spelling;
	return (
		<NoteSection aria-label="Route" label="Route">
			<ul className="grid gap-2">
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
						<span className="me-[0.35em] text-ink">
							{noteData.reading.emojiDescription}
						</span>
						{surface.lemma.canonicalForm}
					</LinkButton>
					<RouteAside>
						{surface.lemma.family} · {surface.lemma.kind}
					</RouteAside>
				</li>
			</ul>
		</NoteSection>
	);
}) satisfies GrammaticalDefaultRenderer<"Attestation">;
