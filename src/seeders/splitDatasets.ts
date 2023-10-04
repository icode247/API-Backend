import fs from 'fs';
import path from 'path';
import { v1 as uuidv1 } from 'uuid';
import JSONStream from 'JSONStream';

const CHUNK_SIZE = 300;

const INPUT_FILES = ['dataset1.json', 'dataset2.json', 'dataset3.json'];
const OUTPUT_DIR = path.join(__dirname, 'datasets');

// Create the output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

for (let i = 0; i < INPUT_FILES.length; i++) {
  const inputFile = INPUT_FILES[i];
  const inputPath = path.join(__dirname, inputFile);

  const inputStream = fs.createReadStream(inputPath, { encoding: 'utf8' });

  const jsonStream = JSONStream.parse('*');

  let chunk = [];

  const writeChunkToFile = () => {
    const outputFilename = `chunk_${uuidv1()}.json`;
    const outputPath = path.join(OUTPUT_DIR, outputFilename);
    const outputStream = fs.createWriteStream(outputPath, { encoding: 'utf8' });
    outputStream.write(JSON.stringify(chunk, null, 2));
    outputStream.end();
    chunk = [];
  };

  jsonStream.on('data', object => {
    chunk.push(object);

    if (chunk.length === CHUNK_SIZE) {
      writeChunkToFile();
    }
  });

  jsonStream.on('end', () => {
    if (chunk.length > 0) {
      writeChunkToFile();
    }
  });

  inputStream.pipe(jsonStream);
}
