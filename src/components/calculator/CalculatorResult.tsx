import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Save, Printer as PrinterIcon, Info, Calculator } from "lucide-react";
import { formatDZD, CalcStep } from "@/lib/calc";
import { MontageVisual } from "@/components/MontageVisual";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className={`flex justify-between items-center ${bold ? "font-semibold" : ""} ${accent ? "text-primary font-semibold" : ""}`}>
      <span className="text-muted-foreground text-xs uppercase tracking-wide">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export function CalculatorResult({
  breakdown,
  quantity,
  addDesign,
  designPct,
  isLargeFormat,
  bleed,
  layoutPreference,
  setLayoutPreference,
  onSaveQuote,
  onPrintDevis
}: any) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 lg:sticky lg:top-24 self-start">
      <Card className="bg-card border border-border shadow-md rounded-xl sm:rounded-[1.5rem] overflow-hidden">
        <div className="bg-primary p-4 sm:p-6 text-white">
          <div className="text-[11px] sm:text-xs uppercase tracking-wider font-semibold text-white/80">{t("calc.finalTotal")}</div>
          <div className="text-2xl sm:text-4xl font-extrabold mt-1 tracking-tight tabular-nums text-white truncate">{breakdown ? formatDZD(breakdown.total) : "— DA"}</div>
          {breakdown && quantity > 0 && (
            <div className="text-[11px] sm:text-xs text-white/90 mt-1.5 sm:mt-2 font-medium">{t("calc.unitPrice")}: <span className="font-bold text-accent">{formatDZD(breakdown.total / quantity)}</span> / {t("calc.units")}</div>
          )}
        </div>
        <CardContent className="p-3.5 sm:p-5 space-y-3">
          {breakdown ? (
            <>
              {breakdown.isUiUx ? (
                <div className="space-y-2 text-xs sm:text-sm">
                  <Row label="Taux horaire" value={`${formatDZD(breakdown.uiUxHourlyRate || 0)} / h`} />
                  <Row label="Volume estimé" value={`${breakdown.uiUxHours || 0} h`} />
                  <Separator />
                  <Row label={t("calc.subtotal")} value={formatDZD(breakdown.subtotal)} bold />
                </div>
              ) : (
                <div className="space-y-2 text-xs sm:text-sm">
                  <Row label={t("calc.paperCost")} value={formatDZD(breakdown.totalPaperCost)} />
                  <Row label={t("calc.printCost")} value={formatDZD(breakdown.printCost)} />
                  {breakdown.finitionCost > 0 && <Row label={t("calc.finitionCost")} value={formatDZD(breakdown.finitionCost)} />}
                  {breakdown.pelliculageCost > 0 && <Row label={t("calc.pelliculages")} value={formatDZD(breakdown.pelliculageCost)} />}
                  <Separator />
                  <Row label={t("calc.subtotal")} value={formatDZD(breakdown.subtotal)} bold />
                  {addDesign && <Row label={`${t("calc.designCost")} (${designPct}%)`} value={formatDZD(breakdown.designCost)} accent />}
                </div>
              )}
              {breakdown.discountAmount > 0 && (
                <div className="pt-1">
                  <Row
                    label={`Remise (${breakdown.discountType === 'percent' ? `${breakdown.discountValue}%` : 'Fixe'})`}
                    value={`-${formatDZD(breakdown.discountAmount)}`}
                    accent
                  />
                </div>
              )}
              <Separator />
              <div className="pt-1 sm:pt-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="secondary" className="w-full text-xs h-8" size="sm">
                      <Calculator className="w-3.5 h-3.5 mr-2" />
                      Détails du calcul
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-4 sm:p-6">
                    <DialogHeader>
                      <DialogTitle className="text-base sm:text-lg">Détail du calcul</DialogTitle>
                    </DialogHeader>
                    <div className="overflow-y-auto pr-2">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[80px] sm:w-[100px] text-xs">Catégorie</TableHead>
                            <TableHead className="text-xs">Étape</TableHead>
                            <TableHead className="text-xs hidden sm:table-cell">Formule / Détail</TableHead>
                            <TableHead className="text-right text-xs">Résultat</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {breakdown.steps?.map((step: CalcStep, i: number) => (
                            <TableRow key={i} className={step.category === 'total' ? 'bg-muted/50 font-medium' : ''}>
                              <TableCell className="capitalize text-[11px] sm:text-xs text-muted-foreground">{step.category}</TableCell>
                              <TableCell className="text-xs">{step.label}</TableCell>
                              <TableCell className="text-[11px] sm:text-xs text-muted-foreground font-mono hidden sm:table-cell">{step.formula}</TableCell>
                              <TableCell className="text-right tabular-nums whitespace-nowrap text-xs">
                                {step.value} <span className="text-[10px] sm:text-xs text-muted-foreground">{step.unit}</span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 pt-1 sm:pt-2">
                <Button
                  variant="outline"
                  onClick={onSaveQuote}
                  className="w-full sm:flex-1 font-bold border-border h-10 sm:h-11 text-xs sm:text-sm rounded-xl transition-all"
                >
                  <Save className="w-4 h-4 mr-2 shrink-0 text-primary" />
                  <span className="truncate">{t("calc.save")}</span>
                </Button>
                <Button
                  onClick={onPrintDevis}
                  className="w-full sm:flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-black border-0 h-10 sm:h-11 text-xs sm:text-sm rounded-xl shadow-glow transition-all"
                >
                  <PrinterIcon className="w-4 h-4 mr-2 shrink-0" />
                  <span className="truncate">{t("calc.printDevis")}</span>
                </Button>
              </div>
            </>
          ) : (
            <p className="text-xs sm:text-sm text-muted-foreground text-center py-6">Sélectionnez un produit pour commencer</p>
          )}
        </CardContent>
      </Card>

      {breakdown && !isLargeFormat && !breakdown.isUiUx && (
        <Card className="bg-card border border-border shadow-sm rounded-xl sm:rounded-[1.5rem] overflow-hidden">
          <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              {t("calc.montage")} <Badge variant="secondary" className="text-[10px]">+{bleed}mm bleed</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
            <Tabs value={layoutPreference} onValueChange={setLayoutPreference} className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-8">
                <TabsTrigger value="optimal" className="text-xs h-6">Optimal</TabsTrigger>
                <TabsTrigger value="horizontal" className="text-xs h-6">Horizontal</TabsTrigger>
                <TabsTrigger value="vertical" className="text-xs h-6">Vertical</TabsTrigger>
              </TabsList>
            </Tabs>
            <MontageVisual layout={breakdown.layout} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
