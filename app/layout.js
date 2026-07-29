export const metadata = {
  title: "Vendor Invoice Allocator",
  description: "RingCentral invoice allocation engine",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f6f7f9" }}>
        {children}
      </body>
    </html>
  );
}
