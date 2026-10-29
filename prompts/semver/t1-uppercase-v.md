Some users write versions with an uppercase V, like `V1.2.3`. Accept an uppercase `V` everywhere a lowercase `v` is accepted today:

- parsing, validating and cleaning versions: `valid('V1.2.3')` is `'1.2.3'`, `clean(' V1.2.3 ')` is `'1.2.3'`
- in ranges and comparators: `^V1.2.0`, `>=V1.0.0 <V2`, `V1.0.0 - V2.0.0`, `new Comparator('>=V1.2.3')`

Everything else behaves exactly as before. Keep the README up to date.
