import type { GrammaticalDefaultRenderer } from "../../../renderer";
import { FormationsSection } from "../../common/formations";

/** The stored words whose Constituents link to this Lemma (ADR 0050). */
export const renderDefaultLemmaFormations = (({
	noteData,
	PresentationCapabilities,
	Citation,
}) => (
	<FormationsSection
		formations={noteData.formations}
		follow={PresentationCapabilities.follow}
		cite={Citation}
	/>
)) satisfies GrammaticalDefaultRenderer<"Lemma">;
