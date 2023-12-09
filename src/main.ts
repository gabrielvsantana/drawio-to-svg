import { execSync } from 'child_process';
import { mkdir, readFile, readdir, rm, unlink, writeFile } from 'fs/promises';
import { join, parse } from 'path';
import { PDFDocument } from 'pdf-lib';

import { logger } from './logger';

const env = {
  fileName: 'nest' ?? 'page',
  input: `${__dirname}/../_input_`,
  output: `${__dirname}/../_output_`,
  temp: `${__dirname}/../_temp_`,
  drawio: '/Applications/draw.io.app/Contents/MacOS/draw.io',
};

const getFilesFromDir = async (dir: string, extensions: string[]) => {
  const files = await readdir(dir);
  return files.filter((file) => extensions.some((ext) => file.endsWith(ext)));
};

const execCommand = (command: string, errorMessage: string) => {
  try {
    execSync(command);
  } catch (error) {
    logger.error(errorMessage, error);
    throw error;
  }
};

const convertDrawioToPdf = async (inputDir: string, outputDir: string, drawioPath: string) => {
  const drawioFiles = await getFilesFromDir(inputDir, ['.drawio', '.xml']);

  await Promise.all(
    drawioFiles.map(async (file) => {
      const inputFile = `${inputDir}/${file}`;
      const outputFolder = `${outputDir}/`;
      const command = `${drawioPath} -a --crop -x -o "${outputFolder}" "${inputFile}"`;
      execCommand(command, `Error generating PDF file for "${file}":`);
      logger.info(`PDF generated for "${file}"`);
    }),
  );
};

const splitPdfFiles = async (inputDir: string, outputDir: string) => {
  const pdfFiles = await getFilesFromDir(inputDir, ['.pdf']);

  await Promise.all(
    pdfFiles.map(async (file) => {
      const { base, name: folderName } = parse(file);
      const newPath = join(outputDir, folderName);
      await mkdir(newPath, { recursive: true });
      await splitPdf(inputDir, newPath, base);
      await convertPdfToSvg(newPath);
    }),
  );
};

const splitPdf = async (inputDir: string, outputDir: string, fileName: string) => {
  const pdfBytes = await readFile(join(inputDir, fileName));
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pageCount = pdfDoc.getPageCount();

  await Promise.all(
    Array.from({ length: pageCount }).map(async (_, i) => {
      const newPdfDoc = await PDFDocument.create();
      const [page] = await newPdfDoc.copyPages(pdfDoc, [i]);
      newPdfDoc.addPage(page);
      const newPdfBytes = await newPdfDoc.save();
      return writeFile(join(outputDir, `${env.fileName}-${i + 1}.pdf`), newPdfBytes);
    }),
  );

  await unlink(join(inputDir, fileName));
};

const convertPdfToSvg = async (inputDir: string) => {
  const pdfFiles = await getFilesFromDir(inputDir, ['.pdf']);

  await Promise.all(
    pdfFiles.map(async (file) => {
      const inputFile = `${inputDir}/${file}`;
      const outputFile = `${inputDir}/${file.replace('.pdf', '.svg')}`;
      const command = `inkscape ${inputFile} --export-filename=${outputFile}`;
      execCommand(command, `Error generating SVG file for "${file}":`);
      unlink(inputFile);
      logger.info(`SVG generated for "${file}"`);
    }),
  );
};

const main = async () => {
  await mkdir(env.temp, { recursive: true });

  logger.info('Step 1/3 :: convertDrawioToPdf...');
  await convertDrawioToPdf(env.input, env.temp, env.drawio);
  logger.info('Step 1/3 :: convertDrawioToPdf done!');

  logger.info('Step 2/3 :: splitPdfFiles...');
  await splitPdfFiles(env.temp, env.output);
  logger.info('Step 2/3 :: splitPdfFiles done!');

  logger.info('Step 3/3 :: convertPdfToSvg...');
  await convertPdfToSvg(env.output);
  logger.info('Step 3/3 :: convertPdfToSvg done!');

  logger.info('All steps completed!');
  await rm(env.temp, { recursive: true, force: true });
};

main().catch(logger.error);
