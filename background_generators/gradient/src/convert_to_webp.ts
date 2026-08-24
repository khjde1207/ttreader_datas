import sharp from 'sharp';
import { readdir } from 'node:fs/promises';
import { join, parse, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..', 'background');
const directories = ['paper', 'scenery', 'decoration', 'share']
  .map((name) => join(rootDirectory, name));
const files: string[] = [];

async function collectPngFiles(currentDirectory: string): Promise<void> {
  for (const entry of await readdir(currentDirectory, { withFileTypes: true })) {
    const path = join(currentDirectory, entry.name);
    if (entry.isDirectory()) {
      await collectPngFiles(path);
    } else if (parse(entry.name).ext.toLowerCase() === '.png') {
      files.push(path);
    }
  }
}

for (const directory of directories) {
  await collectPngFiles(directory);
}
files.sort();

for (const file of files) {
  const { dir, name } = parse(file);
  const output = join(dir, `${name}.webp`);
  const smallOutput = join(dir, `${name}_small.webp`);

  await sharp(file)
    .webp({ quality: 100 })
    .toFile(output);

  await sharp(file)
    .resize({ width: 320, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(smallOutput);

  console.log(`[converted] ${relative(rootDirectory, file)}`);
}

console.log(`Converted ${files.length} PNG file(s) to WebP and small WebP.`);
