import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";

import "./styles.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("The #root element is required.");

createRoot(rootElement).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
