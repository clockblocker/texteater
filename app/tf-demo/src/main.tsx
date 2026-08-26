import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import { AppProvider } from "@/components/app-provider";
import App from "./App";

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("The #root element is required to mount tf-demo.");
}

if (
	window.location.pathname !== "/" ||
	window.location.search !== "" ||
	window.location.hash !== ""
) {
	window.history.replaceState(null, "", "/");
}

createRoot(rootElement).render(
	<StrictMode>
		<AppProvider>
			<App />
		</AppProvider>
	</StrictMode>,
);
