import { useCallback, useEffect, useState } from "react";
import type { BatchView, RecordView } from "../shared/contract";
import { fetchBatch, fetchRecord } from "./api";
import { BatchList } from "./BatchList";
import { RecordPanel } from "./RecordPanel";

/** The selected row lives in the URL hash, so a reload keeps it. */
function rowFromHash(): string | undefined {
	return decodeURIComponent(window.location.hash.slice(1)) || undefined;
}

export function App() {
	const [batch, setBatch] = useState<BatchView>();
	const [error, setError] = useState<string>();
	const [selectedRow, setSelectedRow] = useState(rowFromHash);
	const [record, setRecord] = useState<RecordView>();

	const reloadBatch = useCallback(() => {
		fetchBatch().then(setBatch, (failure: Error) =>
			setError(failure.message),
		);
	}, []);
	useEffect(() => reloadBatch(), [reloadBatch]);

	useEffect(() => {
		const follow = () => setSelectedRow(rowFromHash());
		window.addEventListener("hashchange", follow);
		return () => window.removeEventListener("hashchange", follow);
	}, []);

	const recordId = batch?.rows.find((row) => row.row === selectedRow)?.record;
	useEffect(() => {
		setRecord(undefined);
		if (!recordId) return;
		let current = true;
		fetchRecord(recordId).then(
			(loaded) => current && setRecord(loaded),
			(failure: Error) => current && setError(failure.message),
		);
		return () => {
			current = false;
		};
	}, [recordId]);

	return (
		<div className="grid h-dvh grid-cols-[minmax(20rem,28rem)_1fr] bg-canvas text-ink">
			<aside className="flex min-h-0 flex-col border-e border-line">
				<header className="border-b border-line px-4 py-3">
					<h1 className="font-medium text-sm">Segmentation review</h1>
					<p
						className="truncate text-ink-muted text-xs"
						title={batch?.path}
					>
						{batch?.path ?? "Loading batch…"}
					</p>
				</header>
				{batch && (
					<BatchList
						rows={batch.rows}
						selected={selectedRow}
						onSelect={(row) => {
							window.location.hash = encodeURIComponent(row);
						}}
					/>
				)}
			</aside>
			<main className="min-h-0 overflow-y-auto">
				{error && (
					<p className="m-4 text-destructive text-sm" role="alert">
						{error}
					</p>
				)}
				{record ? (
					<RecordPanel
						key={record.id}
						record={record}
						onSaved={(next) => {
							setRecord(next);
							reloadBatch();
						}}
					/>
				) : (
					<p className="p-8 text-ink-muted text-sm">
						{selectedRow ? "Loading record…" : "Pick a row."}
					</p>
				)}
			</main>
		</div>
	);
}
