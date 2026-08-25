import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, parse, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '../../korea_fonts');
const width = 400;
const height = 80;
const fontExtensions = new Set(['.ttf', '.otf', '.woff', '.woff2']);

function cropCanvas(source: ReturnType<typeof createCanvas>, padding = 10) {
  const { width, height } = source;
  const data = source.getContext('2d').getImageData(0, 0, width, height).data;
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] === 0) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < 0) return source;
  left = Math.max(0, left - padding);
  top = Math.max(0, top - padding);
  right = Math.min(width - 1, right + padding);
  bottom = Math.min(height - 1, bottom + padding);
  const cropped = createCanvas(right - left + 1, bottom - top + 1);
  cropped.getContext('2d').drawImage(
    source,
    left,
    top,
    cropped.width,
    cropped.height,
    0,
    0,
    cropped.width,
    cropped.height,
  );
  return cropped;
}

type CatalogFont = {
  id: string;
  name: string;
  subsets: string[];
  fontFile: string;
  licenseFile: string | null;
  license: {
    name: string | null;
    image: string | null;
    imageAlt: string | null;
    sourceUrl: string | null;
  };
  previewImage: string;
};

function readLicense(text: string): CatalogFont['license'] {
  const sourceUrl = text.match(/출처\s*링크\s*:\s*(\S+)/)?.[1] ?? null;
  const image = text.match(/<img[^>]+src="([^"]+)"[^>]+alt="([^"]*)"/i);

  return {
    name: image?.[2] ?? null,
    image: image?.[1] ?? null,
    imageAlt: image?.[2] ?? null,
    sourceUrl,
  };
}

async function main(): Promise<void> {
  const folders = (await readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  let generated = 0;
  const catalog: CatalogFont[] = [];
  for (const folder of folders) {
    const directory = join(root, folder.name);
    const files = (await readdir(directory))
      .filter((file) => fontExtensions.has(parse(file).ext.toLowerCase()))
      .sort();

    if (files.length !== 1) {
      console.warn(`[skip] ${folder.name}: expected 1 font, found ${files.length}`);
      continue;
    }

    const fontPath = join(directory, files[0]);
    const font = GlobalFonts.registerFromPath(fontPath, `font-${generated}`);
    if (!font) {
      console.warn(`[skip] ${folder.name}: failed to load ${files[0]}`);
      continue;
    }

    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#000000';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `26px "font-${generated}"`;
    context.fillText(folder.name, width / 2, 27);
    context.font = `20px "font-${generated}"`;
    context.fillText(parse(files[0]).name, width / 2, 58);

    await writeFile(
      join(directory, 'sample.png'),
      cropCanvas(canvas).toBuffer('image/png'),
    );
    const textFile = (await readdir(directory)).find((file) => file.toLowerCase().endsWith('.txt'));
    const license = textFile
      ? readLicense(await readFile(join(directory, textFile), 'utf8'))
      : { name: null, image: null, imageAlt: null, sourceUrl: null };
    catalog.push({
      id: folder.name,
      name: folder.name,
      subsets: ['korean'],
      fontFile: `${folder.name}/${files[0]}`,
      licenseFile: textFile ? `${folder.name}/${textFile}` : null,
      license,
      previewImage: `${folder.name}/sample.png`,
    });
    generated++;
    console.log(`[generated] ${relative(root, join(directory, 'sample.png'))}`);
  }

  await writeFile(
    join(root, 'catalog.json'),
    `${JSON.stringify({ version: 1, fonts: catalog }, null, 2)}\n`,
    'utf8',
  );
  console.log(`Generated ${generated} sample image(s).`);
  console.log(`Wrote catalog.json with ${catalog.length} font(s).`);
}

await main();
