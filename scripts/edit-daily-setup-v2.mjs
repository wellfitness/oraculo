import fs from 'fs';

const file = 'D:/SOFTWARE/oraculo/js/components/daily-setup-modal.js';
let content = fs.readFileSync(file, 'utf8');
let changes = 0;

// 1. Actualizar TIME_OPTIONS
const oldTime = `// Opciones de tiempo disponible
const TIME_OPTIONS = [
  { value: '2h', label: '2h', icon: 'hourglass_empty', limit: 1 },
  { value: '4h', label: '4h', icon: 'hourglass_bottom', limit: 2 },
  { value: '6h', label: '6h', icon: 'hourglass_top', limit: 3 },
  { value: 'full', label: 'Full', icon: 'wb_sunny', limit: 3 }
];`;

const newTime = `// Opciones de tiempo disponible - Mejorado v1.7 (iconos descriptivos + sublabels)
const TIME_OPTIONS = [
  { value: '2h', label: '2h', sublabel: '1 tarea', icon: 'timer', limit: 1 },
  { value: '4h', label: '4h', sublabel: '2 tareas', icon: 'schedule', limit: 2 },
  { value: '6h', label: '6h', sublabel: '3 tareas', icon: 'hourglass_top', limit: 3 },
  { value: 'full', label: 'Día', sublabel: '3 tareas', icon: 'wb_sunny', limit: 3 }
];`;

if (content.includes(oldTime)) {
  content = content.replace(oldTime, newTime);
  console.log('✓ TIME_OPTIONS actualizado');
  changes++;
} else {
  console.log('✗ TIME_OPTIONS no encontrado - probando alternativa...');
  // Intentar con regex más flexible
  const timeRegex = /\/\/ Opciones de tiempo disponible[\s\S]*?const TIME_OPTIONS = \[[\s\S]*?\];/;
  if (timeRegex.test(content)) {
    content = content.replace(timeRegex, newTime);
    console.log('✓ TIME_OPTIONS actualizado (via regex)');
    changes++;
  }
}

// 2. Actualizar ENERGY_OPTIONS
const oldEnergy = `// Opciones de nivel de energía
const ENERGY_OPTIONS = [
  { value: 'low', label: 'Baja', icon: 'battery_1_bar', modifier: -1 },
  { value: 'medium', label: 'Media', icon: 'battery_4_bar', modifier: 0 },
  { value: 'high', label: 'Alta', icon: 'battery_full', modifier: 1 }
];`;

const newEnergy = `// Opciones de nivel de energía - Mejorado v1.7 (sublabels con modificador)
const ENERGY_OPTIONS = [
  { value: 'low', label: 'Baja', sublabel: '-1 tarea', icon: 'battery_1_bar', modifier: -1 },
  { value: 'medium', label: 'Media', sublabel: 'normal', icon: 'battery_4_bar', modifier: 0 },
  { value: 'high', label: 'Alta', sublabel: '+1 tarea', icon: 'battery_full', modifier: 1 }
];`;

if (content.includes(oldEnergy)) {
  content = content.replace(oldEnergy, newEnergy);
  console.log('✓ ENERGY_OPTIONS actualizado');
  changes++;
} else {
  console.log('✗ ENERGY_OPTIONS no encontrado - probando alternativa...');
  const energyRegex = /\/\/ Opciones de nivel de energía[\s\S]*?const ENERGY_OPTIONS = \[[\s\S]*?\];/;
  if (energyRegex.test(content)) {
    content = content.replace(energyRegex, newEnergy);
    console.log('✓ ENERGY_OPTIONS actualizado (via regex)');
    changes++;
  }
}

// 3. Actualizar template de chips de TIEMPO para mostrar sublabel
const oldTimeChip = `\${TIME_OPTIONS.map(opt => \`
                  <button
                    type="button"
                    class="selector-chip"
                    data-time="\${opt.value}"
                    aria-pressed="false"
                    title="\${opt.label}"
                  >
                    <span class="material-symbols-outlined selector-chip__icon">\${opt.icon}</span>
                    <span class="selector-chip__label">\${opt.label}</span>
                  </button>
                \`).join('')}`;

const newTimeChip = `\${TIME_OPTIONS.map(opt => \`
                  <button
                    type="button"
                    class="selector-chip"
                    data-time="\${opt.value}"
                    aria-pressed="false"
                    title="\${opt.label} - \${opt.sublabel}"
                  >
                    <span class="material-symbols-outlined selector-chip__icon">\${opt.icon}</span>
                    <span class="selector-chip__label">\${opt.label}</span>
                    <span class="selector-chip__sublabel">\${opt.sublabel}</span>
                  </button>
                \`).join('')}`;

if (content.includes(oldTimeChip)) {
  content = content.replace(oldTimeChip, newTimeChip);
  console.log('✓ Template de tiempo actualizado');
  changes++;
} else {
  console.log('✗ Template de tiempo no encontrado exacto');
}

// 4. Actualizar template de chips de ENERGÍA para mostrar sublabel
const oldEnergyChip = `\${ENERGY_OPTIONS.map(opt => \`
                  <button
                    type="button"
                    class="selector-chip"
                    data-energy="\${opt.value}"
                    aria-pressed="false"
                    title="\${opt.label}"
                  >
                    <span class="material-symbols-outlined selector-chip__icon">\${opt.icon}</span>
                    <span class="selector-chip__label">\${opt.label}</span>
                  </button>
                \`).join('')}`;

const newEnergyChip = `\${ENERGY_OPTIONS.map(opt => \`
                  <button
                    type="button"
                    class="selector-chip"
                    data-energy="\${opt.value}"
                    aria-pressed="false"
                    title="\${opt.label} - \${opt.sublabel}"
                  >
                    <span class="material-symbols-outlined selector-chip__icon">\${opt.icon}</span>
                    <span class="selector-chip__label">\${opt.label}</span>
                    <span class="selector-chip__sublabel">\${opt.sublabel}</span>
                  </button>
                \`).join('')}`;

if (content.includes(oldEnergyChip)) {
  content = content.replace(oldEnergyChip, newEnergyChip);
  console.log('✓ Template de energía actualizado');
  changes++;
} else {
  console.log('✗ Template de energía no encontrado exacto');
}

// Guardar si hubo cambios
if (changes > 0) {
  fs.writeFileSync(file, content);
  console.log(`\n✓ Archivo guardado con ${changes} cambios`);
} else {
  console.log('\n✗ No se realizaron cambios');
}
