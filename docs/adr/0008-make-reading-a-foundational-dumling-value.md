---
status: accepted
---

# Make Reading a foundational Dumling value

Dumling owns the Reading DTO, schema, equality, and stable identity operation.
A Reading is one Lemma plus one Emoji Description. Dictionaries establish the
scope for that equality and own Reading records, Knowledge, persistence, and
workflows. Keeping the value with its identity operation avoids duplicated
identity algorithms without making Dumling a dictionary.
