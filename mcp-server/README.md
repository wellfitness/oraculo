# Oráculo MCP Server

Conecta tu agente LLM favorito con tu agenda personal Oráculo. Lee tareas, hábitos, diario y proyectos. Añade entradas y gestiona prioridades desde cualquier conversación con IA.

## Instalación

```bash
# En la carpeta del proyecto
cd mcp-server
pnpm install
```

## ⚠️ Requisito arquitectónico (léelo primero)

La **carpeta bridge** vive en tu **disco local** — la elige la app Oráculo desde Chrome/Edge mediante la File System Access API. Por eso, **el MCP server debe ejecutarse en la misma máquina** que tiene esa carpeta.

Dentro de la carpeta hay **dos archivos, cada uno con un único escritor** (diseño que elimina de raíz cualquier race condition entre la app y el servidor):

| Archivo | Lo escribe | Lo lee | Contenido |
|---------|-----------|--------|-----------|
| `oraculo-bridge.json` | **solo la app** | el servidor | tus datos + acuses de cambios aplicados |
| `oraculo-queue.json` | **solo el servidor** | la app | la cola de cambios propuestos por el agente |

Consecuencia práctica para cada cliente:

| Tipo de cliente | ¿Funciona? | Por qué |
|-----------------|------------|---------|
| **Cliente local** (Claude Desktop, Claude Code, Gemini CLI, OpenAI Agents SDK en tu PC, host local de Hermes) | ✅ Sí | Lanza `node` y lee el archivo local directamente |
| **Agente 100% en la nube** (web de MiniMax Agent, ChatGPT web) | ⚠️ Solo vía host local | No accede a tu disco ni lanza procesos; necesita un puente MCP local en tu máquina |

El server es **stdio puro y agnóstico al cliente**: el mismo `index.js` sirve a todos. Lo único que cambia entre clientes es el archivo de configuración.

> En Windows usa rutas con `/` o `\\` dobles. La ruta de `--bridge-dir` debe ser la misma **carpeta** que elegiste en Oráculo → Configuración → Agente IA.

---

## Configuración por cliente

### Claude Desktop

Edita `%APPDATA%\Claude\claude_desktop_config.json` (Windows) o `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "oraculo": {
      "command": "node",
      "args": [
        "D:/SOFTWARE/oraculo/mcp-server/src/index.js",
        "--bridge-dir",
        "D:/SOFTWARE/oraculo/agente-ia"
      ]
    }
  }
}
```

### Claude Code (CLI)

```bash
claude mcp add oraculo \
  node D:/SOFTWARE/oraculo/mcp-server/src/index.js \
  --bridge-dir D:/SOFTWARE/oraculo/agente-ia
```

O en `.mcp.json` del proyecto (ya configurado en este repo):
```json
{
  "mcpServers": {
    "oraculo": {
      "command": "node",
      "args": ["./mcp-server/src/index.js", "--bridge-dir", "./agente-ia"]
    }
  }
}
```

### MiniMax

MiniMax Agent admite servidores MCP con el formato estándar `mcpServers`. Configúralo con la **ruta absoluta** (la app Agent debe correr en tu máquina para alcanzar el archivo local):

```json
{
  "mcpServers": {
    "oraculo": {
      "command": "node",
      "args": [
        "D:/SOFTWARE/oraculo/mcp-server/src/index.js",
        "--bridge-dir",
        "D:/SOFTWARE/oraculo/agente-ia"
      ]
    }
  }
}
```

> Si usas MiniMax **desde la web** (nube), no podrá leer tu archivo local. En ese caso conéctalo a través de un host MCP local (ver "Agentes en la nube" más abajo).

### Hermes (agent)

Hermes consume MCP por stdio igual que el resto. Si tu host de Hermes acepta `mcpServers`, usa el bloque estándar; si solo acepta `command`/`env`, usa la variable de entorno:

