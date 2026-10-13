// Turns a CV preview element into a real PDF file, in the browser.
//
// We use two libraries that are already installed:
//   - html2canvas takes a picture of the HTML preview
//   - jsPDF places that picture onto A4 pages
//
// They are imported only when this function runs, so the page still loads
// fine on the server.

export async function exportElementToPdf(element, fileName = 'cv.pdf') {
  if (!element) {
    throw new Error('Nothing to export.');
  }

  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');

  const canvas = await html2canvas(element, {
    scale: 2, // higher quality
    useCORS: true,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Fit the image to the page width.
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  // Add more pages if the CV is longer than one page.
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  // Return both a downloadable blob and a base64 string (to upload & store).
  return {
    blob: pdf.output('blob'),
    dataUri: pdf.output('datauristring'),
  };
}

// Trigger a normal browser download for a generated blob.
export function downloadBlob(blob, fileName) {
  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = fileName;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
