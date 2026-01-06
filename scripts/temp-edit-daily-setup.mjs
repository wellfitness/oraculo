import fs from 'fs';

const file = 'D:/SOFTWARE/oraculo/js/components/daily-setup-modal.js';
let content = fs.readFileSync(file, 'utf8');

// Cambiar las opciones de tiempo para ser más descriptivas
const oldTimeOptions = `// Opciones de tiempo disponible
const TIME_OPTIONS = [
  { value: '2h', label: '2h', icon: 'hourglass_empty', limit: 1 },
  { value: '4h', label: '4h', icon: 'hourglass_bottom', limit: 2 },
  { value: '6h', label: '6h', icon: 'hourglass_top', limit: 3 },
  { value: 'full', label: 'Full', icon: 'wb_sunny', limit: 3 }
];`;

const newTimeOptions = `// Opciones de tiempo disponible - Mejorado v1.7
const TIME_OPTIONS = [
  { value: '2h', label: '2h', sublabel: '1 tarea', icon: 'timer', limit: 1 },
  { value: '4h', label: '4h', sublabel: '2 tareas', icon: 'schedule', limit: 2 },
  { value: '6h', label: '6h', sublabel: '3 tareas', icon: 'hourglass_top', limit: 3 },
  { value: 'full', label: 'Día', sublabel: '3 tareas', icon: 'wb_sunny', limit: 3 }
];`;

// También cambiar las opciones de energía para mostrar el modificador
const oldEnergyOptions = `// Opciones de nivel de energía
const ENERGY_OPTIONS = [
  { value: 'low', label: 'Baja', icon: 'battery_1_bar', modifier: -1 },
  { value: 'medium', label: 'Media', icon: 'battery_4_bar', modifier: 0 },
  { value: 'high', label: 'Alta', icon: 'battery_full', modifier: 1 }
];`;

const newEnergyOptions = `// Opciones de nivel de energía - Mejorado v1.7
const ENERGY_OPTIONS = [
  { value: 'low', label: 'Baja', sublabel: '-1 tarea', icon: 'battery_1_bar', modifier: -1 },
  { value: 'medium', label: 'Media', sublabel: 'normal', icon: 'battery_4_bar', modifier: 0 },
  { value: 'high', label: 'Alta', sublabel: '+1 tarea', icon: 'battery_full', modifier: 1 }
];`;

// Actualizar el renderizado de los chips para incluir sublabel
const oldChipRender = `<button
                    type="button"
                    class="selector-chip"
                    data-time="\${opt.value}"
                    aria-pressed="false"
                    title="\${opt.label}"
                  >
                    <span class="material-symbols-outlined selector-chip__icon">\${opt.icon}</span>
                    <span class="selector-chip__label">\${opt.label}</span>
                  </button>`;

const newChipRender = `<button
                    type="button"
                    class="selector-chip"
                    data-time="\${opt.value}"
                    aria-pressed="false"
                    title="\${opt.label} - \${opt.sublabel}"
                  >
                    <span class="material-symbols-outlined selector-chip__icon">\${opt.icon}</span>
                    <span class="selector-chip__label">\${opt.label}</span>
                    \${opt.sublabel ? \`<span class="selector-chip__sublabel">\${opt.sublabel}</span>\` : ''}
                  </button>`;

// También para energía
const oldEnergyChipRender = `<button
                    type="button"
                    class="selector-chip"
                    data-energy="\${opt.value}"
                    aria-pressed="false"
                    title="\${opt.label}"
                  >
                    <span class="material-symbols-outlined selector-chip__icon">\${opt.icon}</span>
                    <span class="selector-chip__label">\${opt.label}</span>
                  </button>`;

const newEnergyChipRender = `<button
                    type="button"
                    class="selector-chip"
                    data-energy="\${opt.value}"
                    aria-pressed="false"
                    title="\${opt.label} - \${opt.sublabel}"
                  >
                    <span class="material-symbols-outlined selector-chip__icon">\${opt.icon}</span>
                    <span class="selector-chip__label">\${opt.label}</span>
                    \${opt.sublabel ? \`<span class="selector-chip__sublabel">\${opt.sublabel}</span>\` : ''}
                  </button>`;

// Aplicar cambios
if (content.includes(oldTimeOptions)) {
  content = content.replace(oldTimeOptions, newTimeOptions);
  console.log('✓ TIME_OPTIONS actualizado');
} else {
  console.log('✗ No se encontró TIME_OPTIONS original');
}

if (content.includes(oldEnergyOptions)) {
  content = content.replace(oldEnergyOptions, newEnergyOptions);
  console.log('✓ ENERGY_OPTIONS actualizado');
} else {
  console.log('✗ No se encontró ENERGY_OPTIONS original');
}

if (content.includes(oldChipRender)) {
  content = content.replace(oldChipRender, newChipRender);
  console.log('✓ Time chip render actualizado');
} else {
  console.log('✗ No se encontró time chip render original');
}

if (content.includes(oldEnergyChipRender)) {
  content = content.replace(oldEnergyChipRender, newEnergyChipRender);
  console.log('✓ Energy chip render actualizado');
} else {
  console.log('✗ No se encontró energy chip render original');
}

fs.writeFileSync(file, content);
console.log('✓ Archivo guardado');
