import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { Harness } from "./harness";
import "./harness.css";

const root = document.getElementById("root");
if (!root) throw new Error("The #root element is required.");

const params = new URLSearchParams(window.location.search);

createRoot(root).render(
	<StrictMode>
		{params.has("empty") ? (
			<p>No workspace is mounted on this page.</p>
		) : (
			<Harness />
		)}
	</StrictMode>,
);
