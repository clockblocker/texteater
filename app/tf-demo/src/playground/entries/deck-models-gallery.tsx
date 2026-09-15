import { CompassModel } from "./deck-models/drag-deck";

/**
 * Compass: what a drag means for a deck of Cards on dummy subjects. The first
 * direction of the gesture names the intent; a held gesture relaxes into a
 * plain drag with drop zones.
 */
export function DeckModelsGallery() {
	return <CompassModel />;
}
