import type { GrammaticalDefaultRenderer } from "../../universal/blocks/renderer";
import { AttestationHeading } from "../../universal/blocks/renderers/attestation/heading/default";

/** Hebrew preserves the encountered wording without German Surface projection. */
export const renderHebrewAttestationHeading = ((context) => (
	<AttestationHeading context={context} />
)) satisfies GrammaticalDefaultRenderer<"Attestation">;
