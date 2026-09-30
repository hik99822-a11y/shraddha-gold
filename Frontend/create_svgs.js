const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'public/assets/images/placeholders');
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

const generateSVG = (text) => `
<svg width="800" height="800" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#5C9396;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#19241A;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#grad1)" />
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="40" font-weight="bold" letter-spacing="4">${text}</text>
</svg>
`;

const images = [
  { name: 'rings.svg', text: 'RINGS' },
  { name: 'bracelets.svg', text: 'BRACELETS' },
  { name: 'watches.svg', text: 'WATCHES' },
  { name: 'necklaces.svg', text: 'NECKLACES' },
  { name: 'melting.svg', text: 'MELTING' },
  { name: 'stamping.svg', text: 'STAMPING' },
  { name: 'cnc.svg', text: 'CNC MACHINING' },
  { name: 'enamelling.svg', text: 'ENAMELLING' },
  { name: 'stone-setting.svg', text: 'STONE SETTING' },
  { name: 'polishing.svg', text: 'POLISHING' },
  { name: 'bangles.svg', text: 'GOLD BANGLES' },
  { name: 'pendant.svg', text: 'PENDANTS' },
  { name: 'delicate.svg', text: 'DELICATE' },
  { name: 'luxury.svg', text: 'LUXURY' },
  { name: 'facility.svg', text: 'FACILITY' }
];

images.forEach(img => {
  fs.writeFileSync(path.join(dir, img.name), generateSVG(img.text));
});
console.log('SVGs created successfully.');
