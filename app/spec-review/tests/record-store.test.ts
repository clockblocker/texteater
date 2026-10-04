import { afterEach, describe, expect, test } from "bun:test";
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { checkRecord } from "dumcorpus";
import { blockedReason } from "../src/batch";
import { changedRecordIds } from "../src/git-status";
import { createRecordStore } from "../src/record-store";
import { createReview } from "../src/review";
import { startSpecReviewServer } from "../src/server";
import type { ReadableRecordView, SaveResponse } from "../src/shared/contract";
import {
	batchRow,
	draftRecord,
	formatted,
	nonceNounRecord,
	recordsRoot,
} from "./fixtures";

const directories: string[] = [];
afterEach(async () => {
	for (const directory of directories.splice(0))
		await rm(directory, { recursive: true, force: true });
});

function brokenSegmentation() {
	const record = draftRecord();
	// Full coverage, but "schläft" is in no target.
	record.targets = (record.targets as unknown[]).slice(0, 1);
	return record;
}

/** A records directory and a batch over it. */
async function setup(
	rows = [
		batchRow("H1", "de/er-schlaeft"),
		batchRow("H2", "de/broken"),
		batchRow("Q1", "de/er-schlaeft-q", {
			openQuestion: { issue: 759, question: 1 },
		}),
		batchRow("D1", "de/er-schlaeft-dev", { split: "dev" }),
		batchRow("A1", "de/attested"),
	],
) {
	const root = await recordsRoot({
		"de/er-schlaeft": draftRecord(),
		"de/broken": brokenSegmentation(),
		"de/er-schlaeft-q": draftRecord(),
		"de/er-schlaeft-dev": draftRecord(),
		"de/attested": { ...draftRecord(), reviewDepth: "Attestation" },
		"de/der-blarg": nonceNounRecord(),
	});
	directories.push(root);
	const directory = join(root, "records");
	const batchPath = join(root, "batch.json");
	await writeFile(batchPath, JSON.stringify({ rows }));
	return {
		directory,
		batchPath,
		review: createReview({ batchPath, recordsDirectory: directory }),
		text: (id: string) => readFile(join(directory, `${id}.json`), "utf8"),
	};
}

async function readable(
	review: ReturnType<typeof createReview>,
	id: string,
): Promise<ReadableRecordView> {
	const record = await review.record(id);
	if (record?.status !== "readable") throw new Error(`${id} is unreadable`);
	return record;
}

/** The lines `after` has that `before` lacks, and the reverse. */
function lineDiff(before: string, after: string) {
	const left = before.split("\n");
	const right = after.split("\n");
	return {
		added: right.filter((line) => !left.includes(line)),
		removed: left.filter((line) => !right.includes(line)),
		growth: right.length - left.length,
	};
}

describe("reading", () => {
	test("checks each record on its own and splits its issues by layer", async () => {
		const { review } = await setup();
		const record = await readable(review, "de/er-schlaeft");
		expect(record.sha256).toMatch(/^[0-9a-f]{64}$/u);
		expect(record.reviewDepth).toBeUndefined();
		expect(record.validThrough).toBe("Segmentation");
		expect(record.units.map((unit) => unit.route.kind)).toEqual([
			"PRON",
			"VERB",
		]);
		expect(record.units[1]?.rationale).toBe("A plain verb.");
		expect(record.segmentationIssues).toEqual([]);
		expect(record.deeperIssues.map((issue) => issue.layer)).toContain(
			"Attestation",
		);
		expect(record.rules.map((rule) => rule.status)).toEqual(["current"]);
		expect(record.approve).toEqual({ allowed: true });
		expect(record.dirty).toBeNull();

		const broken = await readable(review, "de/broken");
		expect(broken.segmentationIssues.map((issue) => issue.check)).toEqual([
			"Coverage",
		]);
		expect(broken.approve.allowed).toBe(false);
	});

	test("reads a No Target entry over several Segments as one entry", async () => {
		const { review } = await setup([batchRow("N1", "de/der-blarg")]);
		const record = await readable(review, "de/der-blarg");
		expect(record.noTarget).toEqual([
			{
				memberSegmentIndices: [0, 2],
				reason: "A nonce noun with its article.",
			},
		]);
		expect(record.segmentationIssues).toEqual([]);
		expect(record.approve).toEqual({ allowed: true });
	});

	test("a malformed file is unreadable and hides no other row", async () => {
		const { review, directory } = await setup();
		await writeFile(join(directory, "de/broken.json"), "{ not json");
		const batch = await review.batch();
		expect(batch.rows.find((row) => row.row === "H2")?.problem).toMatch(
			/Invalid JSON/u,
		);
		expect(batch.rows.find((row) => row.row === "H1")?.validThrough).toBe(
			"Segmentation",
		);
		expect((await review.record("de/broken"))?.status).toBe("unreadable");
	});
});

