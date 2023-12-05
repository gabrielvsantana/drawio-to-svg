import { execSync } from 'child_process';
import { mkdir, readFile, readdir, rm, rmdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { PDFDocument } from 'pdf-lib';

import { logger } from './logger';

const env = {
  input: `${__dirname}/../_input_`,
  output: `${__dirname}/../_output_`,
  temp: `${__dirname}/../_temp_`,
  drawio: '/Applications/draw.io.app/Contents/MacOS/draw.io',
};

const convertDrawioToPdf = async (inputDir: string, outputDir: string, drawioPath: string) => {
  const files = await readdir(inputDir);
  const drawioFiles = files.filter((file) => file.endsWith('.drawio') || file.endsWith('.xml'));

  for (const file of drawioFiles) {
    const inputFile = `${inputDir}/${file}`;
    const outputFolder = `${outputDir}/`;

    try {
      execSync(`${drawioPath} -a --crop -x -o "${outputFolder}" "${inputFile}"`);
      logger.info(`PDF generated for "${file}"`);
    } catch (error) {
      await rmdir(outputFolder);
      logger.error(`Error generating PDF file for "${file}":`, error);
      throw error;
    }
  }
};

const mergePdfFiles = async (outputDir: string) => {
  const files = await readdir(outputDir);
  const pdfFiles = files.filter((file) => file.endsWith('.pdf'));

  const pdfDoc = await PDFDocument.create();

  for (const pdfFile of pdfFiles) {
    const pdfPath = join(outputDir, pdfFile);
    const pdfBytes = await readFile(pdfPath);
    const pdfDocToMerge = await PDFDocument.load(pdfBytes);
    const pageCount = pdfDocToMerge.getPageCount();

    for (let i = 0; i < pageCount; i++) {
      const [copiedPage] = await pdfDoc.copyPages(pdfDocToMerge, [i]);
      pdfDoc.addPage(copiedPage);
    }
  }

  const pdfBytes = await pdfDoc.save();
  await writeFile(`${outputDir}/merged.pdf`, pdfBytes);

  await Promise.all(
    pdfFiles.map((pdfFile) => {
      const filePath = join(outputDir, pdfFile);
      return unlink(filePath);
    }),
  );
};

const splitPdfFiles = async (input: string) => {
  const pdfBytes = await readFile(`${input}/merged.pdf`);
  const pdfDoc = await PDFDocument.load(pdfBytes);

  const pageCount = pdfDoc.getPageCount();

  for (let i = 0; i < pageCount; i++) {
    const newPdfDoc = await PDFDocument.create();
    const [page] = await newPdfDoc.copyPages(pdfDoc, [i]);
    newPdfDoc.addPage(page);
    const newPdfBytes = await newPdfDoc.save();

    await writeFile(join(input, `page${i + 1}.pdf`), newPdfBytes);
  }

  await unlink(join(input, 'merged.pdf'));
};

const convertPdfToSvg = async (inputDir: string, outputDir: string) => {
  const files = await readdir(inputDir);
  const pdfFiles = files.filter((file) => file.endsWith('.pdf'));

  for (const file of pdfFiles) {
    const inputFile = `${inputDir}/${file}`;
    const outputFile = `${outputDir}/${file.replace('.pdf', '.svg')}`;

    try {
      execSync(`inkscape --without-gui --file="${inputFile}" --export-plain-svg="${outputFile}"`);
      logger.info(`SVG generated for "${file}"`);
    } catch (error) {
      logger.error(`Error generating SVG file for "${file}":`, error);
      throw error;
    }
  }
};

const main = async () => {
  await mkdir(env.temp, { recursive: true });

  logger.info('Step 1/4 :: convertDrawioToPdf...');
  await convertDrawioToPdf(env.input, env.temp, env.drawio);
  logger.info('Step 1/4 :: convertDrawioToPdf done!');

  logger.info('Step 2/4 :: mergePdfFiles...');
  await mergePdfFiles(env.temp);
  logger.info('Step 2/4 :: mergePdfFiles done!');

  logger.info('Step 3/4 :: splitPdfFiles...');
  await splitPdfFiles(env.temp);
  logger.info('Step 3/4 :: splitPdfFiles done!');

  logger.info('Step 4/4 :: convertPdfToSvg...');
  await convertPdfToSvg(env.temp, env.output);
  logger.info('Step 4/4 :: convertPdfToSvg done!');

  logger.info('All steps completed!');
};

main()
  .catch(logger.error)
  .finally(() => rm(env.temp, { recursive: true, force: true }));
