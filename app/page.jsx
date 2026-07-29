"use client";

import { useState } from "react";

function downloadBase64(base64, filename, mime) {
  const link = document.createElement("a");
  link.href = `data:${mime};base64,${base64}`;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function Home() {
  const [pdfFile, setPdfFile] = useState(null);
  const [excelFile, setExcelFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleProcess() {
    if (!pdfFile) {
      setError("Please upload the invoice PDF first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("invoicePdf", pdfFile);
    if (excelFile) formData.append("allocationExcel", excelFile);
    formData.append("vendor", "RingCentral");

    try {
      const res = await fetch("/api/process", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const totalAllocated = result?.lines?.reduce((s, l) => s + l.amount, 0) ?? 0;

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Vendor Invoice Allocator</h1>
      <p style={{ color: "#555", marginTop: 0 }}>
        Upload a RingCentral invoice PDF and an allocation percentage workbook. This will
        generate an Allocation Workbook and an AP Entry File, matching your current manual
        process.
      </p>

      <section
        style={{
          background: "white",
          border: "1px solid #e2e2e2",
          borderRadius: 10,
          padding: 24,
          marginTop: 24,
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
            1. Invoice PDF (required)
          </label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setPdfFile(e.target.files[0])}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
            2. Allocation percentage workbook (optional — uses current known percentages if
            skipped)
          </label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setExcelFile(e.target.files[0])}
          />
          <div style={{ marginTop: 8 }}>
            <a href="/api/template" style={{ fontSize: 14 }}>
              Download a pre-filled template →
            </a>
          </div>
        </div>

        <button
          onClick={handleProcess}
          disabled={loading}
          style={{
            background: "#0b57d0",
            color: "white",
            border: "none",
            borderRadius: 6,
            padding: "10px 20px",
            fontSize: 15,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Processing…" : "Process Invoice"}
        </button>

        {error && (
          <p style={{ color: "#b00020", marginTop: 16 }}>
            {error}
          </p>
        )}
      </section>

      {result && (
        <section
          style={{
            background: "white",
            border: "1px solid #e2e2e2",
            borderRadius: 10,
            padding: 24,
            marginTop: 24,
          }}
        >
          <h2 style={{ fontSize: 20, marginTop: 0 }}>
            Invoice {result.invoiceNumber} — {result.invoiceDate}
          </h2>
          <p style={{ color: "#555" }}>
            Invoice total: ${result.invoiceGrandTotal?.toFixed(2)} &nbsp;|&nbsp; Allocated total: $
            {totalAllocated.toFixed(2)}
            {Math.abs(totalAllocated - result.invoiceGrandTotal) > 0.01 && (
              <span style={{ color: "#b00020", fontWeight: 600 }}>
                {" "}
                — doesn't match invoice total, check warnings below
              </span>
            )}
          </p>
          {result.unassignedAmount > 0.01 && (
            <p style={{ color: "#777", fontSize: 13 }}>
              ${result.unassignedAmount.toFixed(2)} of this invoice was corporate/unassigned
              (not tied to a location) and has been spread proportionally across all locations
              before splitting by project — see the Entry Distribution page/sheet in the
              downloads.
            </p>
          )}

          {result.warnings?.length > 0 && (
            <div
              style={{
                background: "#fff8e1",
                border: "1px solid #ffe0a3",
                borderRadius: 6,
                padding: 12,
                marginBottom: 16,
              }}
            >
              {result.warnings.map((w, i) => (
                <div key={i} style={{ fontSize: 14 }}>⚠️ {w}</div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <button
              onClick={() =>
                downloadBase64(
                  result.allocationWorkbookBase64,
                  `${result.invoiceNumber}-allocation-workbook.xlsx`,
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                )
              }
              style={buttonStyle}
            >
              Download Allocation Workbook (.xlsx)
            </button>
            <button
              onClick={() =>
                downloadBase64(result.apEntryCsvBase64, `${result.invoiceNumber}-ap-entries.csv`, "text/csv")
              }
              style={buttonStyle}
            >
              Download AP Entry File (.csv)
            </button>
            <button
              onClick={() =>
                downloadBase64(
                  result.allocationPdfBase64,
                  `${result.invoiceNumber}-allocation-summary.pdf`,
                  "application/pdf"
                )
              }
              style={buttonStyle}
            >
              Download Allocation PDF
            </button>
            <button
              onClick={() =>
                downloadBase64(
                  result.allocationSummaryBase64,
                  `${result.invoiceNumber}-allocation-summary.xlsx`,
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                )
              }
              style={buttonStyle}
            >
              Allocation Summary
            </button>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: "6px 8px" }}>Location</th>
                <th style={{ padding: "6px 8px" }}>Project</th>
                <th style={{ padding: "6px 8px" }}>%</th>
                <th style={{ padding: "6px 8px", textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {result.lines.map((l, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "6px 8px" }}>{l.location}</td>
                  <td style={{ padding: "6px 8px" }}>{l.project}</td>
                  <td style={{ padding: "6px 8px" }}>{(l.percentage * 100).toFixed(0)}%</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>${l.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}

const buttonStyle = {
  background: "white",
  border: "1px solid #0b57d0",
  color: "#0b57d0",
  borderRadius: 6,
  padding: "8px 16px",
  fontSize: 14,
  cursor: "pointer",
};