describe("approving", () => {
	test("adds one reviewDepth line after coverage and nothing else", async () => {
		const { review, text, directory } = await setup();
		const before = await text("de/er-schlaeft");
		const { sha256 } = await readable(review, "de/er-schlaeft");
		const { status, body } = await review.approve({
			id: "de/er-schlaeft",
			sha256,
		});
		expect(status).toBe(200);
		expect(body.outcome).toBe("saved");
		const after = await text("de/er-schlaeft");
		expect(lineDiff(before, after)).toEqual({
			added: ['\t"reviewDepth": "Segmentation",'],
			removed: [],
			growth: 1,
		});
		const lines = after.split("\n");
		expect(
			lines[lines.indexOf('\t"reviewDepth": "Segmentation",') - 1],
		).toBe('\t"coverage": "Full",');
		const checked = checkRecord("de/er-schlaeft", JSON.parse(after));
		expect(checked.errors).toEqual([]);
		expect(checked.reviewDepth).toBe("Segmentation");
		// The temporary file is gone.
		expect(await readdir(join(directory, "de"))).not.toContain(
			"er-schlaeft.json.tmp",
		);
	});

	test("taking it back restores the file byte for byte", async () => {
		const { review, text } = await setup();
		const before = await text("de/er-schlaeft");
		const draft = await readable(review, "de/er-schlaeft");
		expect(draft.takeBack.allowed).toBe(false);
		await review.approve({ id: "de/er-schlaeft", sha256: draft.sha256 });
		const approved = await readable(review, "de/er-schlaeft");
		expect(approved.reviewDepth).toBe("Segmentation");
		expect(approved.approve.allowed).toBe(false);
		expect(approved.takeBack).toEqual({ allowed: true });
		const { status } = await review.takeBack({
			id: "de/er-schlaeft",
			sha256: approved.sha256,
		});
		expect(status).toBe(200);
		expect(await text("de/er-schlaeft")).toBe(before);
	});

	test("a save answers with its row's new Review Depth for the list", async () => {
		const { review } = await setup();
		const draft = await readable(review, "de/er-schlaeft");
		expect(draft.row.reviewDepth).toBeUndefined();
		const approved = await review.approve({
			id: "de/er-schlaeft",
			sha256: draft.sha256,
		});
		if (approved.body.outcome !== "saved") throw new Error("not saved");
		expect(approved.body.record.row.reviewDepth).toBe("Segmentation");
		const takenBack = await review.takeBack({
			id: "de/er-schlaeft",
			sha256: approved.body.record.sha256 ?? "",
		});
		if (takenBack.body.outcome !== "saved") throw new Error("not saved");
		expect(takenBack.body.record.row.reviewDepth).toBeUndefined();
	});

	test("refuses to take back a deeper review", async () => {
		const { review, text } = await setup();
		const before = await text("de/attested");
		const { sha256, takeBack } = await readable(review, "de/attested");
		expect(takeBack.reason).toMatch(/Reviewed through Attestation/u);
		const { status } = await review.takeBack({ id: "de/attested", sha256 });
		expect(status).toBe(422);
		expect(await text("de/attested")).toBe(before);
	});

	test("answers 409 with the fresh record when the file changed", async () => {
		const { review, text, directory } = await setup();
		const { sha256 } = await readable(review, "de/er-schlaeft");
		const edited = draftRecord();
		edited.targets = [
			{
				memberSegmentIndices: [0],
				route: { family: "Lexeme", kind: "PRON" },
				notes: { rationale: "Changed by another session." },
			},
			(draftRecord().targets as unknown[])[1],
		];
		await writeFile(
			join(directory, "de/er-schlaeft.json"),
			await formatted(edited),
		);
		const changed = await text("de/er-schlaeft");
		const { status, body } = await review.approve({
			id: "de/er-schlaeft",
			sha256,
		});
		expect(status).toBe(409);
		if (body.outcome !== "conflict") throw new Error(body.outcome);
		if (body.record.status !== "readable") throw new Error("unreadable");
		expect(body.record.sha256).not.toBe(sha256);
		expect(body.record.units[0]?.rationale).toBe(
			"Changed by another session.",
		);
		expect(await text("de/er-schlaeft")).toBe(changed);
	});

	test("refuses a save that breaks Segmentation", async () => {
		const { review, text } = await setup();
		const before = await text("de/broken");
		const { sha256, approve } = await readable(review, "de/broken");
		expect(approve.reason).toMatch(/Segmentation would fail segments\.2/u);
		const { status, body } = await review.approve({
			id: "de/broken",
			sha256,
		});
		expect(status).toBe(422);
		expect(body.outcome).toBe("refused");
		expect(await text("de/broken")).toBe(before);
	});

	test("the store refuses it too, whatever the batch says", async () => {
		const { directory, text } = await setup();
		const store = createRecordStore(directory);
		const current = await store.read("de/broken");
		const result = await store.setReviewDepth(
			"de/broken",
			current.sha256 ?? "",
			"Segmentation",
		);
		expect(result.outcome).toBe("refused");
		expect(JSON.parse(await text("de/broken")).reviewDepth).toBeUndefined();
	});

	test("refuses a record citing a reworded Rule", async () => {
		const { directory, review } = await setup([batchRow("S1", "de/stale")]);
		const stale = draftRecord();
		(stale.sources as { rules: { hash: string }[] }).rules[0] = {
			...(stale.sources as { rules: { rule: string }[] }).rules[0],
			hash: "0000000000000000",
		} as { rule: string; hash: string };
		await writeFile(
			join(directory, "de/stale.json"),
			await formatted(stale),
		);
		const record = await readable(review, "de/stale");
		expect(record.rules[0]?.status).toBe("stale");
		expect(record.approve.reason).toMatch(/stale Rule/u);
		const { status } = await review.approve({
			id: "de/stale",
			sha256: record.sha256,
		});
		expect(status).toBe(422);
	});
});

