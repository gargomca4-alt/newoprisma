import { describe, it, expect } from "vitest";
import { calculate, CalcInput, formatDZD } from "@/lib/calc";

describe("UI/UX Hourly Calculation Engine", () => {
  it("calculates UI/UX price based on hours and hourly rate", () => {
    const input: CalcInput = {
      productCategory: "ui_ux",
      isUiUx: true,
      hourlyRate: 3000,
      hours: 20,
      quantity: 1,
      hasPages: false,
      hasCover: false,
      finishedW: 0,
      finishedH: 0,
      bleed: 0,
      sheetW: 0,
      sheetH: 0,
      paperPricePerSheet: 0,
      paperWeight: 0,
      printSetupCost: 0,
      printCostPerSheet: 0,
      rectoVerso: false,
      rvMultiplier: 1,
      innerPages: 0,
      coverPaperPricePerSheet: 0,
      finitions: [],
      pelliculages: [],
      addDesign: false,
      designPercentage: 35,
    };

    const res = calculate(input);
    expect(res.isUiUx).toBe(true);
    expect(res.uiUxHourlyRate).toBe(3000);
    expect(res.uiUxHours).toBe(20);
    expect(res.subtotal).toBe(60000);
    expect(res.total).toBe(60000);
    expect(res.paperCost).toBe(0);
    expect(res.printCost).toBe(0);
    expect(res.finitionCost).toBe(0);
  });

  it("calculates UI/UX price with additional modules", () => {
    const input: CalcInput = {
      productCategory: "ui_ux",
      isUiUx: true,
      hourlyRate: 2500,
      hours: 10,
      quantity: 1,
      uiUxServices: [
        { name: "Prototype Interactif", hours: 8 },
        { name: "Design System", hours: 12 },
      ],
      hasPages: false,
      hasCover: false,
      finishedW: 0,
      finishedH: 0,
      bleed: 0,
      sheetW: 0,
      sheetH: 0,
      paperPricePerSheet: 0,
      paperWeight: 0,
      printSetupCost: 0,
      printCostPerSheet: 0,
      rectoVerso: false,
      rvMultiplier: 1,
      innerPages: 0,
      coverPaperPricePerSheet: 0,
      finitions: [],
      pelliculages: [],
      addDesign: false,
      designPercentage: 35,
    };

    const res = calculate(input);
    expect(res.uiUxHours).toBe(30); // 10 base + 8 + 12
    expect(res.total).toBe(30 * 2500); // 75000 DA
  });

  it("calculates UI/UX price with quantity multiplier", () => {
    const input: CalcInput = {
      productCategory: "ui_ux",
      isUiUx: true,
      hourlyRate: 2000,
      hours: 15,
      quantity: 2, // 2 apps or projects
      hasPages: false,
      hasCover: false,
      finishedW: 0,
      finishedH: 0,
      bleed: 0,
      sheetW: 0,
      sheetH: 0,
      paperPricePerSheet: 0,
      paperWeight: 0,
      printSetupCost: 0,
      printCostPerSheet: 0,
      rectoVerso: false,
      rvMultiplier: 1,
      innerPages: 0,
      coverPaperPricePerSheet: 0,
      finitions: [],
      pelliculages: [],
      addDesign: false,
      designPercentage: 35,
    };

    const res = calculate(input);
    expect(res.subtotal).toBe(30000);
    expect(res.total).toBe(60000);
  });
});
