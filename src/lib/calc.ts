// Pricing calculation engine for Oprisma Design

export interface CalcInput {
  productCategory: string;
  hasPages: boolean;
  hasCover: boolean;
  // size in mm of finished product
  finishedW: number;
  finishedH: number;
  bleed: number; // mm
  quantity: number;
  // paper sheet (raw)
  sheetW: number;
  sheetH: number;
  paperPricePerSheet: number; // price for the chosen sheet size (assumed at SRA3 base; we use chosen sheet size area for scaling later if needed)
  paperWeight: number;
  // printing
  printSetupCost: number;
  printCostPerSheet: number;
  rectoVerso: boolean;
  rvMultiplier: number;
  // catalog
  innerPages: number;
  coverPaperPricePerSheet: number;
  // finitions: array of {price, unit: 'unit'|'sqm', qty?}
  finitions: { price: number; unit: 'unit' | 'sqm'; name: string }[];
  // pelliculage: { pricePerSqm, recto: boolean, verso: boolean }
  pelliculages: { pricePerSqm: number; name: string }[];
  // design
  addDesign: boolean;
  designPercentage: number; // e.g. 35
  // large format: price per sqm (when category large_format we use printCostPerSheet as 0 and compute differently). For simplicity treat as per-sqm price stored in printCostPerSheet when isLargeFormat.
  isLargeFormat?: boolean;
  largeFormatPricePerSqm?: number;
  layoutPreference?: 'horizontal' | 'vertical' | 'optimal';
  // UI/UX & Digital hourly calculation
  isUiUx?: boolean;
  hourlyRate?: number;
  hours?: number;
  screenCount?: number;
  hoursPerScreen?: number;
  uiUxServices?: { name: string; hours: number; price?: number }[];
  // Commercial Discount (Remise)
  discountType?: 'percent' | 'fixed';
  discountValue?: number;
}

export interface CalcStep {
  category: string;       // grouping: 'layout' | 'paper' | 'print' | 'finition' | 'pelliculage' | 'design' | 'ui_ux' | 'total'
  label: string;          // human readable label
  formula: string;        // the formula used
  value: number | string; // computed result
  unit: string;           // 'DA' | 'feuilles' | 'mm' | 'poses' | 'm²' | '%' | 'heures' | 'DA/h' | ''
}

export interface CalcBreakdown {
  upPerSheet: number;
  sheetsNeeded: number;
  paperCost: number;
  coverSheetsNeeded: number;
  coverPaperCost: number;
  printCost: number;
  finitionCost: number;
  pelliculageCost: number;
  totalPaperCost: number;
  subtotal: number;
  designCost: number;
  total: number;
  // Discount breakdown
  discountAmount?: number;
  discountPercentage?: number;
  discountType?: 'percent' | 'fixed';
  discountValue?: number;
  // UI/UX breakdown
  isUiUx?: boolean;
  uiUxCost?: number;
  uiUxHours?: number;
  uiUxHourlyRate?: number;
  // visual layout helpers
  layout: {
    rows: number;
    cols: number;
    pieceW: number;
    pieceH: number;
    sheetW: number;
    sheetH: number;
    rotated: boolean;
    rects: { x: number; y: number; w: number; h: number; rotated: boolean }[];
  };
  notes: string[];
  // Detailed audit trail
  steps: CalcStep[];
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  rotated: boolean;
}

