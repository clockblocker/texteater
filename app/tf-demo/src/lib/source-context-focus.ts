type ScrollTarget = {
	scrollIntoView(options?: ScrollIntoViewOptions): void;
};

/**
 * Brings the Sentence of a revealed occurrence into view. Its members wear
 * the selected rule like any clicked word; nothing flashes, and a word never
 * gets a background of its own.
 */
export function actuateSourceContextFocus(sentence: ScrollTarget): void {
	sentence.scrollIntoView({ block: "center", behavior: "auto" });
}
