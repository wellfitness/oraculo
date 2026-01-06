import fs from 'fs';

const file = 'D:/SOFTWARE/oraculo/js/components/daily-setup-modal.js';
let lines = fs.readFileSync(file, 'utf8').split('\n');

let timeTemplateFound = false;
let energyTemplateFound = false;

for (let i = 0; i < lines.length; i++) {
  // Buscar el template de tiempo y añadir sublabel antes del cierre
  if (lines[i].includes('data-time="${opt.value}"')) {
    // Actualizar el title en la línea del title (2 líneas después)
    if (lines[i+2] && lines[i+2].includes('title="${opt.label}"')) {
      lines[i+2] = lines[i+2].replace('title="${opt.label}"', 'title="${opt.label} - ${opt.sublabel}"');
    }
  }

  if (lines[i].includes('data-energy="${opt.value}"')) {
    // Actualizar el title en la línea del title (2 líneas después)
    if (lines[i+2] && lines[i+2].includes('title="${opt.label}"')) {
      lines[i+2] = lines[i+2].replace('title="${opt.label}"', 'title="${opt.label} - ${opt.sublabel}"');
    }
  }

  // Encontrar líneas de cierre de label y añadir sublabel después
  // Para tiempo: después de <span class="selector-chip__label">${opt.label}</span>
  if (lines[i].includes('selector-chip__label">${opt.label}</span>') && !lines[i].includes('sublabel')) {
    // Verificar que es parte del template TIME_OPTIONS (buscar hacia atrás)
    let isTimeTemplate = false;
    let isEnergyTemplate = false;
    for (let j = i; j > Math.max(0, i - 10); j--) {
      if (lines[j].includes('TIME_OPTIONS.map')) {
        isTimeTemplate = true;
        break;
      }
      if (lines[j].includes('ENERGY_OPTIONS.map')) {
        isEnergyTemplate = true;
        break;
      }
    }

    if ((isTimeTemplate || isEnergyTemplate) && !lines[i+1]?.includes('sublabel')) {
      // Añadir sublabel antes del cierre </button>
      const indent = lines[i].match(/^\s*/)[0];
      const sublabelLine = indent + '  <span class="selector-chip__sublabel">${opt.sublabel}</span>';
      lines.splice(i + 1, 0, sublabelLine);
      if (isTimeTemplate) timeTemplateFound = true;
      if (isEnergyTemplate) energyTemplateFound = true;
    }
  }
}

fs.writeFileSync(file, lines.join('\n'));
console.log('Resultados:');
console.log(timeTemplateFound ? '✓ Sublabel añadido a template de tiempo' : '- Template de tiempo sin cambios');
console.log(energyTemplateFound ? '✓ Sublabel añadido a template de energía' : '- Template de energía sin cambios');
console.log('✓ Archivo guardado');