export function fitOnSheet(pieceW: number, pieceH: number, sheetW: number, sheetH: number, bleed: number, layoutPreference: 'horizontal' | 'vertical' | 'optimal' = 'optimal') {
  const pw = pieceW + bleed * 2;
  const ph = pieceH + bleed * 2;

  function evaluate(mainW: number, mainH: number, rotMain: boolean, allowMixed: boolean) {
    const cols = Math.floor(sheetW / mainW);
    const rows = Math.floor(sheetH / mainH);
    const mainUp = cols * rows;

    if (!allowMixed) {
      return { total: mainUp, pattern: 'None', cols, rows, rotMain, rightCols: 0, rightRows: 0, botCols: 0, botRows: 0 };
    }

    const rotW = mainH;
    const rotH = mainW;

    // Pattern A: Cut right offcut first (full height)
    const rightW_A = sheetW - cols * mainW;
    const rightH_A = sheetH;
    const rightCols_A = Math.floor(rightW_A / rotW);
    const rightRows_A = Math.floor(rightH_A / rotH);
    const rightUp_A = rightCols_A * rightRows_A;

    const botW_A = cols * mainW;
    const botH_A = sheetH - rows * mainH;
    const botCols_A = Math.floor(botW_A / rotW);
    const botRows_A = Math.floor(botH_A / rotH);
    const botUp_A = botCols_A * botRows_A;

    const totalA = mainUp + rightUp_A + botUp_A;

    // Pattern B: Cut bottom offcut first (full width)
    const botW_B = sheetW;
    const botH_B = sheetH - rows * mainH;
    const botCols_B = Math.floor(botW_B / rotW);
    const botRows_B = Math.floor(botH_B / rotH);
    const botUp_B = botCols_B * botRows_B;

    const rightW_B = sheetW - cols * mainW;
    const rightH_B = rows * mainH;
    const rightCols_B = Math.floor(rightW_B / rotW);
    const rightRows_B = Math.floor(rightH_B / rotH);
    const rightUp_B = rightCols_B * rightRows_B;

    const totalB = mainUp + botUp_B + rightUp_B;

    if (totalA >= totalB) {
      return { total: totalA, pattern: 'A', cols, rows, rotMain, rightCols: rightCols_A, rightRows: rightRows_A, botCols: botCols_A, botRows: botRows_A };
    } else {
      return { total: totalB, pattern: 'B', cols, rows, rotMain, rightCols: rightCols_B, rightRows: rightRows_B, botCols: botCols_B, botRows: botRows_B };
    }
  }

  const eval1 = evaluate(pw, ph, false, layoutPreference === 'optimal');
  const eval2 = evaluate(ph, pw, true, layoutPreference === 'optimal');

  let best;
  if (layoutPreference === 'horizontal') {
    best = eval1;
  } else if (layoutPreference === 'vertical') {
    best = eval2;
  } else {
    best = eval1.total >= eval2.total ? eval1 : eval2;
  }

  const rects: Rect[] = [];
  const mainW = best.rotMain ? ph : pw;
  const mainH = best.rotMain ? pw : ph;
  const altW = best.rotMain ? pw : ph;
  const altH = best.rotMain ? ph : pw;

  // Main grid
  for (let r = 0; r < best.rows; r++) {
    for (let c = 0; c < best.cols; c++) {
      rects.push({ x: c * mainW, y: r * mainH, w: mainW, h: mainH, rotated: best.rotMain });
    }
  }

  if (best.pattern === 'A') {
    // Right offcut
    const startX = best.cols * mainW;
    for (let r = 0; r < best.rightRows; r++) {
      for (let c = 0; c < best.rightCols; c++) {
        rects.push({ x: startX + c * altW, y: r * altH, w: altW, h: altH, rotated: !best.rotMain });
      }
    }
    // Bot offcut
    const startY = best.rows * mainH;
    for (let r = 0; r < best.botRows; r++) {
      for (let c = 0; c < best.botCols; c++) {
        rects.push({ x: c * altW, y: startY + r * altH, w: altW, h: altH, rotated: !best.rotMain });
      }
    }
  } else {
    // Bot offcut
    const startY = best.rows * mainH;
    for (let r = 0; r < best.botRows; r++) {
      for (let c = 0; c < best.botCols; c++) {
        rects.push({ x: c * altW, y: startY + r * altH, w: altW, h: altH, rotated: !best.rotMain });
      }
    }
    // Right offcut
    const startX = best.cols * mainW;
    for (let r = 0; r < best.rightRows; r++) {
      for (let c = 0; c < best.rightCols; c++) {
        rects.push({ x: startX + c * altW, y: r * altH, w: altW, h: altH, rotated: !best.rotMain });
      }
    }
  }

  return { 
    up: best.total, 
    cols: best.cols, 
    rows: best.rows, 
    rotated: best.rotMain, 
    pw: best.rotMain ? ph : pw, 
    ph: best.rotMain ? pw : ph,
    rects 
  };
}

