# Deploy a Hostinger

Ejecuta el proceso completo de deploy del sitio Movimiento Funcional:

1. **Build de produccion**: Ejecuta `pnpm build` para generar los archivos estaticos en `/dist`
2. **Subir via FTP**: Ejecuta `node deploy.mjs` para subir todos los archivos a Hostinger

## Pasos a ejecutar:

```bash
cd D:/SOFTWARE/movimiento-funcional-web && pnpm build && node deploy.mjs
```

Al finalizar, verifica que el sitio este actualizado visitando https://movimientofuncional.com

Si hay errores de cache, recuerda que el usuario puede limpiar la cache desde el panel de Hostinger.
