// Inspect layout sizing
const canvas = document.querySelector('.joint-paper');
if (canvas) {
  const rect = canvas.getBoundingClientRect();
  console.log('Canvas dimensions:', rect);
  
  const svg = canvas.querySelector('svg');
  if (svg) {
    const svgRect = svg.getBoundingClientRect();
    console.log('SVG dimensions:', svgRect);
  }
} else {
  console.log('No canvas found');
}
