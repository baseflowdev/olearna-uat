export const metadata = {
  title: "Olearna – Payment Demo",
  description: "Hubtel UAT Payment Integration",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
