const fs = require('fs');
const path = require('path');
const pngToIco = require('png-to-ico');

const inputPath = path.join(__dirname, 'src/renderer/icon.png');
const outputPath = path.join(__dirname, 'src/renderer/icon.ico');

console.log('Converting icon from:', inputPath);

// pngToIco has an ES Module default export
const convert = typeof pngToIco === 'function' ? pngToIco : pngToIco.default;

convert(inputPath)
  .then(buf => {
    fs.writeFileSync(outputPath, buf);
    console.log('Successfully saved multi-resolution icon.ico to:', outputPath);
  })
  .catch(err => {
    console.error('Error occurred during ICO generation:', err);
    process.exit(1);
  });
