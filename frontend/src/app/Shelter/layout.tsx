import type { ReactNode } from 'react';
import { ShelterLayout } from './components/ShelterLayout';

export default function Layout({ children }: { children: ReactNode }) {
  return <ShelterLayout>{children}</ShelterLayout>;
}
