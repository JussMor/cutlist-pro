# CutList Pro — Decisiones de arquitectura

## Grid & Subgrid — Diseño aprobado

### Concepto
El editor usa un sistema de **grid y subgrid** para modelar cualquier forma de mueble compuesta de rectángulos.

### Grid (nivel módulo)
La estructura actual `columns[x].cells[y]` YA ES un grid 2D.

**Único cambio necesario en el modelo:**
```typescript
interface StudioCell {
  // campos existentes sin tocar...
  active?: boolean  // false = hueco/void. Omitido = true (retrocompatible)
}
```

**Dos reglas nuevas en geometry.ts:**
- **Deck entre celdas**: generar solo si al menos una de las dos celdas adyacentes es `active`
- **Side panel entre columnas**: iterar por celda (no por módulo completo), generar solo si `col[x].cells[y].active || col[x+1].cells[y].active`

**Nada más cambia**: despiece, cutlist, optimizer, store mutations, proyectos existentes → sin tocar.

### Subgrid (nivel celda)
Mismo concepto aplicado dentro de una celda. Una celda puede tener su propio grid interno de subceldas activas/inactivas.

```typescript
interface StudioSubCell {
  id: string
  row: number
  col: number
  active?: boolean
}

interface StudioCell {
  // campos existentes...
  active?: boolean
  subgrid?: {
    rows: number
    cols: number
    cells: StudioSubCell[]
  }
}
```

Permite formas dentro de un módulo: media repisa, divisores parciales, huecos internos.

### Lo que habilita
- Cualquier forma generada en un grid rectangular (O, L, U, T, C...)
- Huecos internos dentro de módulos (subgrid)
- Retrocompatible con todos los proyectos existentes
