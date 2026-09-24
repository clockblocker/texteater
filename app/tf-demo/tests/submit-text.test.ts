import { afterEach, beforeEach, expect, test } from "bun:test";
import { api } from "../convex/_generated/api";
import { createTestConvex, type TestConvexDb } from "./support/convex";

/** Rows the submission wrote; a Rejected or failed one writes none. */
async function storedTexts(t: TestConvexDb) {
	return t.run(async (ctx) => [
		...(await ctx.db.query("texts").collect()),
		...(await ctx.db.query("sentences").collect()),
	]);
}

const previousFetch = globalThis.fetch;
const previousKeys = {
	OPENAI_API_KEY: process.env.OPENAI_API_KEY,
	TYPESAFE_API_KEY: process.env.TYPESAFE_API_KEY,
};
let providerRequests: string[] = [];

beforeEach(() => {
	providerRequests = [];
	process.env.OPENAI_API_KEY = "fixture";
	process.env.TYPESAFE_API_KEY = "fixture";
	// Every provider request fails, so no test here reaches a live model.
	globalThis.fetch = (async (url: string | URL | Request) => {
		providerRequests.push(String(url));
		return new Response("unavailable", { status: 503 });
	}) as typeof fetch;
});

afterEach(() => {
	globalThis.fetch = previousFetch;
	for (const [name, value] of Object.entries(previousKeys)) {
		if (value === undefined) delete process.env[name];
		else process.env[name] = value;
	}
});

test("a text over the sentence limit is Rejected with its reason before any work", async () => {
	const sourceText = Array.from(
		{ length: 26 },
		(_, index) => `Satz ${index + 1} ist hier.`,
	).join(" ");

	const t = createTestConvex();
	await expect(
		t.action(api.orchestration.submitText, {
			submissionKey: "too-many-sentences",
			sourceText,
		}),
	).resolves.toEqual({
		status: "Rejected",
		message: "At most 25 sentences are allowed.",
	});
	expect(await storedTexts(t)).toEqual([]);
	expect(providerRequests).toEqual([]);
});

test("a provider failure still throws instead of becoming Rejected", async () => {
	const t = createTestConvex();
	const error = await t
		.action(api.orchestration.submitText, {
			submissionKey: "provider-failure",
			sourceText: "Die Banken sind geschlossen.",
		})
		.then(
			() => undefined,
			(failure: unknown) => failure,
		);

	expect(error).toBeInstanceOf(Error);
	expect(String(error)).toContain("ProviderFailure");
	expect(providerRequests.length).toBeGreaterThan(0);
	expect(await storedTexts(t)).toEqual([]);
});
