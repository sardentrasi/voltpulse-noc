import './globals.css';
import Providers from '@/components/Providers';

export const metadata = {
  title: 'VoltPulse NOC — Network Operations Center',
  description: 'Monitor and manage your network devices (MikroTik, Ruijie, Ruckus, UniFi) from a single command center.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
