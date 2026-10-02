import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/Polite.html
export const PoliteSchema = z.enum(["Elev", "Form", "Humb", "Infm"]);
