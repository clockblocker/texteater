import type { NoteBlockRenderer } from "../../../universal/blocks/renderer";
import { SurfaceHeading } from "../../../universal/blocks/renderers/surface/heading/default";
import { germanSurfaceLine } from "../../surface-line";
import { ValencyLineView } from "../reading/heading/valency";

/**
 * A German Surface's heading: its slotted line, `jD mit jM zu tun hatte`,
 * when the Reading the Deck leads to is a Reading of the active analysis's
 * Lemma (#1293). Without that Reading in context it prints the stored
 * form.
 */
export const renderHeadingDeSurface = ((context) => (
	<SurfaceHeading
		context={context}
		title={(active) => {
			const { activeReading } = context.noteData;
			if (
				!active ||
				!activeReading ||
				activeReading.lemmaId !== active.lemmaId
			)
				return context.noteData.target.normalizedSurface;
			return (
				<ValencyLineView
					parts={germanSurfaceLine(
						active.presented,
						activeReading.valency,
					)}
				/>
			);
		}}
	/>
)) satisfies NoteBlockRenderer<"de", "Surface">;
