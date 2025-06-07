import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { URL } from 'node:url';

interface DownloadOptions {
  url: string;
  outputPath?: string;
  filename?: string;
}

async function downloadPDF({
  url,
  outputPath = './downloads',
  filename
}: DownloadOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Validate URL
      const parsedUrl = new URL(url);

      // Create output directory if it doesn't exist
      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
      }

      // Generate filename if not provided
      const defaultFilename = filename ||
        parsedUrl.pathname.split('/').pop() ||
        `download-${Date.now()}.pdf`;

      // Ensure filename ends with .pdf
      const finalFilename = defaultFilename.endsWith('.pdf')
        ? defaultFilename
        : `${defaultFilename}.pdf`;

      const filePath = path.join(outputPath, finalFilename);

      // Create write stream
      const fileStream = fs.createWriteStream(filePath);

      https.get(url, (response) => {
        // Check if response is successful
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download PDF. Status code: ${response.statusCode}`));
          return;
        }

        // Check content type
        const contentType = response.headers['content-type'];
        if (contentType && !contentType.includes('application/pdf')) {
          reject(new Error(`Invalid content type. Expected PDF but got: ${contentType}`));
          return;
        }

        // Pipe the response to file
        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          resolve(filePath);
        });
      }).on('error', (err) => {
        // Clean up: remove partial file if download failed
        fs.unlink(filePath, () => {
          reject(new Error(`Download failed: ${err.message}`));
        });
      });

    } catch (error) {
      reject(error);
    }
  });
}

const getUrl = (id: string) => `https://hoomans.blob.core.windows.net/makemypass/event/f774b1b6-72ad-40fa-8725-91b60c69ebb9/event_register/${id}/invoice.pdf`
const parentFolder = "./script/certificates/tedx"
const outputFolder = `${parentFolder}/pdf`;
const getUrl2 = (id: string) => `https://api.buildnship.in/makemypass/manage-guest/f774b1b6-72ad-40fa-8725-91b60c69ebb9/guest/${id}/download-invoice/`

import Data from "./tedx/out.json"
import { sleep } from 'bun';

// Example usage
async function main(id: string, count: number, name: string) {
  try {
    const x = await fetch(getUrl2(id))
    console.log(await x.json())

    const filePath = await downloadPDF({
      url: getUrl(id),
      outputPath: outputFolder,
      filename: `${name.replaceAll(" ", "-")}.pdf`
    });

    console.log(`${count}. Done ${id}`);
  } catch (error) {
    console.error(`Error downloading PDF for ${id}:`, error);
  }
}

let i = 0
for (const data of Data) {
  i++
  main(data.event_register_id, i, data.name)

}