import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  fr: {
    translation: {
      app: { name: "Oprisma Design", tagline: "Calculateur de prix d'impression" },
      nav: { dashboard: "Tableau de bord", calculator: "Calculateur", products: "Produits", paper: "Papiers", print: "Impression", finitions: "Finitions", quotes: "Devis", clients: "Clients", payment: "Paiements", settings: "Paramètres" },
      common: { save: "Enregistrer", cancel: "Annuler", add: "Ajouter", delete: "Supprimer", edit: "Modifier", new: "Nouveau", other: "Autre", price: "Prix", quantity: "Quantité", total: "Total", name: "Nom", actions: "Actions", confirm: "Confirmer", loading: "Chargement...", search: "Rechercher", yes: "Oui", no: "Non", close: "Fermer", back: "Retour", next: "Suivant", print: "Imprimer", reset: "Réinitialiser" },
      calc: {
        title: "Calculateur de prix",
        subtitle: "Calcul instantané • Offset & Numérique • Devis professionnels",
        client: "Informations client",
        clientName: "Nom du client",
        clientCompany: "Société",
        product: "Produit",
        chooseProduct: "Choisir un produit",
        printType: "Type d'impression",
        paperType: "Type de papier",
        paperWeight: "Grammage",
        size: "Format",
        customSize: "Format personnalisé",
        widthCm: "Largeur (cm)",
        heightCm: "Hauteur (cm)",
        widthMm: "Largeur (mm)",
        heightMm: "Hauteur (mm)",
        bleed: "Fond perdu (mm)",
        rectoVerso: "Recto-Verso",
        recto: "Recto seulement",
        pages: "Nombre de pages intérieures",
        coverPaper: "Papier de couverture",
        coverWeight: "Grammage couverture",
        finitions: "Finitions",
        pelliculages: "Pelliculages",
        addDesign: "Ajouter conception graphique",
        designNote: "Conception = 35% du sous-total",
        result: "Résultat du calcul",
        breakdown: "Détail du calcul",
        montage: "Montage / Imposition",
        unitPrice: "Prix unitaire",
        subtotal: "Sous-total",
        designCost: "Conception graphique",
        finalTotal: "Total TTC",
        sheetsNeeded: "Feuilles nécessaires",
        upPerSheet: "Poses par feuille",
        paperCost: "Coût papier",
        printCost: "Coût impression",
        finitionCost: "Coût finitions",
        save: "Enregistrer le devis",
        printDevis: "Imprimer en devis",
        offsetSheet: "Format feuille offset",
        units: "Unité"
      },
      products: { title: "Gestion des produits", new: "Nouveau produit", category: "Catégorie", minWeight: "Grammage min", hasPages: "A des pages intérieures", hasCover: "A une couverture" },
      paper: { title: "Gestion des papiers", weights: "Grammages disponibles", pricePerSheet: "Prix / feuille SRA3", addWeight: "Ajouter grammage" },
      print: { title: "Types d'impression", setupCost: "Coût de mise en route", costPerSheet: "Coût / feuille", rvMultiplier: "Multiplicateur Recto-Verso" },
      finitions: { title: "Finitions", pelliculages: "Pelliculages", priceUnit: "Unité de prix", perUnit: "Par unité", perSqm: "Par m²" },
      quotes: { title: "Devis enregistrés", empty: "Aucun devis enregistré", date: "Date", view: "Voir" },
      settings: { title: "Paramètres", designPercentage: "% Conception graphique", companyName: "Nom de l'entreprise", currency: "Devise" },
      payment: { title: "Gestion des paiements", totalRevenue: "Chiffre d'affaires", totalPaid: "Total encaissé", totalRemaining: "Reste à encaisser", paidQuotes: "Devis soldés", searchPlaceholder: "Rechercher un client...", empty: "Aucun devis enregistré", noResults: "Aucun résultat trouvé", statusPaid: "Soldé", statusPartial: "Partiel", statusUnpaid: "Non payé", paid: "Payé", remaining: "Reste", addPayment: "Payer", reset: "Réinitialiser", recordPayment: "Enregistrer un paiement", alreadyPaid: "Déjà payé", paymentAmount: "Montant à payer", confirm: "Confirmer le paiement" },
      clients: { title: "Gestion des clients", addClient: "Ajouter un client", editClient: "Modifier le client", totalClients: "Total clients", activeClients: "Clients actifs", totalBusiness: "Chiffre d'affaires", searchPlaceholder: "Rechercher un client...", empty: "Aucun client enregistré", noResults: "Aucun résultat", orders: "Commandes", paid: "Payé", remaining: "Reste", quoteHistory: "Historique des devis", clientName: "Nom du client", company: "Société", phone: "Téléphone", email: "Email", address: "Adresse", notes: "Notes", notesPlaceholder: "Remarques sur le client...", nameRequired: "Le nom est obligatoire", added: "Client ajouté", updated: "Client modifié", deleted: "Client supprimé" },
      dashboard: { title: "Tableau de bord", subtitle: "Vue d'ensemble de votre activité", monthRevenue: "Revenu du mois", totalQuotes: "Total devis", uniqueClients: "Clients uniques", outstanding: "Reste à encaisser", revenueChart: "Évolution du chiffre d'affaires", last6Months: "6 derniers mois", thisMonth: "ce mois", pending: "En attente", accepted: "Accepté", rejected: "Refusé", recentQuotes: "Devis récents", viewAll: "Voir tout", topProducts: "Produits populaires", financialSummary: "Résumé financier", allTimeRevenue: "CA total", totalCollected: "Total encaissé", noData: "Aucune donnée", draftRestored: "Brouillon restauré", draftFound: "Un brouillon a été trouvé", resumeDraft: "Reprendre", discardDraft: "Ignorer" }
    }
  },
  ar: {
    translation: {
      app: { name: "Oprisma Design", tagline: "حاسبة أسعار الطباعة" },
      nav: { dashboard: "لوحة التحكم", calculator: "الحاسبة", products: "المنتجات", paper: "الورق", print: "الطباعة", finitions: "التشطيبات", quotes: "العروض", clients: "العملاء", payment: "المدفوعات", settings: "الإعدادات" },
      common: { save: "حفظ", cancel: "إلغاء", add: "إضافة", delete: "حذف", edit: "تعديل", new: "جديد", other: "أخرى", price: "السعر", quantity: "الكمية", total: "المجموع", name: "الاسم", actions: "إجراءات", confirm: "تأكيد", loading: "جارٍ التحميل...", search: "بحث", yes: "نعم", no: "لا", close: "إغلاق", back: "رجوع", next: "التالي", print: "طباعة", reset: "إعادة" },
      calc: {
        title: "حاسبة الأسعار",
        subtitle: "حساب فوري • أوفست ورقمي • عروض احترافية",
        client: "معلومات الزبون",
        clientName: "اسم الزبون",
        clientCompany: "الشركة",
        product: "المنتج",
        chooseProduct: "اختر منتج",
        printType: "نوع الطباعة",
        paperType: "نوع الورق",
        paperWeight: "الجرام",
        size: "المقاس",
        customSize: "مقاس مخصص",
        widthCm: "العرض (سم)",
        heightCm: "الطول (سم)",
        widthMm: "العرض (مم)",
        heightMm: "الطول (مم)",
        bleed: "Bleed (مم)",
        rectoVerso: "وجهين",
        recto: "وجه واحد",
        pages: "عدد الصفحات الداخلية",
        coverPaper: "ورق الغلاف",
        coverWeight: "جرام الغلاف",
        finitions: "التشطيبات",
        pelliculages: "التغليفات",
        addDesign: "إضافة خدمة التصميم",
        designNote: "التصميم = 35% من المجموع الفرعي",
        result: "نتيجة الحساب",
        breakdown: "تفاصيل الحساب",
        montage: "المونتاج",
        unitPrice: "سعر الوحدة",
        subtotal: "المجموع الفرعي",
        designCost: "تكلفة التصميم",
        finalTotal: "المجموع الإجمالي",
        sheetsNeeded: "عدد الورق المطلوب",
        upPerSheet: "عدد القطع في الورقة",
        paperCost: "تكلفة الورق",
        printCost: "تكلفة الطباعة",
        finitionCost: "تكلفة التشطيبات",
        save: "حفظ العرض",
        printDevis: "طباعة كعرض سعر",
        offsetSheet: "مقاس ورق الأوفست",
        units: "وحدة"
      },
      products: { title: "إدارة المنتجات", new: "منتج جديد", category: "الفئة", minWeight: "أدنى جرام", hasPages: "يحتوي صفحات داخلية", hasCover: "يحتوي غلاف" },
      paper: { title: "إدارة الورق", weights: "الجرامات المتاحة", pricePerSheet: "السعر / ورقة SRA3", addWeight: "إضافة جرام" },
      print: { title: "أنواع الطباعة", setupCost: "تكلفة التحضير", costPerSheet: "تكلفة الورقة", rvMultiplier: "معامل وجهين" },
      finitions: { title: "التشطيبات", pelliculages: "التغليفات", priceUnit: "وحدة السعر", perUnit: "لكل وحدة", perSqm: "لكل م²" },
      quotes: { title: "العروض المحفوظة", empty: "لا توجد عروض", date: "التاريخ", view: "عرض" },
      settings: { title: "الإعدادات", designPercentage: "نسبة التصميم %", companyName: "اسم الشركة", currency: "العملة" },
      payment: { title: "إدارة المدفوعات", totalRevenue: "إجمالي الإيرادات", totalPaid: "إجمالي المدفوع", totalRemaining: "المتبقي", paidQuotes: "عروض مسددة", searchPlaceholder: "البحث عن زبون...", empty: "لا توجد عروض", noResults: "لا توجد نتائج", statusPaid: "مسدد", statusPartial: "جزئي", statusUnpaid: "غير مدفوع", paid: "المدفوع", remaining: "المتبقي", addPayment: "دفع", reset: "إعادة", recordPayment: "تسجيل دفعة", alreadyPaid: "المدفوع سابقاً", paymentAmount: "المبلغ المدفوع", confirm: "تأكيد الدفع" },
      clients: { title: "إدارة العملاء", addClient: "إضافة عميل", editClient: "تعديل العميل", totalClients: "إجمالي العملاء", activeClients: "عملاء نشطون", totalBusiness: "إجمالي الأعمال", searchPlaceholder: "البحث عن عميل...", empty: "لا يوجد عملاء", noResults: "لا توجد نتائج", orders: "الطلبات", paid: "المدفوع", remaining: "المتبقي", quoteHistory: "سجل العروض", clientName: "اسم العميل", company: "الشركة", phone: "الهاتف", email: "البريد", address: "العنوان", notes: "ملاحظات", notesPlaceholder: "ملاحظات حول العميل...", nameRequired: "الاسم مطلوب", added: "تم إضافة العميل", updated: "تم تعديل العميل", deleted: "تم حذف العميل" },
      dashboard: { title: "لوحة التحكم", subtitle: "نظرة شاملة على نشاطك", monthRevenue: "إيرادات الشهر", totalQuotes: "إجمالي العروض", uniqueClients: "عملاء فريدون", outstanding: "المتبقي", revenueChart: "تطور الإيرادات", last6Months: "آخر 6 أشهر", thisMonth: "هذا الشهر", pending: "قيد الانتظار", accepted: "مقبول", rejected: "مرفوض", recentQuotes: "العروض الأخيرة", viewAll: "عرض الكل", topProducts: "المنتجات الشائعة", financialSummary: "الملخص المالي", allTimeRevenue: "إجمالي الإيرادات", totalCollected: "إجمالي المحصل", noData: "لا توجد بيانات", draftRestored: "تم استعادة المسودة", draftFound: "تم العثور على مسودة", resumeDraft: "استئناف", discardDraft: "تجاهل" }
    }
  },
  en: {
    translation: {
      app: { name: "Oprisma Design", tagline: "Print Pricing Calculator" },
      nav: { dashboard: "Dashboard", calculator: "Calculator", products: "Products", paper: "Paper", print: "Print", finitions: "Finitions", quotes: "Quotes", clients: "Clients", payment: "Payments", settings: "Settings" },
      common: { save: "Save", cancel: "Cancel", add: "Add", delete: "Delete", edit: "Edit", new: "New", other: "Other", price: "Price", quantity: "Quantity", total: "Total", name: "Name", actions: "Actions", confirm: "Confirm", loading: "Loading...", search: "Search", yes: "Yes", no: "No", close: "Close", back: "Back", next: "Next", print: "Print", reset: "Reset" },
      calc: {
        title: "Price Calculator",
        subtitle: "Instant pricing • Offset & Digital • Professional quotes",
        client: "Client Information",
        clientName: "Client name",
        clientCompany: "Company",
        product: "Product",
        chooseProduct: "Choose a product",
        printType: "Print type",
        paperType: "Paper type",
        paperWeight: "Weight",
        size: "Size",
        customSize: "Custom size",
        widthCm: "Width (cm)",
        heightCm: "Height (cm)",
        widthMm: "Width (mm)",
        heightMm: "Height (mm)",
        bleed: "Bleed (mm)",
        rectoVerso: "Double-sided",
        recto: "Single-sided",
        pages: "Inner pages count",
        coverPaper: "Cover paper",
        coverWeight: "Cover weight",
        finitions: "Finishings",
        pelliculages: "Lamination",
        addDesign: "Add graphic design service",
        designNote: "Design = 35% of subtotal",
        result: "Calculation result",
        breakdown: "Calculation breakdown",
        montage: "Imposition / Layout",
        unitPrice: "Unit price",
        subtotal: "Subtotal",
        designCost: "Graphic design",
        finalTotal: "Final Total",
        sheetsNeeded: "Sheets required",
        upPerSheet: "Pieces per sheet",
        paperCost: "Paper cost",
        printCost: "Printing cost",
        finitionCost: "Finishing cost",
        save: "Save quote",
        printDevis: "Print as quote",
        offsetSheet: "Offset sheet size",
        units: "Unit"
      },
      products: { title: "Products Management", new: "New product", category: "Category", minWeight: "Min weight", hasPages: "Has inner pages", hasCover: "Has cover" },
      paper: { title: "Paper Management", weights: "Available weights", pricePerSheet: "Price / SRA3 sheet", addWeight: "Add weight" },
      print: { title: "Print Types", setupCost: "Setup cost", costPerSheet: "Cost / sheet", rvMultiplier: "R/V multiplier" },
      finitions: { title: "Finitions", pelliculages: "Lamination", priceUnit: "Price unit", perUnit: "Per unit", perSqm: "Per sqm" },
      quotes: { title: "Saved quotes", empty: "No quotes yet", date: "Date", view: "View" },
      settings: { title: "Settings", designPercentage: "Design %", companyName: "Company name", currency: "Currency" },
      payment: { title: "Payment Management", totalRevenue: "Total Revenue", totalPaid: "Total Collected", totalRemaining: "Outstanding", paidQuotes: "Paid Quotes", searchPlaceholder: "Search a client...", empty: "No quotes yet", noResults: "No results found", statusPaid: "Paid", statusPartial: "Partial", statusUnpaid: "Unpaid", paid: "Paid", remaining: "Remaining", addPayment: "Pay", reset: "Reset", recordPayment: "Record Payment", alreadyPaid: "Already paid", paymentAmount: "Amount to pay", confirm: "Confirm payment" },
      clients: { title: "Client Management", addClient: "Add Client", editClient: "Edit Client", totalClients: "Total Clients", activeClients: "Active Clients", totalBusiness: "Total Business", searchPlaceholder: "Search a client...", empty: "No clients yet", noResults: "No results", orders: "Orders", paid: "Paid", remaining: "Remaining", quoteHistory: "Quote History", clientName: "Client Name", company: "Company", phone: "Phone", email: "Email", address: "Address", notes: "Notes", notesPlaceholder: "Notes about client...", nameRequired: "Name is required", added: "Client added", updated: "Client updated", deleted: "Client deleted" },
      dashboard: { title: "Dashboard", subtitle: "Overview of your business activity", monthRevenue: "Monthly Revenue", totalQuotes: "Total Quotes", uniqueClients: "Unique Clients", outstanding: "Outstanding", revenueChart: "Revenue Trend", last6Months: "Last 6 months", thisMonth: "this month", pending: "Pending", accepted: "Accepted", rejected: "Rejected", recentQuotes: "Recent Quotes", viewAll: "View all", topProducts: "Top Products", financialSummary: "Financial Summary", allTimeRevenue: "All-time Revenue", totalCollected: "Total Collected", noData: "No data yet", draftRestored: "Draft restored", draftFound: "A draft was found", resumeDraft: "Resume", discardDraft: "Discard" }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'ar', 'en'],
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  });

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
});

// Set initial direction
const initial = i18n.language || 'fr';
document.documentElement.lang = initial;
document.documentElement.dir = initial === 'ar' ? 'rtl' : 'ltr';

export default i18n;
