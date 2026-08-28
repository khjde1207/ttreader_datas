import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, parse } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';

const project = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const inputRoot = join(project, 'google_fonts');
const outputRoot = join(project, 'fonts');
const sourceGroups = ['ofl', 'apache', 'cc-by-sa'];
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

async function cropExistingSamples(root: string): Promise<void> {
  const entries = await readdir(root, { withFileTypes: true, recursive: true });
  for (const entry of entries) {
    if (!entry.isFile() || entry.name !== 'sample.png' || !entry.parentPath) {
      continue;
    }
    const path = join(entry.parentPath, entry.name);
    const image = await loadImage(path);
    const canvas = createCanvas(image.width, image.height);
    canvas.getContext('2d').drawImage(image, 0, 0);
    await writeFile(path, cropCanvas(canvas).toBuffer('image/png'));
  }
}
const greetings: Record<string, string> = {
  korean: '안녕하세요',
  japanese: 'こんにちは',
  chinese: '你好',
  'chinese-simplified': '你好',
  'chinese-traditional': '你好',
  vietnamese: 'Xin chào',
  latin: 'Hello',
  cyrillic: 'Привет',
  greek: 'Γειά σου',
  arabic: 'مرحبًا',
  hebrew: 'שלום',
  devanagari: 'नमस्ते',
  bengali: 'নমস্কার',
  thai: 'สวัสดี',
  georgian: 'გამარჯობა',
  armenian: 'Բարեւ',
  ethiopic: 'ሰላም',
  sinhala: 'ආයුබෝවන්',
  tamil: 'வணக்கம்',
  telugu: 'నమస్కారం',
  kannada: 'ನಮಸ್ಕಾರ',
  malayalam: 'നമസ്കാരം',
  gujarati: 'નમસ્તે',
  gurmukhi: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ',
};

type FontVariant = { f: string; s: string; w: number };
type CatalogFont = {
  n: string;
  ff: string;
  size: number;
  lf: string;
  l: string;
  s: string[];
  d: string;
  p: string;
};

function normalizeSubset(subset: string): string | null {
  if (subset === 'menu') return null;
  if (subset.startsWith('chinese-')) return 'chinese';
  if (subset.startsWith('cyrillic-')) return 'cyrillic';
  if (subset.startsWith('latin-')) return 'latin';
  return subset;
}

function normalizedSubsets(subsets: string[]): string[] {
  return [
    ...new Set(
      subsets
        .map(normalizeSubset)
        .filter((subset): subset is string => subset !== null),
    ),
  ];
}

function field(text: string, name: string): string | null {
  return text.match(new RegExp(`^\\s*${name}:\\s*"([^"]*)"`, 'm'))?.[1] ?? null;
}

function fields(text: string, name: string): string[] {
  return [...text.matchAll(new RegExp(`^\\s*${name}:\\s*"([^"]*)"`, 'gm'))].map((m) => m[1]);
}

function variants(text: string): FontVariant[] {
  return [...text.matchAll(/fonts\s*\{([\s\S]*?)\}/g)].flatMap((match) => {
    const block = match[1];
    const f = field(block, 'filename');
    if (!f) return [];
    return [{ f, s: field(block, 'style') ?? 'normal', w: Number(field(block, 'weight') ?? 400) }];
  });
}

function representative(items: FontVariant[]): FontVariant {
  return [...items].sort((a, b) => {
    const style = Number(a.s !== 'normal') - Number(b.s !== 'normal');
    return style || Math.abs(a.w - 400) - Math.abs(b.w - 400);
  })[0];
}

function greetingLines(subsets: string[]): string[] {
  const lines: string[] = [];
  for (const subset of subsets) {
    const greeting = greetings[subset];
    if (greeting && !lines.includes(greeting)) lines.push(greeting);
    if (lines.length === 8) break;
  }
  return lines.length > 0 ? lines : ['Hello'];
}

async function writeSample(
  outputDirectory: string,
  fontPath: string,
  familyName: string,
  subsets: string[],
  fontId: string,
): Promise<void> {
  const lines = greetingLines(subsets);
  const lineHeight = 30;
  const canvas = createCanvas(400, 50 + lines.length * lineHeight);
  const context = canvas.getContext('2d');
  GlobalFonts.registerFromPath(fontPath, fontId);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#000000';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `22px "${fontId}"`;
  context.fillText(familyName, canvas.width / 2, 22);
  context.font = `20px "${fontId}"`;
  lines.forEach((line, index) => {
    context.fillText(line, canvas.width / 2, 50 + index * lineHeight);
  });
  await writeFile(
    join(outputDirectory, 'sample.png'),
    cropCanvas(canvas).toBuffer('image/png'),
  );
}

async function main(): Promise<void> {
  try {
    await readdir(inputRoot);
  } catch {
    await cropExistingSamples(outputRoot);
    console.log('Google Fonts source not found; cropped existing samples only.');
    return;
  }

  const catalog: CatalogFont[] = [];
  for (const group of sourceGroups) {
    const groupRoot = join(inputRoot, group);
    const families = (await readdir(groupRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const family of families) {
      const directory = join(groupRoot, family.name);
      const metadataPath = join(directory, 'METADATA.pb');
      let metadata: string;
      try {
        metadata = await readFile(metadataPath, 'utf8');
      } catch {
        continue;
      }

      const variantsInMetadata = variants(metadata);
      const available = (await readdir(directory)).filter((file) => fontExtensions.has(parse(file).ext.toLowerCase()));
      const selected = representative(variantsInMetadata.filter((item) => available.includes(item.f)));
      if (!selected) continue;

      const licenseFile = group === 'ofl' ? 'OFL.txt' : 'LICENSE.txt';
      const sourceSubsets = fields(metadata, 'subsets');
      const subsets = normalizedSubsets(sourceSubsets);
      catalog.push({
        n: field(metadata, 'name') ?? family.name,
        ff: `${group}/${family.name}/${selected.f}`,
        size: (await stat(join(directory, selected.f))).size,
        lf: `${group}/${family.name}/${licenseFile}`,
        l: field(metadata, 'license') ?? group,
        s: subsets,
        d: field(metadata, 'designer') ?? '',
        p: `${group}/${family.name}/sample.png`,
      });
      await mkdir(join(outputRoot, group, family.name), { recursive: true });
      await writeSample(
        join(outputRoot, group, family.name),
        join(directory, selected.f),
        field(metadata, 'name') ?? family.name,
        sourceSubsets,
        `${group}-${family.name}`,
      );
    }
  }

  await writeFile(join(outputRoot, 'catalog.json'), `${JSON.stringify({ v: 1, fonts: catalog })}\n`);
  console.log(`Wrote ${catalog.length} font records.`);
}

await main();
