import type { GrammaticalDefaultRenderer } from "../../../universal/blocks/renderer";
import { AttestationHeading } from "../../../universal/blocks/renderers/attestation/heading/default";
import { valencyLineText } from "../../block-renderers/reading/valency/valency-line";
import { germanSurfaceLine } from "../../surface-line";

/**
 * A German Attestation's heading. Its caption names the Surface by the
 * slotted line of the Reading it resolved to (#1293): `split form of jD
 * mit jM zu tun hatte`.
 */
export const renderHeadingDeAttestation = ((context) => (
	<AttestationHeading
		context={context}
		surfaceTitle={valencyLineText(
			germanSurfaceLine(
				context.noteData.presented.surface,
				context.noteData.reading.valency,
			),
		)}
	/>
)) satisfies GrammaticalDefaultRenderer<"Attestation">;
