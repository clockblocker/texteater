import { afterEach, beforeEach, expect, test } from "bun:test";
import { getFunctionName } from "convex/server";
import { submitText } from "../convex/orchestration";

type SubmitTextArgs = { submissionKey: string; sourceText: string };

const submitTextHandler = (
	submitText as unknown as {
		_handler: (ctx: unknown, args: SubmitTextArgs) => Promise<unknown>;
	}
)._handler;

const unexpectedWork = {
	calls: [] as string[],
	runQuery(reference: unknown) {
		const name = getFunctionName(reference as never);
		unexpectedWork.calls.push(name);
		throw new Error(`Unexpected query ${name}`);
	},
	runMutation(reference: unknown) {
		const name = getFunctionName(reference as never);
		unexpectedWork.calls.push(name);
		throw new Error(`Unexpected mutation ${name}`);
	},
};

const previousFetch = globalThis.fetch;
const previousKeys = {
	OPENAI_API_KEY: process.env.OPENAI_API_KEY,
	TYPESAFE_API_KEY: process.env.TYPESAFE_API_KEY,
};
let providerRequests: string[] = [];

beforeEach(() => {
	unexpectedWork.calls = [];
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

	await expect(
		submitTextHandler(unexpectedWork, {
			submissionKey: "too-many-sentences",
			sourceText,
		}),
	).resolves.toEqual({
		status: "Rejected",
		message: "At most 25 sentences are allowed.",
	});
	expect(unexpectedWork.calls).toEqual([]);
	expect(providerRequests).toEqual([]);
});

test("a provider failure still throws instead of becoming Rejected", async () => {
	const error = await submitTextHandler(unexpectedWork, {
		submissionKey: "provider-failure",
		sourceText: "Die Banken sind geschlossen.",
	}).then(
		() => undefined,
		(failure: unknown) => failure,
	);

	expect(error).toBeInstanceOf(Error);
	expect(String(error)).toContain("ProviderFailure");
	expect(providerRequests.length).toBeGreaterThan(0);
	expect(unexpectedWork.calls).toEqual([]);
});
