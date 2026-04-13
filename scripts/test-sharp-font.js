const sharp = require('sharp');
const fs = require('fs');

async function run() {
  console.log('Downloading Open Sans...');
  // Download a reliable TTF font (Open Sans Regular)
  const fontRes = await fetch('https://github.com/google/fonts/raw/main/ofl/opensans/OpenSans%5Bwdth%2Cwght%5D.ttf');
  const fontBuf = await fontRes.arrayBuffer();
  const fontBase64 = Buffer.from(fontBuf).toString('base64');
  console.log('Font downloaded. Bytes:', fontBuf.byteLength);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
      <defs>
        <style>
          @font-face {
            font-family: 'MyFont';
            src: url(data:font/ttf;base64,${fontBase64});
          }
          text {
            font-family: 'MyFont', sans-serif;
            font-size: 24px;
            fill: black;
          }
        </style>
      </defs>
      <rect width="100%" height="100%" fill="#f0f0f0" />
      <text x="20" y="50">Hello, Anclora Talent!</text>
      <text x="20" y="90">Testing font rendering.</text>
    </svg>
  `;

  const pngBuf = await sharp(Buffer.from(svg)).png().toBuffer();
  fs.writeFileSync('test-font.png', pngBuf);
  console.log('Saved test-font.png. Check if it has tofu (boxes) or text.');
}

run().catch(console.error);
