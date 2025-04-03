const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const readline = require('readline');

const mapCoverStoragePath = path.join(__dirname, 'mapCover');
const queueFilePath = path.join(__dirname, 'processing_queue.txt');

fs.mkdirSync(mapCoverStoragePath, { recursive: true });

async function processFile(filePath) {
  const fileName = path.basename(filePath);
  const fileNameWithoutExt = path.parse(fileName).name;
  const coverPath = path.join(mapCoverStoragePath, `${fileNameWithoutExt}.jpg`);

  try {
    console.log(` Processing: ${fileName}`);
    await sharp(filePath)
      .resize(600, 800, { fit: 'cover' })
      .jpeg({ quality: 70 })
      .toFile(coverPath);
    console.log(` Cover created: ${coverPath}`);
  } catch (err) {
    console.error(` Failed to process ${fileName}:`, err.message);
  }
}

async function runWorker() {
  const rl = readline.createInterface({
    input: fs.createReadStream(queueFilePath),
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    const filePath = line.trim();
    if (filePath) {
      await processFile(filePath);
    }
  }

  // Clear queue after processing
  fs.writeFileSync(queueFilePath, '');
  console.log(' All queued files processed.');
}

runWorker();