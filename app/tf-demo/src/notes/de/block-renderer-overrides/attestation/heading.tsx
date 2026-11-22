import type { GrammaticalDefaultRenderer } from "../../../universal/blocks/renderer";
import { AttestationHeading } from "../../../universal/blocks/renderers/attestation/heading/default";
import { valencyLineText } from "../../block-renderers/reading/valency/valency-line";
import { germanSurfaceLine } from "../../surface-line";

/**
 * A German Attestation's heading. Its caption names the Surface cleanly
 * (base order plus `sich` for a lexical reflexive, without open valency
 * slots): `split form of mit zu tun hatte`, `form of sich erinnert`.
 */
export const renderHeadingDeAttestation = ((context) => (
	<AttestationHeading
		context={context}
		surfaceTitle={valencyLineText(
			germanSurfaceLine(
				context.noteData.presented.surface,
				context.noteData.reading,
			),
		)}
	/>
)) satisfies GrammaticalDefaultRenderer<"Attestation">;
