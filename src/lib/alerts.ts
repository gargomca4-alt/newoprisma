import Swal from 'sweetalert2';

export const showSuccess = (title: string, text?: string) => {
  return Swal.fire({
    icon: 'success',
    title: title,
    text: text,
    confirmButtonText: 'OK',
    customClass: {
      confirmButton: 'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 gradient-brand text-white shadow hover:opacity-90 h-10 px-8 py-2 rounded-md border-0',
      popup: 'rounded-2xl shadow-xl border border-muted-foreground/10 bg-background text-foreground glass',
      title: 'text-2xl font-bold text-foreground',
      htmlContainer: 'text-sm text-muted-foreground'
    },
    buttonsStyling: false,
    background: 'hsl(var(--background))',
    color: 'hsl(var(--foreground))'
  });
};

export const showError = (title: string, text?: string) => {
  return Swal.fire({
    icon: 'error',
    title: title,
    text: text,
    confirmButtonText: 'OK',
    customClass: {
      confirmButton: 'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground shadow hover:bg-destructive/90 h-10 px-8 py-2 rounded-md',
      popup: 'rounded-2xl shadow-xl border border-muted-foreground/10 bg-background text-foreground glass',
      title: 'text-2xl font-bold text-foreground',
      htmlContainer: 'text-sm text-muted-foreground'
    },
    buttonsStyling: false,
    background: 'hsl(var(--background))',
    color: 'hsl(var(--foreground))'
  });
};

export const confirmDelete = async (text: string = "Êtes-vous sûr de vouloir supprimer cet élément ?") => {
  const result = await Swal.fire({
    icon: 'warning',
    title: 'Confirmation de suppression',
    text: text,
    showCancelButton: true,
    confirmButtonText: 'Oui, supprimer',
    cancelButtonText: 'Annuler',
    customClass: {
      confirmButton: 'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground shadow hover:bg-destructive/90 h-10 px-6 py-2 rounded-md ml-2 border-0',
      cancelButton: 'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-6 py-2 rounded-md mr-2',
      popup: 'rounded-2xl shadow-xl border border-muted-foreground/10 bg-background text-foreground glass',
      title: 'text-xl font-bold text-foreground',
      htmlContainer: 'text-sm text-muted-foreground'
    },
    buttonsStyling: false,
    background: 'hsl(var(--background))',
    color: 'hsl(var(--foreground))',
    reverseButtons: true
  });
  return result.isConfirmed;
};
