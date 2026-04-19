# Propuesta: Artefactos Parametrizados para CutList Pro

## 1. Objetivo

Pasar de una edicion basada en filas de paneles (muchas celdas manuales) a una edicion basada en componentes de alto nivel (artefactos), por ejemplo:

- Cajon completo
- Puertas
- Zapatera d
- Modulos especiales

El usuario configura parametros del artefacto y el sistema genera/actualiza automaticamente las piezas de corte, materiales, operaciones y preview.

## 2. Problema actual

El flujo actual funciona, pero escala mal cuando crecen variantes:

- La tabla de corte crece demasiado.
- Variantes (ej. cajones) se modelan como piezas sueltas.
- Aumenta el riesgo de errores manuales en medidas, holguras y cantidades.
- Mantener reglas por tipo de herraje/artefacto se vuelve costoso.

## 3. Vision de UX

### Flujo propuesto

1. Usuario agrega un artefacto en un modulo (ej. "Cajon").
2. Selecciona variante y parametros.
3. El motor genera paneles derivados.
4. El editor muestra:

- Vista Artefactos (principal)
- Vista Paneles derivados (secundaria/avanzada)

5. Cualquier cambio de parametro regenera paneles y actualiza preview/costos/optimizacion.

### Resultado

Menos edicion manual, menos errores, mejor escalabilidad.

## 4. Arquitectura propuesta

## 4.1 Entidades nuevas

- ArtifactInstance: instancia editable por usuario.
- ArtifactDefinition: plugin con schema + reglas + generador.
- DerivedPanel: panel generado desde un artefacto.

## 4.2 Contrato del plugin de artefacto

Cada artefacto implementa una interfaz comun:

- `id`
- `label`
- `schema` (campos editables)
- `defaults`
- `validate(params, context)`
- `generate(params, context)` -> paneles + operaciones
- `preview?(params, context)` -> hints para isometrica

Esto evita if/else gigantes en el core.

## 4.3 Relacion con el estado actual

- `editablePanels` deja de ser entrada principal del usuario y pasa a ser salida derivada.
- Se mantiene compatibilidad: paneles manuales conviviran con paneles derivados.
- `preparePanelsByRole` se mantiene, pero recibe tambien paneles derivados.

## 5. Modelo de datos (resumen)

Agregar en dominio:

- `ArtifactType = "drawer" | "door" | "shelf-pack" | ...`
- `ArtifactInstance`
  - id
  - type
  - moduleId
  - name
  - params (json)
  - enabled
- `Panel.source`
  - `kind: "manual" | "artifact"`
  - `artifactId?`
  - `artifactPartKey?`

Guardar en proyectos:

- `workspace.artifacts: ArtifactInstance[]`

## 6. MVP recomendado (Fase 1)

Implementar solo `drawer` como primer artefacto real.

### 6.1 Drawer v1 parametros

- cantidad
- ancho frente
- alto frente
- fondo cajon
- sistema corredera (`side-mount`, `undermount`)
- espesor material
- holguras
- material asignado

### 6.2 Drawer v1 genera

- frente
- 2 laterales
- trasera
- fondo
- (opcional) frente interior segun variante

### 6.3 UI v1

- Nuevo panel "Artefactos del modulo".
- Boton "Agregar artefacto".
- Form dinamico por tipo.
- Boton "Ver paneles derivados" para auditoria.

## 7. Fases de implementacion

## Fase A - Fundacion

- Tipos base y registro de artefactos.
- Motor `regenerateDerivedPanels(artifacts, manualPanels, context)`.
- Guardado/carga de artifacts en proyectos.

## Fase B - Drawer v1

- Plugin drawer completo.
- UI minima de alta/edicion.
- Integracion con preview + optimizacion.

## Fase C - Escalado

- Artefactos adicionales (puertas, divisiones complejas, accesorios).
- Presets por industria.
- Validaciones avanzadas y reglas de fabricacion.

## 8. Compatibilidad y migracion

- No romper proyectos existentes.
- Si un proyecto no tiene `artifacts`, funciona como hoy.
- Migracion progresiva: usuario puede convertir grupos de paneles manuales a artefacto.

## 9. Riesgos y mitigacion

- Riesgo: complejidad inicial del motor.
  - Mitigacion: empezar con un solo artefacto (drawer).
- Riesgo: conflictos entre panel manual y derivado.
  - Mitigacion: metadatos de origen + bloqueo parcial de edicion en panel derivado.
- Riesgo: UX confusa.
  - Mitigacion: separar claramente "Artefactos" y "Paneles".

## 10. Criterios de exito (MVP)

- Crear/editar un drawer sin tocar filas manuales.
- Regeneracion consistente tras cambios de parametros.
- Preview y lista de corte actualizan en tiempo real.
- Proyecto guarda/carga artifacts sin perdida.
- No regresiones en optimizacion actual.

## 11. Entregables sugeridos

1. PR 1: tipos + registro de artefactos + persistencia.
2. PR 2: drawer plugin + generador.
3. PR 3: UI de artefactos + vista de paneles derivados.
4. PR 4: conversion manual->artifact + ajustes finales UX.

## 12. Decision recomendada

Aprobar MVP con `drawer` como primer artefacto, manteniendo paneles manuales en paralelo durante la transicion.

Esto te da escalabilidad real sin romper lo que ya funciona en taller hoy.
