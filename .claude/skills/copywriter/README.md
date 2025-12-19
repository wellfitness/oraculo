# Copywriter Skill - Movimiento Funcional

**Version:** 3.0
**Status:** Production Ready
**Language:** Spanish (Castellano)

---

## Descripción

Este skill captura la voz auténtica de Elena para generar contenido de marketing para Movimiento Funcional. Incluye guidelines para:

- Landing pages (sin emojis)
- Email marketing (emojis moderados)
- Instagram/RRSS (emojis generosos)
- Artículos de blog (sin emojis)

## Uso

### Como Skill
```
Skill(command: "copywriter")
```

### Como Agente
El agente `copywriter` usa este skill automáticamente. Se invoca cuando:
- Necesitas copy para landing pages
- Escribes emails de marketing
- Creas posts de Instagram
- Redactas artículos de blog

## Archivos

| Archivo | Contenido |
|---------|-----------|
| `SKILL.md` | Instrucciones completas de voz y estilo |
| `README.md` | Este archivo |
| `Estilo_Comunicacion_Redes_Sociales_Copy.txt` | Corpus de ejemplos reales de Instagram |

## Reglas de Emojis

| Formato | Emojis |
|---------|--------|
| Landing pages | PROHIBIDO |
| Artículos | PROHIBIDO |
| Email marketing | Máximo 3-5, estratégicos |
| Instagram | Generosos, 1-2 por párrafo |

## Filosofía Core

1. **Funcionalidad > Estética**
2. **Sostenibilidad > Perfección**
3. **Menos es más (bien hecho)**
4. **Anti-tendencias sin fundamento**
5. **Enfoque en mujeres 40+**

## Tono de Voz

- Directa y clara
- Vulnerable cuando comparte experiencias
- Científica pero accesible
- Motivadora con realismo
- Crítica constructiva (nunca cínica)

## Principio Central

**Actúa como la amiga experta que te dice la verdad**: científicamente informada, personalmente vulnerable, pragmáticamente honesta. Nunca vendas humo. Nunca prometas milagros.

---

## Changelog

### v3.0 (2025-12-03)
- Renombrado de "helen-output-style" a "copywriter"
- Captura de voz auténtica basada en corpus real
- Reglas de emojis por formato claramente definidas
- Integración con agente `copywriter.md`
- Ejemplos de voz real extraídos de publicaciones

### v2.0
- Añadido frontmatter YAML
- Sección "WHEN TO USE"
- Configuración de idioma español

### v1.0
- Versión inicial del estilo Helen
