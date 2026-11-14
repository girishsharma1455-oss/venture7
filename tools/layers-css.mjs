import fs from 'node:fs';

const files = [
  'C:/giri/v7/v8/public/assets/vendor/smart-slider-3/Public/SmartSlider3/Application/Frontend/Assets/dist/smartslider.min.css',
  'C:/giri/v7/v8/public/assets/vendor/smart-slider-3/Public/SmartSlider3/Slider/SliderType/Simple/Assets/dist/ss-simple.min.css',
  'C:/giri/v7/v8/public/assets/vendor/smart-slider-3/Public/SmartSlider3/Widget/Bullet/Assets/dist/bullet.min.css',
];
for (const f of files) {
  if (!fs.existsSync(f)) { console.log('MISSING', f); continue; }
  const c = fs.readFileSync(f, 'utf8');
  let i = -1;
  while ((i = c.indexOf('.n2-ss-layers-container', i + 1)) !== -1) {
    console.log('----', f.split('/').slice(-1)[0], '@', i);
    console.log(c.slice(Math.max(0, i - 60), i + 220));
  }
}
