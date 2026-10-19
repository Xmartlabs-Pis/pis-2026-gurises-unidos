'use client';

import Image from 'next/image';
import logo from '@/assets/logo.png';
import { AppBreadcrumb } from '@/components/breadcrumb';
import { useTopbar } from '@/components/layout/topbar-context';
import { ProjectYearSelector } from '@/components/projects/detail/project-year-selector';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function Topbar() {
  const { projectConfig, resourceLabel } = useTopbar();

  return (
    <header className="border-border bg-background sticky top-0 z-10 flex h-15 items-center justify-between gap-4 border-b px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="md:hidden" />
        <Image
          className="size-8 shrink-0 rounded-md md:hidden"
          src={logo}
          alt="Gurises Unidos"
          width={32}
          height={32}
        />
        <span className="text-sm font-semibold md:hidden">Gurises Unidos</span>
        <AppBreadcrumb resourceLabel={resourceLabel ?? projectConfig?.projectName} />
      </div>
      <div className="hidden shrink-0 items-center gap-2 md:flex">
        {projectConfig && (
          <ProjectYearSelector year={projectConfig.selectedYear} years={projectConfig.years} />
        )}
      </div>
    </header>
  );
}
