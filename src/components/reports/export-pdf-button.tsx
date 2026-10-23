'use client';

import { useRef, useState } from 'react';
import { Loader2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notify } from '@/lib/notify';
import { REPORT_FILE_NAME_HEADER } from '@/lib/reports/http';

const GENERIC_ERROR = 'No se pudo generar el PDF. Probá de nuevo.';

type ExportPdfButtonProps = {
  href: string;
  label: string;
  className?: string;
};

async function readErrorMessage(response: Response) {
  if (!response.headers.get('Content-Type')?.includes('application/json')) return null;
  const body: unknown = await response.json().catch(() => null);
  return body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
    ? body.message
    : null;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function ExportPdfButton({ href, label, className }: ExportPdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const inFlight = useRef(false);

  async function handleExport() {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsGenerating(true);

    try {
      const response = await fetch(href, { cache: 'no-store' });
      const isPdf = response.headers.get('Content-Type')?.includes('application/pdf');

      if (!response.ok || !isPdf) {
        const message = response.status < 500 ? await readErrorMessage(response) : null;
        if (response.status === 404 && message) notify.warning({ title: message });
        else notify.error({ title: message ?? GENERIC_ERROR });
        return;
      }

      const fileName = response.headers.get(REPORT_FILE_NAME_HEADER) ?? 'reporte.pdf';
      downloadBlob(await response.blob(), fileName);
      notify.success({ title: `Se descargó ${fileName}` });
    } catch {
      notify.error({ title: GENERIC_ERROR });
    } finally {
      inFlight.current = false;
      setIsGenerating(false);
    }
  }

  return (
    <Button
      variant="outline"
      className={className}
      disabled={isGenerating}
      aria-busy={isGenerating}
      onClick={handleExport}
    >
      {isGenerating ? (
        <>
          <Loader2Icon className="animate-spin" aria-hidden="true" />
          Generando PDF…
        </>
      ) : (
        label
      )}
    </Button>
  );
}
