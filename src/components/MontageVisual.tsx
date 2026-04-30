import { CalcBreakdown } from "@/lib/calc";

export function MontageVisual({ layout }: { layout: CalcBreakdown["layout"] }) {
  const maxDim = 280;
  const scale = Math.min(maxDim / layout.sheetW, maxDim / layout.sheetH);
  const sw = layout.sheetW * scale;
  const sh = layout.sheetH * scale;
  const pw = (layout.rotated ? layout.pieceH : layout.pieceW) * scale;
  const ph = (layout.rotated ? layout.pieceW : layout.pieceH) * scale;

  let offsetX = 0;
  let offsetY = 0;
  let maxW = 0;
  let maxH = 0;

  if (layout.rects && layout.rects.length > 0) {
    layout.rects.forEach(rect => {
      maxW = Math.max(maxW, rect.x + rect.w);
      maxH = Math.max(maxH, rect.y + rect.h);
    });
  } else {
    maxW = layout.cols * (layout.rotated ? layout.pieceH : layout.pieceW);
    maxH = layout.rows * (layout.rotated ? layout.pieceW : layout.pieceH);
  }

  offsetX = Math.max(0, (layout.sheetW - maxW) / 2);
  offsetY = Math.max(0, (layout.sheetH - maxH) / 2);

  const cells = [];
  if (layout.rects) {
    layout.rects.forEach((rect, i) => {
      cells.push(
        <div
          key={i}
          className="absolute border-2 border-primary/60 bg-primary/10 rounded-sm flex items-center justify-center text-[8px] font-semibold text-primary"
          style={{ left: (rect.x + offsetX) * scale, top: (rect.y + offsetY) * scale, width: rect.w * scale - 1, height: rect.h * scale - 1 }}
        >
          {i + 1}
        </div>
      );
    });
  } else {
    const origPw = (layout.rotated ? layout.pieceH : layout.pieceW);
    const origPh = (layout.rotated ? layout.pieceW : layout.pieceH);
    for (let r = 0; r < layout.rows; r++) {
      for (let c = 0; c < layout.cols; c++) {
        cells.push(
          <div
            key={`${r}-${c}`}
            className="absolute border-2 border-primary/60 bg-primary/10 rounded-sm flex items-center justify-center text-[8px] font-semibold text-primary"
            style={{ left: (c * origPw + offsetX) * scale, top: (r * origPh + offsetY) * scale, width: origPw * scale - 1, height: origPh * scale - 1 }}
          >
            {r * layout.cols + c + 1}
          </div>
        );
      }
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center p-6 rounded-2xl bg-muted/30 border">
        <div className="relative bg-background border-2 border-foreground/30 shadow-lg rounded-md" style={{ width: sw, height: sh }}>
          {cells}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="px-3 py-2 rounded-lg bg-muted">
          <div className="text-muted-foreground text-[10px]">Feuille</div>
          <div className="font-semibold">{layout.sheetW} × {layout.sheetH} mm</div>
        </div>
        <div className="px-3 py-2 rounded-lg bg-muted">
          <div className="text-muted-foreground text-[10px]">Pièce</div>
          <div className="font-semibold">{layout.pieceW} × {layout.pieceH} mm</div>
        </div>
        <div className="px-3 py-2 rounded-lg gradient-brand-soft">
          <div className="text-muted-foreground text-[10px]">Disposition</div>
          <div className="font-semibold">{layout.rects ? "Optimisée (Mixte)" : `${layout.cols} × ${layout.rows}${layout.rotated ? " (rotation 90°)" : ""}`}</div>
        </div>
        <div className="px-3 py-2 rounded-lg gradient-brand-soft">
          <div className="text-muted-foreground text-[10px]">Total / feuille</div>
          <div className="font-semibold">{layout.rects ? layout.rects.length : layout.cols * layout.rows} poses</div>
        </div>
      </div>
    </div>
  );
}
