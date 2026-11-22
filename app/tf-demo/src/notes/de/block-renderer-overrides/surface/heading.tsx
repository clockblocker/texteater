import type { NoteBlockRenderer } from "../../../universal/blocks/renderer";
import { SurfaceHeading } from "../../../universal/blocks/renderers/surface/heading/default";
import { ValencyLineView } from "../../block-renderers/reading/valency/valency-block";
import { germanSurfaceLine } from "../../surface-line";

/**
 * A German Surface's heading: its base-order form with any separable prefix
 * bar (`an|fängt`) and `sich` when the Reading the Deck leads to is
 * lexically reflexive (`sich erinnert`). Variable valency complements live
 * in the Reading's Valency Block, never here (ADR 0034, ADR 0056).
 */
export const renderHeadingDeSurface = ((context) => (
	<SurfaceHeading
		context={context}
		title={(active) => {
			if (!active) return context.noteData.target.normalizedSurface;
			const { activeReading } = context.noteData;
			const reading =
				activeReading && activeReading.lemmaId === active.lemmaId
					? activeReading
					: null;
			return (
				<ValencyLineView
					parts={germanSurfaceLine(active.presented, reading)}
				/>
			);
		}}
	/>
)) satisfies NoteBlockRenderer<"de", "Surface">;
