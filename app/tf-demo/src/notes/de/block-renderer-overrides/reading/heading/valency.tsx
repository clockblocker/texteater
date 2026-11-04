import type { ReadingDefaultRenderer } from "../../../../universal/blocks/renderer";
import { ValencyHeading } from "../../../block-renderers/reading/valency/valency-heading";

/** A valent Reading's heading: its emoji and its German Valency Line. */
export const renderHeadingDeValent = ((context) => (
	<ValencyHeading context={context} />
)) satisfies ReadingDefaultRenderer;
