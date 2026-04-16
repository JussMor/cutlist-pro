import { IsoPanel } from "@/lib/domain/types";

export interface ScreenPoint {
  sx: number;
  sy: number;
}

export const ISO = {
  project(x: number, y: number, z: number, scale = 1): ScreenPoint {
    return {
      sx: (x - y) * scale * 0.866,
      sy: (x + y) * scale * 0.5 - z * scale,
    };
  },

  face(pts: [number, number, number][], scale: number): ScreenPoint[] {
    return pts.map(([x, y, z]) => this.project(x, y, z, scale));
  },

  poly(pts: ScreenPoint[]): string {
    return pts.map((p) => `${p.sx},${p.sy}`).join(" ");
  },

  sortPanels(panels: IsoPanel[]): IsoPanel[] {
    return [...panels].sort((a, b) => a.pos.x + a.pos.y - (b.pos.x + b.pos.y));
  },
};
