# Brazilian Portuguese instruction translation plan

Translate in batches of 10 exercises. Every batch must regenerate the runtime
pack, pass the full frontend suite and receive a language/content review before
the next batch. Progress is measured from `pt-BR.json`, not from generated
files.

| Stage | Dataset body part | Total exercises | Order |
|---:|---|---:|---|
| 0 | Foundation sample across categories | 20 translated | Complete |
| 1 | Waist / abs / core | 169 | In progress |
| 2 | Chest / pectorals | 163 | Pending |
| 3 | Back / lats / upper back | 203 | Pending |
| 4 | Shoulders / delts | 143 | Pending |
| 5 | Upper arms / biceps / triceps | 292 | Pending |
| 6 | Lower arms / forearms | 37 | Pending |
| 7 | Upper legs / glutes / quads / hamstrings | 227 | Pending |
| 8 | Lower legs / calves | 59 | Pending |
| 9 | Cardio and neck | 31 | Pending |
| 10 | Full-corpus terminology and native-speaker QA | 1,324 | Pending |

The body-part stages cover all 1,324 dataset IDs exactly once. The foundation
sample already contributes to several stages, so stage progress must exclude
IDs already present in the source file. Do not add `pt-BR` to `INSTR_LANGS`
until Stage 10 confirms 1,324/1,324 coverage.
