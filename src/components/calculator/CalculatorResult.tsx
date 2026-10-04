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
      <Card className="bg-card border border-border shadow-md rounded-[1.5rem] overflow-hidden">
        <div className="bg-primary p-6 text-white">
          <div className="text-xs uppercase tracking-wider font-semibold text-white/80">{t("calc.finalTotal")}</div>
          <div className="text-4xl font-extrabold mt-1 tracking-tight tabular-nums text-white">{breakdown ? formatDZD(breakdown.total) : "— DA"}</div>
          {breakdown && quantity > 0 && (
            <div className="text-xs text-white/90 mt-2 font-medium">{t("calc.unitPrice")}: <span className="font-bold text-accent">{formatDZD(breakdown.total / quantity)}</span> / {t("calc.units")}</div>
          )}
        </div>
        <CardContent className="p-5 space-y-3">
          {breakdown ? (
            <>
              {breakdown.isUiUx ? (
                <div className="space-y-2 text-sm">
                  <Row label="Taux horaire" value={`${formatDZD(breakdown.uiUxHourlyRate || 0)} / h`} />
                  <Row label="Volume estimé" value={`${breakdown.uiUxHours || 0} h`} />
                  <Separator />
                  <Row label={t("calc.subtotal")} value={formatDZD(breakdown.subtotal)} bold />
                </div>
              ) : (
                <div className="space-y-2 text-sm">
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
              <div className="pt-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="secondary" className="w-full text-xs" size="sm">
                      <Calculator className="w-3.5 h-3.5 mr-2" />
                      Détails du calcul
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle>Détail du calcul</DialogTitle>
                    </DialogHeader>
                    <div className="overflow-y-auto pr-2">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">Catégorie</TableHead>
                            <TableHead>Étape</TableHead>
                            <TableHead>Formule / Détail</TableHead>
                            <TableHead className="text-right">Résultat</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {breakdown.steps?.map((step: CalcStep, i: number) => (
                            <TableRow key={i} className={step.category === 'total' ? 'bg-muted/50 font-medium' : ''}>
                              <TableCell className="capitalize text-xs text-muted-foreground">{step.category}</TableCell>
                              <TableCell>{step.label}</TableCell>
                              <TableCell className="text-xs text-muted-foreground font-mono">{step.formula}</TableCell>
                              <TableCell className="text-right tabular-nums whitespace-nowrap">
                                {step.value} <span className="text-xs text-muted-foreground">{step.unit}</span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="outline" onClick={onSaveQuote} className="font-bold border-border"><Save className="w-4 h-4 mr-1.5" />{t("calc.save")}</Button>
                <Button onClick={onPrintDevis} className="bg-accent hover:bg-accent/90 text-accent-foreground font-extrabold border-0"><PrinterIcon className="w-4 h-4 mr-1.5" />{t("calc.printDevis")}</Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">Sélectionnez un produit pour commencer</p>
          )}
        </CardContent>
      </Card>

      {breakdown && !isLargeFormat && !breakdown.isUiUx && (
        <Card className="bg-card border border-border shadow-sm rounded-[1.5rem] overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {t("calc.montage")} <Badge variant="secondary" className="text-[10px]">+{bleed}mm bleed</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
