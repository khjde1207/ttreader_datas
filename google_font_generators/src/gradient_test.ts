import sharp from 'sharp';

const input = '/home/khjde1207/projects/ttreader_datas/background/old_book_paper.png';
const { width, height } = await sharp(input).metadata();

async function writeVariant(name: string, centerLight: boolean): Promise<void> {
  const inner = centerLight ? '#ffffff24' : '#00000024';
  const outer = centerLight ? '#00000024' : '#ffffff24';
  const svg = Buffer.from(`<svg width="${width}" height="${height}">
    <defs><radialGradient id="g" cx="50%" cy="50%" r="72%">
      <stop offset="0%" stop-color="${inner}"/><stop offset="100%" stop-color="${outer}"/>
    </radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/>
  </svg>`);
  await sharp(input).composite([{ input: svg }]).png().toFile(input.replace('.png', `_${name}.png`));
}

async function writeVerticalVariant(name: string, darkAtBottom: boolean): Promise<void> {
  const light = '#00000014';
  const dark = '#0000004d';
  const top = darkAtBottom ? light : dark;
  const bottom = darkAtBottom ? dark : light;
  const svg = Buffer.from(`<svg width="${width}" height="${height}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${top}"/><stop offset="100%" stop-color="${bottom}"/>
    </linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/>
  </svg>`);
  await sharp(input).composite([{ input: svg }]).png().toFile(input.replace('.png', `_${name}.png`));
}

await writeVerticalVariant('top_to_bottom_dark', true);
await writeVerticalVariant('bottom_to_top_dark', false);
