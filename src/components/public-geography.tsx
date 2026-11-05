'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { Tabs } from '@/components/ui/tabs';

type GeographyView = 'uruguay' | 'region';
type GeographyNavigation = {
  view: GeographyView;
  setView: (view: GeographyView) => void;
  region: { id: string; revision: number };
  selectGeography: (id: string) => void;
};

const GeographyContext = createContext<GeographyNavigation | null>(null);

export function PublicGeographyProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<GeographyView>('uruguay');
  const [region, setRegion] = useState({ id: 'south-america', revision: 0 });

  function selectGeography(id: string) {
    setView(id === 'uruguay' ? 'uruguay' : 'region');
    if (id !== 'uruguay') setRegion((previous) => ({ id, revision: previous.revision + 1 }));
  }

  return (
    <GeographyContext.Provider value={{ view, setView, region, selectGeography }}>
      {children}
    </GeographyContext.Provider>
  );
}

export function usePublicGeography() {
  return useContext(GeographyContext);
}

export function PublicGeographyTabs({ children }: { children: ReactNode }) {
  const navigation = usePublicGeography();
  return (
    <Tabs
      defaultValue="uruguay"
      value={navigation?.view}
      onValueChange={(value) => {
        if (value === 'uruguay' || value === 'region') navigation?.setView(value);
      }}
      className="gap-12 lg:gap-16"
    >
      {children}
    </Tabs>
  );
}