describe("blocked rows", () => {
	test("a dev row and a row with an open question cannot be approved", async () => {
		const { review, text } = await setup();
		for (const [id, reason] of [
			["de/er-schlaeft-dev", /Dev row/u],
			["de/er-schlaeft-q", /Open question #759 Q1/u],
		] as const) {
			const before = await text(id);
			const record = await readable(review, id);
			expect(record.approve.allowed).toBe(false);
			expect(record.approve.reason).toMatch(reason);
			expect(record.row.blocked).toMatch(reason);
			const { status, body } = await review.approve({
				id,
				sha256: record.sha256,
			});
			expect(status).toBe(422);
			expect(
				(body as Extract<SaveResponse, { outcome: "refused" }>).error,
			).toMatch(reason);
			expect(await text(id)).toBe(before);
		}
		const batch = await review.batch();
		expect(
			batch.rows.filter((row) => row.blocked).map((row) => row.row),
		).toEqual(["Q1", "D1"]);
	});

	test("ruling the question in the batch file unblocks its row", async () => {
		const { review, batchPath } = await setup([
			batchRow("Q1", "de/er-schlaeft-q", {
				openQuestion: { issue: 759, question: 1 },
			}),
		]);
		expect(
			(await readable(review, "de/er-schlaeft-q")).approve.allowed,
		).toBe(false);
		await writeFile(
			batchPath,
			JSON.stringify({ rows: [batchRow("Q1", "de/er-schlaeft-q")] }),
		);
		expect(
			(await readable(review, "de/er-schlaeft-q")).approve.allowed,
		).toBe(true);
	});

	test("the dev split blocks whatever the question", () => {
		expect(blockedReason({ split: "dev" })).toMatch(/Dev row/u);
		expect(
			blockedReason({
				split: "dev",
				openQuestion: { issue: 759, question: 4 },
			}),
		).toMatch(/Dev row/u);
		expect(blockedReason({ split: "held-out" })).toBeUndefined();
	});
});

describe("git status", () => {
	test("marks a changed record dirty and a committed one clean", async () => {
		const { directory, review } = await setup([
			batchRow("H1", "de/er-schlaeft"),
			batchRow("H2", "de/broken"),
		]);
		const git = (...args: string[]) =>
			Bun.spawnSync(
				[
					"git",
					"-c",
					"user.name=test",
					"-c",
					"user.email=test@example.com",
					...args,
				],
				{ cwd: directory },
			);
		git("init", "-q");
		git("add", "de");
		git("commit", "-q", "-m", "seed");
		await writeFile(
			join(directory, "de/broken.json"),
			await formatted(draftRecord()),
		);
		expect([...((await changedRecordIds(directory)) ?? [])]).toEqual([
			"de/broken",
		]);
		const batch = await review.batch();
		expect(batch.rows.map((row) => [row.row, row.dirty])).toEqual([
			["H1", false],
			["H2", true],
		]);
	});
});

describe("HTTP", () => {
	test("serves the batch and answers a stale save with 409", async () => {
		const { directory, batchPath } = await setup();
		const server = startSpecReviewServer({
			batchPath,
			recordsDirectory: directory,
			port: 0,
		});
		try {
			const batch = await (
				await fetch(new URL("/api/batch", server.url))
			).json();
			expect(batch.rows).toHaveLength(5);
			const response = await fetch(
				new URL("/api/record/approve", server.url),
				{
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						id: "de/er-schlaeft",
						sha256: "0".repeat(64),
					}),
				},
			);
			expect(response.status).toBe(409);
			const missing = await fetch(
				new URL("/api/record?id=de/nowhere", server.url),
			);
			expect(missing.status).toBe(404);
		} finally {
			server.stop(true);
		}
	});
});
