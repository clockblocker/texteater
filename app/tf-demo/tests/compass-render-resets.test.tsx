import "./support/dom";
import { expect, test } from "bun:test";
import { act, fireEvent, render } from "@testing-library/react";
import { useLayoutEffect, useRef } from "react";
import { ContextsBlock } from "../src/workspace/compass/deck-models/blocks";
import type { DummyNote } from "../src/workspace/compass/deck-models/dummy";
import { useFolded } from "../src/workspace/compass/heading";
import type { Form } from "../src/workspace/compass/subject";
import { CONTEXT_PAGE } from "../src/workspace/motion/motion-spec";

/*
 * #985's two prop-driven resets, which run during render rather than in an
 * effect. An unwatched Cover's `folded` is visible on the render that
 * unwatches it, so that test also fails for an effect. A Card shows the same
 * two Source Contexts whatever `shown` holds, so the leave-Sheet reset shows
 * only once the Card is a Sheet again.
 */

/** A Cover's section and its scroller, recording `folded` at every commit. */
function FoldProbe({
	watching,
	commits,
}: {
	watching: boolean;
	commits: { watching: boolean; folded: boolean }[];
}) {
	const section = useRef<HTMLElement>(null);
	const folded = useFolded(section, watching);
	useLayoutEffect(() => {
		commits.push({ watching, folded });
	});
	return (
		<section ref={section}>
			<div data-scroller="" />
		</section>
	);
}

test("an unwatched Cover reports unfolded on the render that unwatches it", () => {
	const commits: { watching: boolean; folded: boolean }[] = [];
	const view = render(<FoldProbe watching commits={commits} />);
	const scroller =
		view.container.querySelector<HTMLElement>("[data-scroller]");
	if (!scroller) throw new Error("The probe renders a scroller.");

	scroller.scrollTop = 100;
	act(() => {
		fireEvent.scroll(scroller);
	});
	expect(commits.at(-1)).toEqual({ watching: true, folded: true });

	commits.length = 0;
	view.rerender(<FoldProbe watching={false} commits={commits} />);
	expect(commits).toEqual([{ watching: false, folded: false }]);
});

const noop = () => {};

/** A Reading Note with two pages of Source Contexts. */
const note: DummyNote = {
	id: "reading-haus",
	kind: "Reading",
	word: "haus",
	title: "Haus",
	lines: [],
	links: [],
	tail: { form: "Reading", gloss: "house" },
	contexts: Array.from({ length: 2 * CONTEXT_PAGE }, (_, sentence) => ({
		textId: null,
		sentence,
		words: ["Das", "Haus", String(sentence)],
	})),
};

function contexts(form: Form) {
	return (
		<ContextsBlock
			note={note}
			form={form}
			litWord={null}
			onSegment={noop}
			onSegmentDown={noop}
		/>
	);
}

test("a Sheet folded back to a Card forgets the Source Context pages it loaded", () => {
	const view = render(contexts("sheet"));
	const loadMore = `Load ${CONTEXT_PAGE.toString()} more`;
	fireEvent.click(view.getByRole("button", { name: loadMore }));
	expect(view.queryByRole("button", { name: loadMore })).toBeNull();

	view.rerender(contexts("card"));
	view.rerender(contexts("sheet"));
	expect(view.getByRole("button", { name: loadMore })).toBeDefined();
});
