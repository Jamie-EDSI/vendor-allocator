import { NextResponse } from "next/server";
import { parseInvoicePdf } from "../../../lib/parseInvoicePdf";
import { parseAllocationExcel } from "../../../lib/parseAllocationExcel";
import { computeAllocations } from "../../../lib/computeAllocations";
import { buildAllocationWorkbook, buildApEntryCsv } from "../../../lib/generateOutputs";
import { generateAllocationPdf } from "../../../lib/generatePdf";
import { seedAllocationRules } from "../../../lib/seedAllocationRules";

export const runtime = "nodejs";

function seedRulesAsMap() {
  const map = {};
  for (const { location, projects } of seedAllocationRules) {
    map[location.toLowerCase()] = { displayName: location, projects };
  }
  return map;
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const pdfFile = formData.get("invoicePdf");
    const excelFile = formData.get("allocationExcel");
    const vendor = formData.get("vendor") || "RingCentral";

    if (!pdfFile) {
      return NextResponse.json({ error: "Missing invoice PDF." }, { status: 400 });
    }

    const invoicePdfBuffer = Buffer.from(await pdfFile.arrayBuffer());
    const invoiceData = await parseInvoicePdf(invoicePdfBuffer);

    let allocationRules;
    if (excelFile) {
      const excelBuffer = Buffer.from(await excelFile.arrayBuffer());
      allocationRules = parseAllocationExcel(excelBuffer);
    } else {
      // Fall back to the current known percentages if no workbook is uploaded
      allocationRules = seedRulesAsMap();
    }

    const { lines, warnings } = computeAllocations(invoiceData.locations, allocationRules);

    const workbookBuffer = buildAllocationWorkbook({
      invoiceNumber: invoiceData.invoiceNumber || "UNKNOWN",
      invoiceDate: invoiceData.invoiceDate || "",
      vendor,
      lines,
    });

    const csvString = buildApEntryCsv({
      invoiceNumber: invoiceData.invoiceNumber || "UNKNOWN",
      vendor,
      lines,
    });

    const pdfBuffer = await generateAllocationPdf({
      vendor,
      invoiceNumber: invoiceData.invoiceNumber || "UNKNOWN",
      invoiceDate: invoiceData.invoiceDate || "",
      lines,
    });

    return NextResponse.json({
      invoiceNumber: invoiceData.invoiceNumber,
      invoiceDate: invoiceData.invoiceDate,
      invoiceGrandTotal: invoiceData.invoiceGrandTotal,
      locationsSubtotal: invoiceData.locationsSubtotal,
      unassignedAmount: invoiceData.unassignedAmount,
      locations: invoiceData.locations,
      lines,
      warnings,
      allocationWorkbookBase64: workbookBuffer.toString("base64"),
      apEntryCsvBase64: Buffer.from(csvString, "utf-8").toString("base64"),
      allocationPdfBase64: pdfBuffer.toString("base64"),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Processing failed." }, { status: 500 });
  }
}
