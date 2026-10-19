'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';

export type ProjectTopbarConfig = {
  projectName: string;
  selectedYear: number;
  years: number[];
};

type TopbarContextValue = {
  projectConfig: ProjectTopbarConfig | null;
  setProjectConfig: Dispatch<SetStateAction<ProjectTopbarConfig | null>>;
  resourceLabel: string | null;
  setResourceLabel: Dispatch<SetStateAction<string | null>>;
};

const TopbarContext = createContext<TopbarContextValue | null>(null);

export function TopbarProvider({ children }: { children: ReactNode }) {
  const [projectConfig, setProjectConfig] = useState<ProjectTopbarConfig | null>(null);
  const [resourceLabel, setResourceLabel] = useState<string | null>(null);
  const value = useMemo(
    () => ({ projectConfig, setProjectConfig, resourceLabel, setResourceLabel }),
    [projectConfig, resourceLabel]
  );

  return <TopbarContext.Provider value={value}>{children}</TopbarContext.Provider>;
}

export function useTopbar() {
  const context = useContext(TopbarContext);

  if (!context) {
    throw new Error('useTopbar must be used within TopbarProvider');
  }

  return context;
}

export function ProjectTopbarRegistration({
  projectName,
  selectedYear,
  years,
}: ProjectTopbarConfig) {
  const { setProjectConfig } = useTopbar();

  useEffect(() => {
    setProjectConfig({
      projectName,
      selectedYear,
      years,
    });

    return () => setProjectConfig(null);
  }, [projectName, selectedYear, setProjectConfig, years]);

  return null;
}

export function BreadcrumbResourceLabel({ label }: { label: string }) {
  const { setResourceLabel } = useTopbar();

  useEffect(() => {
    setResourceLabel(label);

    return () => setResourceLabel(null);
  }, [label, setResourceLabel]);

  return null;
}