```json
{
  "command": "node",
  "args": ["D:/SOFTWARE/oraculo/mcp-server/src/index.js"],
  "env": {
    "ORACULO_BRIDGE_DIR": "D:/SOFTWARE/oraculo/agente-ia"
  }
}
```

Equivalente desde terminal:
```bash
ORACULO_BRIDGE_DIR="D:/SOFTWARE/oraculo/agente-ia" node src/index.js
```

### Gemini (CLI)

Gemini CLI lee `~/.gemini/settings.json`. Añade el server bajo `mcpServers`:

```json
{
  "mcpServers": {
    "oraculo": {
      "command": "node",
      "args": [
        "D:/SOFTWARE/oraculo/mcp-server/src/index.js",
        "--bridge-dir",
        "D:/SOFTWARE/oraculo/agente-ia"
      ]
    }
  }
}
```

### OpenAI

El **OpenAI Agents SDK** soporta MCP por stdio. En Python (ejecutándose en tu PC):

```python
from agents.mcp import MCPServerStdio

oraculo = MCPServerStdio(params={
    "command": "node",
    "args": [
        "D:/SOFTWARE/oraculo/mcp-server/src/index.js",
        "--bridge-dir", "D:/SOFTWARE/oraculo/agente-ia",
    ],
})
# pásalo a tu Agent(..., mcp_servers=[oraculo])
```

> ChatGPT en la web no puede leer tu archivo local; usa el Agents SDK local o un host MCP local.

### Otros clientes (Cursor, OpenCode, Zed)

Todos usan el mismo patrón stdio. Cursor/OpenCode: bloque `mcpServers` idéntico al de Claude Desktop en `.cursor/mcp.json` o `.mcp.json`. Zed usa `context_servers` en `~/.config/zed/settings.json` con la misma terna `command`/`args`.

### Agentes en la nube (puente local)

Si quieres usar un agente cloud (MiniMax web, ChatGPT web), necesitas un **host MCP local** en tu máquina que exponga el server por red (por ejemplo vía un proxy `mcp-remote` o un túnel). El server por sí solo es stdio local; cubrir este caso queda fuera del alcance actual.

## Requisitos previos

1. **Sincronizar desde Oráculo**: Abre la app → Configuración → Agente IA → activa la sincronización y elige la **carpeta** del Agente IA. Pasa esa misma carpeta al servidor con `--bridge-dir`.
2. **Node.js 18+** instalado.
3. **pnpm** instalado (`npm install -g pnpm`).

## Tools disponibles

### Lectura
| Tool | Descripción |
|------|-------------|
| `get_bridge_status` | Estado de la conexión |
| `get_daily_overview` | Resumen del día completo |
| `get_tasks` | Tareas por horizonte (daily/weekly/monthly/quarterly/backlog) |
| `get_projects` | Proyectos con progreso |
| `get_active_habit` | Hábito activo y racha |
| `get_journal_entries` | Entradas del diario |
| `get_values` | Brújula de valores |
| `get_achievements` | Logros por período |
| `get_life_wheel` | Rueda de la vida |
| `get_burkeman_context` | Contexto filosófico Burkeman del día |

### Escritura (requieren aprobación en la app)
| Tool | Descripción |
|------|-------------|
| `add_journal_entry` | Nueva entrada en el diario |
| `add_task` | Nueva tarea en un horizonte |
| `complete_task` | Marcar tarea como completada |
| `add_spontaneous_achievement` | Logro espontáneo (done list) |
| `set_roca_principal` | Establecer la roca del día |

## Sistema de aprobación

Las escrituras del agente **no se aplican automáticamente**. Se encolan en `oraculo-queue.json` y aparecen en Oráculo como "cambios pendientes del agente". Tú decides cuáles aplicar; la app registra el acuse en `oraculo-bridge.json` y el servidor poda la cola.

Esto mantiene el control total sobre tus datos y evita conflictos con el sync de Google Drive.

## Desarrollo

```bash
pnpm dev  # Node --watch para desarrollo
```
