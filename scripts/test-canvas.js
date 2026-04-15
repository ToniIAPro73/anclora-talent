try {
  const { createCanvas } = require('canvas');
  const canvas = createCanvas(200, 200);
  const ctx = canvas.getContext('2d');
  ctx.font = '30px Arial';
  ctx.fillText('Hello World', 10, 50);
  console.log('Canvas is working! Buffer size:', canvas.toBuffer().byteLength);
} catch (e) {
  console.error('Canvas failed:', e.message);
}
