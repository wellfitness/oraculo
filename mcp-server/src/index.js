#!/usr/bin/env node
/**
 * Oráculo MCP Server — Entry Point
 *
 * Servidor MCP compatible con cualquier cliente LLM:
 *   - Claude Desktop
 *   - Claude Code (CLI)
 *   - OpenAI (con MCP support)
 *   - Gemini
 *   - Hermes
 *   - OpenCode
 *   - Cualquier cliente MCP stdio
 *
 * Uso:
 *   node src/index.js --bridge /ruta/a/oraculo-bridge.json
 *
 * O via pnpm:
 *   pnpm start -- --bridge /ruta/a/oraculo-bridge.json
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { TOOL_DEFINITIONS, handleTool } from './tools.js';

// ─────────────────────────────────────────────────
// PARSEAR ARGUMENTOS
// ─────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { bridge: null };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--bridge' && args[i + 1]) {
      result.bridge = args[i + 1];
      i++;
    }
  }

  // También aceptar variable de entorno
  if (!result.bridge && process.env.ORACULO_BRIDGE_PATH) {
    result.bridge = process.env.ORACULO_BRIDGE_PATH;
  }

  return result;
}

// ─────────────────────────────────────────────────
// SERVIDOR MCP
// ─────────────────────────────────────────────────

async function main() {
  const { bridge: bridgePath } = parseArgs();

  if (!bridgePath) {
    console.error(
      '[Oráculo MCP] Error: Se requiere la ruta del bridge file.\n' +
      'Uso: node src/index.js --bridge /ruta/a/oraculo-bridge.json\n' +
      'O establece la variable de entorno: ORACULO_BRIDGE_PATH'
    );
    process.exit(1);
  }

  const server = new McpServer({
    name: 'oraculo',
    version: '1.0.0',
  });

  // Registrar todas las tools
  for (const toolDef of TOOL_DEFINITIONS) {
    // Convertir inputSchema JSON Schema a zod schema para el SDK
    const zodSchema = buildZodSchema(toolDef.inputSchema);

    server.tool(
      toolDef.name,
      toolDef.description,
      zodSchema,
      async (args) => {
        try {
          return await handleTool(toolDef.name, args, bridgePath);
        } catch (err) {
          return {
            content: [{
              type: 'text',
              text: `❌ Error en ${toolDef.name}: ${err.message}`
            }],
            isError: true,
          };
        }
      }
    );
  }

  // Conectar via stdio (compatible con todos los clientes MCP)
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log solo a stderr (stdout está reservado para el protocolo MCP)
  console.error(`[Oráculo MCP] Servidor iniciado. Bridge: ${bridgePath}`);
}

// ─────────────────────────────────────────────────
// CONVERTIR JSON SCHEMA → ZOD
// ─────────────────────────────────────────────────

/**
 * Convierte un JSON Schema simple a un objeto de zod schemas
 * compatible con el MCP SDK.
 */
function buildZodSchema(inputSchema) {
  if (!inputSchema?.properties) return {};

  const shape = {};

  for (const [key, prop] of Object.entries(inputSchema.properties)) {
    const isRequired = (inputSchema.required || []).includes(key);
    let zodField;

    if (prop.enum) {
      zodField = z.enum(prop.enum);
    } else if (prop.type === 'number') {
      zodField = z.number();
    } else if (prop.type === 'boolean') {
      zodField = z.boolean();
    } else {
      zodField = z.string();
    }

    // Añadir descripción
    if (prop.description) {
      zodField = zodField.describe(prop.description);
    }

    // Hacer opcional si no es requerido
    if (!isRequired) {
      zodField = zodField.optional();
    }

    shape[key] = zodField;
  }

  return shape;
}

// ─────────────────────────────────────────────────
// ARRANQUE
// ─────────────────────────────────────────────────

main().catch(err => {
  console.error('[Oráculo MCP] Error fatal:', err);
  process.exit(1);
});
