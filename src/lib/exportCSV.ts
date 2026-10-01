// CSV Export utility for Oprisma Design

export function downloadCSV(filename: string, csvContent: string) {
  // UTF-8 BOM so Excel on Windows handles French accents and Arabic properly
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export function exportQuotesToCSV(quotes: any[]) {
  const headers = [
    "Numéro",
    "Date",
    "Client",
    "Téléphone",
    "Produit",
    "Quantité",
    "Montant Total (DA)",
    "Montant Payé (DA)",
    "Reste (DA)",
    "Statut",
    "Notes"
  ];

  const rows = quotes.map((q) => {
    const details = q.details || {};
    const total = Number(q.total_price || details.total || 0);
    const paid = Number(details.paidAmount || 0);
    const remaining = Math.max(0, total - paid);
    const clientPhone = details.clientPhone || details.client?.phone || "";
    const notes = details.notes || "";

    return [
      escapeCSV(q.quote_number || q.id),
      escapeCSV(new Date(q.created_at).toLocaleDateString("fr-DZ")),
      escapeCSV(q.client_name || "Client de passage"),
      escapeCSV(clientPhone),
      escapeCSV(q.product_name || details.productName || "Sur mesure"),
      escapeCSV(q.quantity || details.quantity || 1),
      escapeCSV(total),
      escapeCSV(paid),
      escapeCSV(remaining),
      escapeCSV(q.status || "pending"),
      escapeCSV(notes)
    ].join(";");
  });

  const csv = [headers.join(";"), ...rows].join("\r\n");
  const dateStr = new Date().toISOString().split("T")[0];
  downloadCSV(`oprisma_devis_${dateStr}.csv`, csv);
}

export function exportClientsToCSV(clients: any[]) {
  const headers = [
    "ID",
    "Nom / Entreprise",
    "Téléphone",
    "Email",
    "Adresse",
    "Total Devis",
    "Chiffre d'Affaires (DA)",
    "Dette / Reste (DA)",
    "Notes"
  ];

  const rows = clients.map((c) => {
    return [
      escapeCSV(c.id || ""),
      escapeCSV(c.name || ""),
      escapeCSV(c.phone || ""),
      escapeCSV(c.email || ""),
      escapeCSV(c.address || ""),
      escapeCSV(c.quoteCount || 0),
      escapeCSV(c.totalSpent || 0),
      escapeCSV(c.totalDebt || 0),
      escapeCSV(c.notes || "")
    ].join(";");
  });

  const csv = [headers.join(";"), ...rows].join("\r\n");
  const dateStr = new Date().toISOString().split("T")[0];
  downloadCSV(`oprisma_clients_${dateStr}.csv`, csv);
}

export function exportPaymentsToCSV(quotes: any[]) {
  const headers = [
    "Devis / Facture",
    "Date Devis",
    "Client",
    "Téléphone",
    "Total TTC (DA)",
    "Montant Encaissé (DA)",
    "Reste à Payer (DA)",
    "État Paiement",
    "Historique Versements"
  ];

  const rows = quotes.map((q) => {
    const details = q.details || {};
    const total = Number(q.total_price || details.total || 0);
    const paid = Number(details.paidAmount || 0);
    const remaining = Math.max(0, total - paid);
    const clientPhone = details.clientPhone || details.client?.phone || "";

    let status = "Impayé";
    if (paid >= total && total > 0) status = "Soldé";
    else if (paid > 0) status = "Acompte";

    const paymentsStr = Array.isArray(details.payments)
      ? details.payments.map((p: any) => `${p.date}: ${p.amount}DA (${p.method || 'Espèces'})`).join(" | ")
      : "";

    return [
      escapeCSV(q.quote_number || q.id),
      escapeCSV(new Date(q.created_at).toLocaleDateString("fr-DZ")),
      escapeCSV(q.client_name || "Client"),
      escapeCSV(clientPhone),
      escapeCSV(total),
      escapeCSV(paid),
      escapeCSV(remaining),
      escapeCSV(status),
      escapeCSV(paymentsStr)
    ].join(";");
  });

  const csv = [headers.join(";"), ...rows].join("\r\n");
  const dateStr = new Date().toISOString().split("T")[0];
  downloadCSV(`oprisma_paiements_${dateStr}.csv`, csv);
}
