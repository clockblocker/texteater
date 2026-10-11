import { describe, expect, test } from "bun:test";
import { germanText, wordsOf } from "@/fixtures";
import {
	initialState,
	type PromoteAction,
	type PromoteState,
	promote,
} from "./state";

const word = (text: string) => {
	const found = wordsOf(germanText).find(
		(candidate) => candidate.text === text,
	);
	if (!found) throw new Error(`no word ${text}`);
	return found;
};
const run = (...actions: PromoteAction[]): PromoteState =>
	actions.reduce(promote, initialState);
const click = (text: string): PromoteAction => ({
	type: "click",
	word: word(text),
	at: 0,
});

describe("promote", () => {
	test("peek → pane → sheet and back keeps one surface", () => {
		const peeked = run(click("ging"));
		const id = peeked.peek?.id;
		const sheeted = run(
			click("ging"),
			{ type: "pin" },
			{ type: "expand", from: "pane" },
		);
		expect(sheeted.sheet?.surface.id).toBe(id);
		expect(sheeted.pane).toBeNull();
		const back = promote(promote(sheeted, { type: "collapse" }), {
			type: "unpin",
		});
		expect(back.peek?.id).toBe(id);
		expect(back.pane).toBeNull();
		expect(back.sheet).toBeNull();
	});

	test("a following pane takes each click; a frozen one opens a peek", () => {
		const pinned = run(click("ging"), { type: "pin" });
		const followed = promote(pinned, click("Bank"));
		expect(followed.peek).toBeNull();
		expect(followed.pane?.lookup.wordId).toBe(word("Bank").id);
		expect(followed.pane?.id).toBe(pinned.pane?.id);

		const frozen = promote(
			promote(pinned, { type: "follow", follow: false }),
			click("Bank"),
		);
		expect(frozen.pane?.lookup.wordId).toBe(word("ging").id);
		expect(frozen.peek?.lookup.wordId).toBe(word("Bank").id);
	});

	test("Esc lets a peek go, then steps back from the sheet", () => {
		const state = run(
			click("ging"),
			{ type: "expand", from: "peek" },
			click("Bank"),
		);
		const once = promote(state, { type: "escape" });
		expect(once.peek).toBeNull();
		expect(once.sheet).not.toBeNull();
		const twice = promote(once, { type: "escape" });
		expect(twice.sheet).toBeNull();
		expect(twice.peek?.lookup.wordId).toBe(word("ging").id);
	});
});
