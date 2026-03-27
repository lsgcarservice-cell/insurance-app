const PDFDocument = require('pdfkit');

function generatePolicy(res, data) {
  const doc = new PDFDocument();

  res.setHeader('Content-Type', 'application/pdf');
  doc.pipe(res);

  doc.fontSize(20).text('Insurance Policy');
  doc.text(`Customer: ${data.name}`);
  doc.text(`Car Value: ${data.car_value}`);
  doc.text(`Total: ${data.total}`);

  doc.end();
}

module.exports = { generatePolicy };