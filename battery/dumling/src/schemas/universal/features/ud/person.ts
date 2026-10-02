import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/Person.html
export const PersonSchema = z.enum(["0", "1", "2", "3", "4"]);
