import { join, resolve } from "node:path";
import { z } from "zod";
import { dumspecDirectory } from "./record-store";
import { createReview } from "./review";

const saveRequestSchema = z.object({
	id: z.string().min(1),
	sha256: z.string().regex(/^[0-9a-f]{64}$/u),
});

/**
 * Where the server reads: `SPEC_REVIEW_BATCH` names the batch file and
 * `SPEC_REVIEW_RECORDS` the records directory its ids are relative to.
 * They default to dumspec's membership-hard batch and records.
 */
function configurationFromEnvironment(
	environment: Record<string, string | undefined> = process.env,
) {
	return {
		batchPath: resolve(
			environment.SPEC_REVIEW_BATCH ??
				join(dumspecDirectory, "batches/membership-hard.json"),
		),
		recordsDirectory: resolve(
			environment.SPEC_REVIEW_RECORDS ??
				join(dumspecDirectory, "records"),
		),
		port: Number(environment.SPEC_REVIEW_API_PORT ?? 3186),
	};
}

async function save(
	request: Request,
	act: (body: z.infer<typeof saveRequestSchema>) => Promise<{
		status: number;
		body: unknown;
	}>,
): Promise<Response> {
	const parsed = saveRequestSchema.safeParse(
		await request.json().catch(() => undefined),
	);
	if (!parsed.success)
		return Response.json(
			{ outcome: "refused", error: "Send { id, sha256 }" },
			{ status: 400 },
		);
	const { status, body } = await act(parsed.data);
	return Response.json(body, { status });
}

/** Serves the batch, its records, and approvals over HTTP. */
export function startSpecReviewServer(options: {
	batchPath: string;
	recordsDirectory: string;
	port?: number;
}) {
	const review = createReview(options);
	return Bun.serve({
		hostname: "127.0.0.1",
		port: options.port ?? 3186,
		routes: {
			"/api/batch": {
				async GET() {
					return Response.json(await review.batch());
				},
			},
			"/api/record": {
				async GET(request) {
					const id =
						new URL(request.url).searchParams.get("id") ?? "";
					const record = await review.record(id);
					return record
						? Response.json(record)
						: Response.json(
								{ error: `${id} is not in the batch` },
								{ status: 404 },
							);
				},
			},
			"/api/record/approve": {
				POST: (request) => save(request, review.approve),
			},
			"/api/record/take-back": {
				POST: (request) => save(request, review.takeBack),
			},
		},
		error(error) {
			return Response.json({ error: String(error) }, { status: 500 });
		},
	});
}

if (import.meta.main) {
	const configuration = configurationFromEnvironment();
	const server = startSpecReviewServer(configuration);
	console.log(
		`Spec review API on ${server.url}: batch ${configuration.batchPath}, records ${configuration.recordsDirectory}`,
	);
}
