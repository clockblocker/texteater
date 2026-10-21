import "./support/dom";
import { beforeEach, expect, mock, test } from "bun:test";
import { fireEvent, render, waitFor } from "@testing-library/react";

const submissions: Record<string, unknown>[] = [];
const reactQuery = await import("@tanstack/react-query");
mock.module("@tanstack/react-query", () => ({
	...reactQuery,
	useQuery: () => ({ data: [], isPending: false, error: null }),
}));
mock.module("../src/hooks/use-anonymous-visitor", () => ({
	useAnonymousVisitorId: () => "library-language-test",
}));
mock.module("../src/hooks/use-text-or-link-submission", () => ({
	useTextOrLinkSubmission: () => ({
		isPending: false,
		run: async (args: Record<string, unknown>) => {
			submissions.push(args);
			return { status: "Accepted", scrollId: "test-scroll" };
		},
	}),
}));
mock.module("../src/hooks/use-text-file-submission", () => ({
	useTextFileSubmission: () => ({ isPending: false, run: async () => null }),
}));
mock.module("../src/workspace/workspace-controller", () => ({
	useWorkspaceInteraction: () => ({ follow: () => {} }),
}));
const { LibraryView } = await import("../src/views/library-view");

beforeEach(() => {
	submissions.length = 0;
});

test("German retains its normalized legacy submission key", async () => {
	const view = render(<LibraryView />);
	fireEvent.click(view.getByRole("button", { name: "Add a text" }));
	const text = await view.findByRole("textbox", {
		name: "German text, or a link to an article",
	});
	fireEvent.focusIn(text);
	fireEvent.input(text, { target: { value: "  Tu\u0308r.  " } });
	fireEvent.keyUp(text, { key: "." });
	fireEvent.click(view.getByRole("button", { name: "Analyze text" }));
	await waitFor(() => expect(submissions.length).toBe(1));
	expect(submissions[0]).toMatchObject({
		language: "de",
		sourceText: "Tür.",
		submissionKey: "text:v1:Tür.",
	});
});

test("Library submits Hebrew with an accessible language selector and separate dedup key", async () => {
	const view = render(<LibraryView />);
	fireEvent.click(view.getByRole("button", { name: "Add a text" }));
	const language = await view.findByRole("combobox", {
		name: "Text language",
	});
	expect((language as HTMLSelectElement).value).toBe("de");
	fireEvent.change(language, { target: { value: "he" } });
	const text = view.getByRole("textbox", { name: "Hebrew text" });
	fireEvent.focusIn(text);
	fireEvent.input(text, { target: { value: "  שלום עולם.  " } });
	fireEvent.keyUp(text, { key: "." });
	fireEvent.click(view.getByRole("button", { name: "Analyze text" }));
	await waitFor(() => expect(submissions.length).toBe(1));
	expect(submissions[0]).toMatchObject({
		language: "he",
		sourceText: "שלום עולם.",
		submissionKey: "text:v1:he:שלום עולם.",
	});
});
