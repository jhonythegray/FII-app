export const metadata = {
  title: "FII App",
  description: "Gestão de FIIs"
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br">
      <body>{children}</body>
    </html>
  );
}
