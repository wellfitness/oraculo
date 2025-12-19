#!/bin/bash
# Hook que se ejecuta ANTES de invocar typescript-eslint-fixer
# Obliga a leer la metodología de corrección

METODOLOGIA="docs/Metodología-corrección"

if [ -f "$METODOLOGIA" ]; then
  echo "📖 OBLIGATORIO para typescript-eslint-fixer:"
  echo ""
  echo "Debes leer y seguir ESTRICTAMENTE: $METODOLOGIA"
  echo ""
  echo "🎯 Metodología resumida:"
  echo "  1. UN archivo a la vez"
  echo "  2. Analizar TODOS los errores del archivo"
  echo "  3. Corregir (hooks > any > unused)"
  echo "  4. Verificar con npx tsc --noEmit"
  echo "  5. Commit granular"
  echo "  6. Actualizar docs/FASE-12-PROGRESS.md"
  echo "  7. Siguiente archivo"
  echo ""
  echo "❌ NO procesar múltiples archivos sin commits intermedios"
  echo "❌ NO usar scripts de corrección automática bulk"
  echo "✅ Calidad > Velocidad"
  echo ""
else
  echo "⚠️ ADVERTENCIA: No se encontró $METODOLOGIA"
fi
