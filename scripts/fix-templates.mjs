import fs from 'fs';

const file = 'D:/SOFTWARE/oraculo/js/components/daily-setup-modal.js';
let content = fs.readFileSync(file, 'utf8');

// Usar regex más flexible para los templates
// Template de TIEMPO
content = content.replace(
  /(TIME_OPTIONS\.map\(opt => `\s*<button\s*type="button"\s*class="selector-chip"\s*data-time="\$\{opt\.value\}"\s*aria-pressed="false"\s*title="\$\{opt\.label\}"\s*>\s*<span class="material-symbols-outlined selector-chip__icon">\$\{opt\.icon\}<\/span>\s*<span class="selector-chip__label">\$\{opt\.label\}<\/span>)\s*(<\/button>)/g,
  '$1\n                    <span class="selector-chip__sublabel">${opt.sublabel}</span>\n                  $2'
);

// Actualizar title para incluir sublabel en tiempo
content = content.replace(
  /data-time="\$\{opt\.value\}"\s*aria-pressed="false"\s*title="\$\{opt\.label\}"/g,
  'data-time="${opt.value}"\n                    aria-pressed="false"\n                    title="${opt.label} - ${opt.sublabel}"'
);

// Template de ENERGÍA
content = content.replace(
  /(ENERGY_OPTIONS\.map\(opt => `\s*<button\s*type="button"\s*class="selector-chip"\s*data-energy="\$\{opt\.value\}"\s*aria-pressed="false"\s*title="\$\{opt\.label\}"\s*>\s*<span class="material-symbols-outlined selector-chip__icon">\$\{opt\.icon\}<\/span>\s*<span class="selector-chip__label">\$\{opt\.label\}<\/span>)\s*(<\/button>)/g,
  '$1\n                    <span class="selector-chip__sublabel">${opt.sublabel}</span>\n                  $2'
);

// Actualizar title para incluir sublabel en energía
content = content.replace(
  /data-energy="\$\{opt\.value\}"\s*aria-pressed="false"\s*title="\$\{opt\.label\}"/g,
  'data-energy="${opt.value}"\n                    aria-pressed="false"\n                    title="${opt.label} - ${opt.sublabel}"'
);

fs.writeFileSync(file, content);
console.log('✓ Templates actualizados');
