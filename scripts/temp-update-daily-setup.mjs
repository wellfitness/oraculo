import fs from 'fs';

const path = 'D:/SOFTWARE/oraculo/js/modules/daily-setup.js';
let content = fs.readFileSync(path, 'utf8');

// Add sublabel span after label for both TIME and ENERGY templates
// Pattern: <span class="selector-chip__label">${opt.label}</span>\n                </button>
// Replace with: same + sublabel span

const oldPattern = `<span class="selector-chip__label">\${opt.label}</span>
                </button>`;

const newPattern = `<span class="selector-chip__label">\${opt.label}</span>
                  <span class="selector-chip__sublabel">\${opt.sublabel}</span>
                </button>`;

// Replace all occurrences (TIME and ENERGY)
content = content.split(oldPattern).join(newPattern);

fs.writeFileSync(path, content);
console.log('Updated daily-setup.js with sublabel spans');
