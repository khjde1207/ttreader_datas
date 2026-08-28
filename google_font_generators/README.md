# Google Font Generators

Read the local Google Fonts checkout and generate a compact catalog for the
curated `../fonts` output directory.

```bash
npm install
npm run generate
```

This first version writes metadata only. It selects one representative normal
font per family and records its size in bytes, subsets, designer, license,
source font path, and the future `sample.png` path.
