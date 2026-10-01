import type {
	BatchView,
	RecordView,
	SaveRequest,
	SaveResponse,
} from "../shared/contract";

async function json<T>(response: Response): Promise<T> {
	const body = await response.json();
	if (!response.ok && response.status !== 409 && response.status !== 422)
		throw new Error(
			body?.error ?? `${response.status} ${response.statusText}`,
		);
	return body as T;
}

export async function fetchBatch(): Promise<BatchView> {
	return json(await fetch("/api/batch"));
}

export async function fetchRecord(id: string): Promise<RecordView> {
	return json(await fetch(`/api/record?id=${encodeURIComponent(id)}`));
}

export async function postSave(
	action: "approve" | "take-back",
	request: SaveRequest,
): Promise<SaveResponse> {
	return json(
		await fetch(`/api/record/${action}`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(request),
		}),
	);
}
