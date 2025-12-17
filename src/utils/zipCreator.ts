import JSZip from 'jszip';

export async function createZipFile(
  html: string,
  images: Array<{hash: string, name: string, bytes: Uint8Array}>,
  baseName: string
): Promise<Blob> {
  const zip = new JSZip();
  
  // Add HTML file
  zip.file(`${baseName}.html`, html);
  
  // Add images folder
  const imagesFolder = zip.folder('images');
  if (imagesFolder) {
    images.forEach(image => {
      imagesFolder.file(image.name, image.bytes);
    });
  }
  
  return await zip.generateAsync({ type: 'blob' });
}

