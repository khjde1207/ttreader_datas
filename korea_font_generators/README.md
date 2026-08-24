# Korea Font Generators

Generate one transparent `sample.png` for each folder in `../korea_fonts` and
write `../korea_fonts/catalog.json`.

```bash
npm install
npm run generate
```

Each folder must contain exactly one font file (`ttf`, `otf`, `woff`, or
`woff2`). The image is `400 x 80` pixels and contains the folder name and the
font filename without its extension.

The catalog also includes the license image URL, license alt text, source URL,
and relative paths to the font, license text, and sample image.
