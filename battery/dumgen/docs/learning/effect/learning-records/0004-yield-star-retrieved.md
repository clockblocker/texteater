# `yield*` syntax retrieved correctly

The learner correctly supplied `yield*` to extract a Dumgen Effect's success value inside `Effect.gen`. This establishes the minimum syntax needed to read and write sequential Effect programs.

## Evidence

Given a generator program with a missing expression before `dumgen.segment(sentences)`, the learner answered `yield*` without prompting.

## Implications

Move from sequential composition to explicit bounded concurrency with `Effect.all` and `Effect.forEach`.
