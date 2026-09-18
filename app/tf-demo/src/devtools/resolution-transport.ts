export type TransportPhase = {
	name: string;
	offsetMs: number;
	durationMs: number;
};

type Measurement = { name: string; durationMs: number };

function record(value: unknown): Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function milliseconds(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) && value >= 0
		? value
		: undefined;
}

/** Only place phases with recorded boundaries; duration-only metrics overlap. */
export function transportBreakdown(text: string) {
	let payload: unknown;
	try {
		payload = JSON.parse(text);
	} catch {
		return undefined;
	}
	const timing = record(record(record(payload).metadata).timing);
	if (Object.keys(timing).length === 0) return undefined;
	const detailed = record(timing.detailed);
	const milestones = record(detailed.milestonesMs);
	const phases: TransportPhase[] = [];
	const add = (name: string, from: string, to: string) => {
		const start = milliseconds(milestones[from]);
		const end = milliseconds(milestones[to]);
		if (start !== undefined && end !== undefined && end >= start)
			phases.push({ name, offsetMs: start, durationMs: end - start });
	};
	add("Open connection", "connectStarted", "connected");
	add("Upload request", "headersSent", "requestBodySent");
	add("Wait for response headers", "requestBodySent", "responseHeaders");
	add(
		"Wait for first body byte",
		"responseHeaders",
		"firstResponseBodyChunk",
	);
	add("Download response", "firstResponseBodyChunk", "responseBodyComplete");
	// Older or non-Undici traces expose only fetch-relative timings.
	if (phases.length === 0) {
		const headers = milliseconds(timing.headersMs);
		const body = milliseconds(timing.bodyMs);
		if (headers !== undefined) {
			phases.push({
				name: "Fetch response headers",
				offsetMs: 0,
				durationMs: headers,
			});
			if (body !== undefined)
				phases.push({
					name: "Read and parse response",
					offsetMs: headers,
					durationMs: body,
				});
		}
	}
	const measurements: Measurement[] = [];
	const measure = (name: string, value: unknown) => {
		const durationMs = milliseconds(value);
		if (durationMs !== undefined) measurements.push({ name, durationMs });
	};
	measure("Provider processing (reported)", timing.providerProcessingMs);
	measure("Serialize request", record(detailed.request).serializationMs);
	measure("Read response body", record(detailed.local).bodyReadMs);
	measure("Parse response JSON", record(detailed.local).responseParseMs);
	measure("Parse generated output", record(detailed.local).outputParseMs);
	return { phases, measurements, reused: record(detailed.connection).reused };
}
