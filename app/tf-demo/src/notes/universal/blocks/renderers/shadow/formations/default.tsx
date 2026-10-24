import type { GrammaticalDefaultRenderer } from "../../../renderer";
import { FormationsSection } from "../../common/formations";

/**
 * A pending base's Formations (ADR 0050): the Shadow Note carries them until
 * the base's Lemma is stored, which then lists the same words.
 */
export const renderDefaultShadowFormations = (({
	noteData,
	PresentationCapabilities,
}) => (
	<FormationsSection
		formations={noteData.formations}
		follow={PresentationCapabilities.follow}
	/>
)) satisfies GrammaticalDefaultRenderer<"Shadow">;
