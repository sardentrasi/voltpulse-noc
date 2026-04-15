import './globals.css';

export const metadata = {
  title: 'NOC Dashboard — Network Operations Center',
  description: 'Monitor and manage your network devices (MikroTik, Ruijie, Ruckus, UniFi) from a single command center.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
