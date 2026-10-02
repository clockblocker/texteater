import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/NumForm.html
export const NumFormSchema = z.enum(["Combi", "Digit", "Roman", "Word"]);
