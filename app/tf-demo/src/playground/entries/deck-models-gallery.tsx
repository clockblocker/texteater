import { FlickModel } from "./deck-models/flick-model";

/**
 * The Flick answer to "what does closing mean" for decks, Cards and Sheets,
 * on dummy subjects. Benchmark flow: select a word, deal a deck, open one,
 * follow a link, return to the Text, select another word.
 */
export function DeckModelsGallery() {
	return <FlickModel />;
}
