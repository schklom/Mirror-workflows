# Curated exercise-instruction translations

`pt-BR.json` is the editable source for Brazilian Portuguese exercise
instructions. It is intentionally separate from the upstream-generated packs:
the upstream exercise dataset does not currently ship Portuguese instructions.

Add translations in small, reviewable batches. Every translated exercise must
preserve the English instruction-step count. Then regenerate the runtime pack:

```sh
node scripts/build-pt-br-instructions.mjs
```

The generator rejects unknown IDs, empty steps, mismatched step counts and
steps left unchanged in English. The frontend test also verifies that the
generated `frontend/src/instr/pt-BR.js` exactly matches this source.

Do not add `pt-BR` to `INSTR_LANGS` until all 1,324 exercise IDs are translated
and reviewed. Until then, the released app must continue to show the honest
English-instructions notice instead of silently mixing Portuguese and English.
