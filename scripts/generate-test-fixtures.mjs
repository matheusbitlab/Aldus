// Gera fixtures de teste sem depender de livros de terceiros.
// - tests/fixtures/books/scanned-sample.pdf: PDF só com imagens (sem camada de texto),
//   usado para validar a detecção "OCR necessário" do Reflow.
// O texto rasterizado é de Machado de Assis (domínio público).
import { createCanvas } from '@napi-rs/canvas';
import { PDFDocument } from 'pdf-lib';
import { mkdirSync, writeFileSync } from 'node:fs';

const lines = [
  'Algum tempo hesitei se devia abrir estas memórias',
  'pelo princípio ou pelo fim, isto é, se poria em primeiro',
  'lugar o meu nascimento ou a minha morte. Suposto o uso',
  'vulgar seja começar pelo nascimento, duas considerações',
  'me levaram a adotar diferente método.',
];

const pdf = await PDFDocument.create();
for (let page = 1; page <= 3; page++) {
  const canvas = createCanvas(1240, 1754);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f4f1ea'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#222'; ctx.font = '38px serif';
  lines.forEach((line, i) => ctx.fillText(line, 110, 220 + i * 64));
  ctx.font = '30px serif'; ctx.fillText(`— ${page} —`, 590, 1650);
  const png = await pdf.embedPng(canvas.toBuffer('image/png'));
  const p = pdf.addPage([595, 842]);
  p.drawImage(png, { x: 0, y: 0, width: 595, height: 842 });
}
mkdirSync('tests/fixtures/books', { recursive: true });
writeFileSync('tests/fixtures/books/scanned-sample.pdf', await pdf.save());
console.log('Generated tests/fixtures/books/scanned-sample.pdf');