export function calculate(input: CalcInput): CalcBreakdown {
  const notes: string[] = [];
  const steps: CalcStep[] = [];

  // UI/UX: Hourly rate × hours calculation
  if (input.isUiUx || input.productCategory === 'ui_ux') {
    const hourlyRate = Number(input.hourlyRate) || 2500;
    const baseHours = Math.max(0, Number(input.hours) || 0);

    steps.push({
      category: 'ui_ux',
      label: 'Taux horaire UI/UX',
      formula: '',
      value: hourlyRate,
      unit: 'DA/h'
    });

    if (input.screenCount && input.screenCount > 0) {
      steps.push({
        category: 'ui_ux',
        label: "Nombre d'écrans / maquettes",
        formula: `${input.screenCount} écrans`,
        value: input.screenCount,
        unit: 'écrans'
      });
    }

    steps.push({
      category: 'ui_ux',
      label: 'Temps estimé (base)',
      formula: `${baseHours} heures`,
      value: baseHours,
      unit: 'heures'
    });

    const baseCost = baseHours * hourlyRate;
    steps.push({
      category: 'ui_ux',
      label: 'Conception UI/UX',
      formula: `${baseHours}h × ${hourlyRate} DA/h`,
      value: Math.round(baseCost),
      unit: 'DA'
    });

    let extraHours = 0;
    let extraCost = 0;
    if (input.uiUxServices && input.uiUxServices.length > 0) {
      input.uiUxServices.forEach((srv) => {
        const h = Number(srv.hours) || 0;
        const c = srv.price !== undefined ? Number(srv.price) : h * hourlyRate;
        extraHours += h;
        extraCost += c;
        steps.push({
          category: 'ui_ux',
          label: `Option: ${srv.name}`,
          formula: srv.price !== undefined ? `${srv.price} DA` : `${h}h × ${hourlyRate} DA/h`,
          value: Math.round(c),
          unit: 'DA'
        });
      });
    }

    const totalHours = baseHours + extraHours;
    const subtotal = baseCost + extraCost;
    const qty = Math.max(1, input.quantity || 1);
    const total = subtotal * qty;

    steps.push({
      category: 'total',
      label: 'Sous-total UI/UX',
      formula: extraCost > 0 ? `${Math.round(baseCost)} + ${Math.round(extraCost)}` : `${Math.round(subtotal)}`,
      value: Math.round(subtotal),
      unit: 'DA'
    });

    if (qty > 1) {
      steps.push({
        category: 'total',
        label: `Quantité (${qty} projets)`,
        formula: `${Math.round(subtotal)} × ${qty}`,
        value: Math.round(total),
        unit: 'DA'
      });
    }

    const totalBeforeDiscount = total;
    const discountVal = Number(input.discountValue) || 0;
    let discountAmount = 0;
    if (discountVal > 0) {
      if (input.discountType === 'fixed') {
        discountAmount = Math.min(discountVal, totalBeforeDiscount);
      } else {
        discountAmount = (totalBeforeDiscount * discountVal) / 100;
      }
    }
    const finalTotal = Math.max(0, totalBeforeDiscount - discountAmount);

    if (discountAmount > 0) {
      steps.push({
        category: 'total',
        label: input.discountType === 'fixed' ? 'Remise commerciale' : `Remise commerciale (${discountVal}%)`,
        formula: `-${Math.round(discountAmount)} DA`,
        value: -Math.round(discountAmount),
        unit: 'DA'
      });
    }

    steps.push({
      category: 'total',
      label: discountAmount > 0 ? 'TOTAL FINAL NET TTC' : 'TOTAL FINAL TTC',
      formula: discountAmount > 0 ? `${Math.round(totalBeforeDiscount)} - ${Math.round(discountAmount)}` : `${Math.round(finalTotal)} DA`,
      value: Math.round(finalTotal),
      unit: 'DA'
    });

    steps.push({
      category: 'total',
      label: 'Prix unitaire net',
      formula: `${Math.round(finalTotal)} ÷ ${qty}`,
      value: Math.round(finalTotal / qty),
      unit: 'DA'
    });

    notes.push(`Prestation UI/UX : ${totalHours}h estimées au taux horaire de ${formatDZD(hourlyRate)}/h`);
    if (input.screenCount) notes.push(`${input.screenCount} écrans / pages inclus`);
    if (discountAmount > 0) notes.push(`Remise commerciale appliquée : -${formatDZD(discountAmount)}`);

    return {
      upPerSheet: 1,
      sheetsNeeded: 0,
      paperCost: 0,
      coverSheetsNeeded: 0,
      coverPaperCost: 0,
      printCost: 0,
      finitionCost: 0,
      pelliculageCost: 0,
      totalPaperCost: 0,
      subtotal,
      designCost: subtotal,
      total: finalTotal,
      discountAmount,
      discountPercentage: input.discountType === 'percent' ? discountVal : (totalBeforeDiscount > 0 ? (discountAmount / totalBeforeDiscount) * 100 : 0),
      discountType: input.discountType,
      discountValue: discountVal,
      isUiUx: true,
      uiUxCost: subtotal,
      uiUxHours: totalHours,
      uiUxHourlyRate: hourlyRate,
      layout: {
        rows: 0, cols: 0, pieceW: 0, pieceH: 0, sheetW: 0, sheetH: 0, rotated: false,
        rects: []
      },
      notes,
      steps,
    };
  }

  // Large format: simple area calc
  if (input.isLargeFormat) {
    const areaSqm = (input.finishedW * input.finishedH) / 1_000_000;
    steps.push({ category: 'layout', label: 'Surface par pièce', formula: `${input.finishedW}mm × ${input.finishedH}mm ÷ 1 000 000`, value: +areaSqm.toFixed(4), unit: 'm²' });

    const pricePerSqm = input.largeFormatPricePerSqm ?? input.printCostPerSheet;
    const printCost = areaSqm * pricePerSqm * input.quantity;
    steps.push({ category: 'print', label: 'Coût impression grand format', formula: `${areaSqm.toFixed(4)} m² × ${pricePerSqm} DA/m² × ${input.quantity}`, value: Math.round(printCost), unit: 'DA' });

    let finitionCost = 0;
    input.finitions.forEach(f => {
      const cost = f.unit === 'sqm' ? f.price * areaSqm * input.quantity : f.price * input.quantity;
      finitionCost += cost;
      steps.push({ category: 'finition', label: `Finition: ${f.name}`, formula: f.unit === 'sqm' ? `${f.price} DA/m² × ${areaSqm.toFixed(4)} m² × ${input.quantity}` : `${f.price} DA × ${input.quantity}`, value: Math.round(cost), unit: 'DA' });
    });

    let pelliculageCost = 0;
    input.pelliculages.forEach(p => {
      const cost = p.pricePerSqm * areaSqm * input.quantity;
      pelliculageCost += cost;
      steps.push({ category: 'pelliculage', label: `Pelliculage: ${p.name}`, formula: `${p.pricePerSqm} DA/m² × ${areaSqm.toFixed(4)} m² × ${input.quantity}`, value: Math.round(cost), unit: 'DA' });
    });

    const subtotal = printCost + finitionCost + pelliculageCost;
    steps.push({ category: 'total', label: 'Sous-total', formula: `${Math.round(printCost)} + ${Math.round(finitionCost)} + ${Math.round(pelliculageCost)}`, value: Math.round(subtotal), unit: 'DA' });

    const designCost = input.addDesign ? subtotal * (input.designPercentage / 100) : 0;
    if (input.addDesign) {
      steps.push({ category: 'design', label: `Conception graphique (${input.designPercentage}%)`, formula: `${Math.round(subtotal)} × ${input.designPercentage}%`, value: Math.round(designCost), unit: 'DA' });
    }

    const total = subtotal + designCost;
    steps.push({ category: 'total', label: 'TOTAL FINAL', formula: `${Math.round(subtotal)} + ${Math.round(designCost)}`, value: Math.round(total), unit: 'DA' });
    steps.push({ category: 'total', label: 'Prix unitaire', formula: `${Math.round(total)} ÷ ${input.quantity}`, value: Math.round(total / input.quantity), unit: 'DA' });

    notes.push(`Surface: ${areaSqm.toFixed(2)} m² × ${input.quantity} unités`);
    return {
      upPerSheet: 1, sheetsNeeded: input.quantity, paperCost: 0, coverSheetsNeeded: 0, coverPaperCost: 0, totalPaperCost: 0,
      printCost, finitionCost, pelliculageCost, subtotal, designCost, total: subtotal + designCost,
    layout: {
      rows: 1, cols: 1, pieceW: input.finishedW, pieceH: input.finishedH, sheetW: input.finishedW, sheetH: input.finishedH, rotated: false,
      rects: [{ x: 0, y: 0, w: input.finishedW, h: input.finishedH, rotated: false }]
    },
      notes, steps,
    };
  }

  // ── LAYOUT ──
  // Based on user's professional example:
  // Cover is imposed (e.g., 2-up on SRA3)
  // Interior pages are calculated as (Pages / 2) sheets per book (effectively 1-up A4 on machine sheet logic)
  const innerLeafs = input.hasPages ? Math.ceil(input.innerPages / 2) : 0;
  const totalInnerImpressions = input.quantity * innerLeafs;
  const mainPieceW = input.finishedW;
  const mainPieceH = input.finishedH;
  const innerPieceW = input.finishedW;
  const innerPieceH = input.finishedH;

  steps.push({ category: 'layout', label: 'Format fini', formula: `${input.finishedW} × ${input.finishedH}`, value: `${input.finishedW}×${input.finishedH}`, unit: 'mm' });
  steps.push({ category: 'layout', label: 'Fond perdu (bleed)', formula: `+${input.bleed}mm chaque côté`, value: input.bleed, unit: 'mm' });
  steps.push({ category: 'layout', label: 'Pièce avec bleed', formula: `(${input.finishedW} + ${input.bleed*2}) × (${input.finishedH} + ${input.bleed*2})`, value: `${input.finishedW + input.bleed*2}×${input.finishedH + input.bleed*2}`, unit: 'mm' });
  steps.push({ category: 'layout', label: 'Feuille offset', formula: '', value: `${input.sheetW}×${input.sheetH}`, unit: 'mm' });

  const fit = fitOnSheet(mainPieceW, mainPieceH, input.sheetW, input.sheetH, input.bleed, input.layoutPreference || 'optimal');
  const upPerSheet = Math.max(fit.up, 1);

  steps.push({ category: 'layout', label: 'Disposition', formula: `${fit.cols} colonnes × ${fit.rows} lignes${fit.rotated ? ' (rotation 90°)' : ''}`, value: upPerSheet, unit: 'poses' });

  const mainCopies = input.quantity;
  const sheetsNeeded = Math.ceil(mainCopies / upPerSheet);
  steps.push({ category: 'layout', label: 'Feuilles brutes', formula: `⌈${mainCopies} ÷ ${upPerSheet}⌉`, value: sheetsNeeded, unit: 'feuilles' });

  // Inner sheets (catalog only)
  let innerSheetsNeeded = 0;
  if (input.hasPages && innerLeafs > 0) {
    // For interior pages, user logic uses (Pages/2 * Qty) directly as sheets
    innerSheetsNeeded = totalInnerImpressions; 
    steps.push({ category: 'layout', label: 'Pages intérieures', formula: `${input.innerPages} pages → ${innerLeafs} feuilles/ex. × ${input.quantity} ex.`, value: totalInnerImpressions, unit: 'impressions' });
    steps.push({ category: 'layout', label: 'Feuilles intérieures', formula: `${totalInnerImpressions} × 1`, value: innerSheetsNeeded, unit: 'feuilles' });
    notes.push(`Pages intérieures: ${input.innerPages} pages = ${innerLeafs} feuilles/exemplaire × ${input.quantity} = ${totalInnerImpressions} feuilles`);
  }

  // ── WASTE ──
  const waste = 1.05;
  const totalSheets = Math.ceil(sheetsNeeded * waste);
  const totalInnerSheets = Math.ceil(innerSheetsNeeded * waste);
  steps.push({ category: 'layout', label: 'Gâche (+5%)', formula: `⌈${sheetsNeeded} × 1.05⌉`, value: totalSheets, unit: 'feuilles' });
  if (input.hasPages) {
    steps.push({ category: 'layout', label: 'Gâche intérieur (+5%)', formula: `⌈${innerSheetsNeeded} × 1.05⌉`, value: totalInnerSheets, unit: 'feuilles' });
  }

  // ── PAPER COST ──
  const paperCost = totalSheets * input.paperPricePerSheet;
  steps.push({ category: 'paper', label: 'Prix papier / feuille', formula: `${input.paperWeight} g/m²`, value: input.paperPricePerSheet, unit: 'DA' });
  steps.push({ category: 'paper', label: 'Coût papier principal', formula: `${totalSheets} feuilles × ${input.paperPricePerSheet} DA`, value: Math.round(paperCost), unit: 'DA' });

  const coverPaperCost = input.hasCover ? totalSheets * (input.coverPaperPricePerSheet || input.paperPricePerSheet) : 0;
  const innerPaperCost = totalInnerSheets * input.paperPricePerSheet;

  if (input.hasCover) {
    steps.push({ category: 'paper', label: 'Coût papier couverture', formula: `${totalSheets} × ${input.coverPaperPricePerSheet || input.paperPricePerSheet} DA`, value: Math.round(coverPaperCost), unit: 'DA' });
  }
  if (input.hasPages) {
    steps.push({ category: 'paper', label: 'Coût papier intérieur', formula: `${totalInnerSheets} × ${input.paperPricePerSheet} DA`, value: Math.round(innerPaperCost), unit: 'DA' });
  }

  const totalPaperCost = input.hasCover ? coverPaperCost + innerPaperCost : paperCost + innerPaperCost;
  steps.push({ category: 'paper', label: 'Total papier', formula: input.hasCover ? `${Math.round(coverPaperCost)} + ${Math.round(innerPaperCost)}` : (input.hasPages ? `${Math.round(paperCost)} + ${Math.round(innerPaperCost)}` : `${Math.round(paperCost)}`), value: Math.round(totalPaperCost), unit: 'DA' });

  // ── PRINT COST ──
  const rvMul = input.rectoVerso ? input.rvMultiplier : 1;
  steps.push({ category: 'print', label: 'Mise en route', formula: '', value: input.printSetupCost, unit: 'DA' });
  steps.push({ category: 'print', label: 'Coût / feuille', formula: '', value: input.printCostPerSheet, unit: 'DA' });
  steps.push({ category: 'print', label: 'Mode', formula: input.rectoVerso ? `Recto-Verso (×${input.rvMultiplier})` : 'Recto seul (×1)', value: rvMul, unit: '×' });

  const printCostMain = input.printSetupCost + (totalSheets * input.printCostPerSheet * rvMul);
  steps.push({ category: 'print', label: 'Impression principale', formula: `${input.printSetupCost} + (${totalSheets} × ${input.printCostPerSheet} × ${rvMul})`, value: Math.round(printCostMain), unit: 'DA' });

  const printCostInner = input.hasPages ? (totalInnerSheets * input.printCostPerSheet * input.rvMultiplier) : 0;
  if (input.hasPages) {
    steps.push({ category: 'print', label: 'Impression intérieure', formula: `${totalInnerSheets} × ${input.printCostPerSheet} × ${input.rvMultiplier}`, value: Math.round(printCostInner), unit: 'DA' });
  }

  const printCost = printCostMain + printCostInner;
  steps.push({ category: 'print', label: 'Total impression', formula: input.hasPages ? `${Math.round(printCostMain)} + ${Math.round(printCostInner)}` : `${Math.round(printCostMain)}`, value: Math.round(printCost), unit: 'DA' });

  // ── FINITIONS ──
  const areaSqmPerPiece = (input.finishedW * input.finishedH) / 1_000_000;
  if (input.finitions.length > 0 || input.pelliculages.length > 0) {
    steps.push({ category: 'finition', label: 'Surface / pièce', formula: `${input.finishedW}×${input.finishedH}mm ÷ 1M`, value: +areaSqmPerPiece.toFixed(6), unit: 'm²' });
  }

  let finitionCost = 0;
  input.finitions.forEach(f => {
    let cost: number;
    if (f.unit === 'sqm') {
      cost = f.price * areaSqmPerPiece * input.quantity;
      steps.push({ category: 'finition', label: `${f.name}`, formula: `${f.price} DA/m² × ${areaSqmPerPiece.toFixed(6)} m² × ${input.quantity}`, value: Math.round(cost), unit: 'DA' });
    } else {
      cost = f.price * input.quantity;
      steps.push({ category: 'finition', label: `${f.name}`, formula: `${f.price} DA × ${input.quantity}`, value: Math.round(cost), unit: 'DA' });
    }
    finitionCost += cost;
  });

  let pelliculageCost = 0;
  input.pelliculages.forEach(p => {
    const cost = p.pricePerSqm * areaSqmPerPiece * input.quantity;
    pelliculageCost += cost;
    steps.push({ category: 'pelliculage', label: `${p.name}`, formula: `${p.pricePerSqm} DA/m² × ${areaSqmPerPiece.toFixed(6)} m² × ${input.quantity}`, value: Math.round(cost), unit: 'DA' });
  });

  // ── TOTALS ──
  const subtotal = totalPaperCost + printCost + finitionCost + pelliculageCost;
  steps.push({ category: 'total', label: 'Sous-total HT', formula: `${Math.round(totalPaperCost)} + ${Math.round(printCost)} + ${Math.round(finitionCost)} + ${Math.round(pelliculageCost)}`, value: Math.round(subtotal), unit: 'DA' });

  const designCost = input.addDesign ? subtotal * (input.designPercentage / 100) : 0;
  if (input.addDesign) {
    steps.push({ category: 'design', label: `Conception graphique (${input.designPercentage}%)`, formula: `${Math.round(subtotal)} × ${input.designPercentage} ÷ 100`, value: Math.round(designCost), unit: 'DA' });
  }

  const beforeDiscountTotal = subtotal + designCost;
  const discountVal = Number(input.discountValue) || 0;
  let discountAmount = 0;
  if (discountVal > 0) {
    if (input.discountType === 'fixed') {
      discountAmount = Math.min(discountVal, beforeDiscountTotal);
    } else {
      discountAmount = (beforeDiscountTotal * discountVal) / 100;
    }
  }
  const total = Math.max(0, beforeDiscountTotal - discountAmount);

  if (discountAmount > 0) {
    steps.push({
      category: 'total',
      label: input.discountType === 'fixed' ? 'Remise commerciale' : `Remise commerciale (${discountVal}%)`,
      formula: `-${Math.round(discountAmount)} DA`,
      value: -Math.round(discountAmount),
      unit: 'DA'
    });
  }

  steps.push({
    category: 'total',
    label: discountAmount > 0 ? 'TOTAL NET TTC' : 'TOTAL TTC',
    formula: discountAmount > 0 ? `${Math.round(beforeDiscountTotal)} - ${Math.round(discountAmount)}` : `${Math.round(subtotal)} + ${Math.round(designCost)}`,
    value: Math.round(total),
    unit: 'DA'
  });
  steps.push({
    category: 'total',
    label: 'Prix unitaire net',
    formula: `${Math.round(total)} ÷ ${input.quantity}`,
    value: +(total / input.quantity).toFixed(2),
    unit: 'DA'
  });

  notes.push(`Format pièce: ${mainPieceW}×${mainPieceH}mm (+${input.bleed}mm bleed) sur feuille ${input.sheetW}×${input.sheetH}mm`);
  notes.push(`${upPerSheet} poses/feuille → ${sheetsNeeded} feuilles + 5% gâche = ${totalSheets} feuilles`);
  if (input.rectoVerso) notes.push(`Recto-Verso: ×${input.rvMultiplier} sur impression`);
  if (discountAmount > 0) notes.push(`Remise commerciale appliquée : -${formatDZD(discountAmount)}`);

  return {
    upPerSheet,
    sheetsNeeded: totalSheets,
    paperCost: input.hasCover ? coverPaperCost : paperCost + innerPaperCost,
    totalPaperCost: totalPaperCost,
    coverSheetsNeeded: input.hasCover ? totalSheets : 0,
    coverPaperCost,
    printCost,
    finitionCost,
    pelliculageCost,
    subtotal,
    designCost,
    total,
    discountAmount,
    discountPercentage: input.discountType === 'percent' ? discountVal : (beforeDiscountTotal > 0 ? (discountAmount / beforeDiscountTotal) * 100 : 0),
    discountType: input.discountType,
    discountValue: discountVal,
    layout: {
      rows: fit.rows,
      cols: fit.cols,
      pieceW: mainPieceW + input.bleed * 2,
      pieceH: mainPieceH + input.bleed * 2,
      sheetW: input.sheetW,
      sheetH: input.sheetH,
      rotated: fit.rotated,
      rects: fit.rects,
    },
    notes,
    steps,
  };
}

export function formatDZD(n: number): string {
  return new Intl.NumberFormat('fr-DZ', { maximumFractionDigits: 0 }).format(Math.round(n)) + ' DA';
}
