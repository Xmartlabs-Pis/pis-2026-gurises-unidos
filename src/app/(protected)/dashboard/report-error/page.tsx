import { ErrorScreen } from '@/components/error-screen';
import { isReportErrorReason, REPORT_ERRORS } from '@/lib/reports/http';
import { firstValue, type RawSearchParams } from '@/lib/url-filters';

export default async function ReportErrorPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const reason = firstValue((await searchParams).reason);
  if (!isReportErrorReason(reason)) return <ErrorScreen code={404} />;

  const { status, title, message } = REPORT_ERRORS[reason];
  return <ErrorScreen code={status} title={title} description={message} />;
}
