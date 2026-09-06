import './globals.css';
import { AppProvider } from '@/components/app-provider';

export const metadata = { title: 'SecureX — Cyber risk, priced in rupees', description: 'Continuous cyber risk quantification for Indian enterprises.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AppProvider>{children}</AppProvider></body></html>;
}
