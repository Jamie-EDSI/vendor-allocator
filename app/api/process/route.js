import { NextResponse } from "next/server";
import { parseInvoicePdf } from "../../../lib/parseInvoicePdf";
import { parseAllocationExcel } from "../../../lib/parseAllocationExcel";
import { distributeUnassigned } from "../../../lib/distributeUnassigned";
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

    const distributedLocations = distributeUnassigned(
      invoiceData.locations,
      invoiceData.unassignedAmount,
      invoiceData.locationsSubtotal
    );

    const { lines, warnings } = computeAllocations(distributedLocations, allocationRules);

    const workbookBuffer = buildAllocationWorkbook({
      invoiceNumber: invoiceData.invoiceNumber || "UNKNOWN",
      invoiceDate: invoiceData.invoiceDate || "",
      vendor,
      lines,
      distributedLocations,
      unassignedAmount: invoiceData.unassignedAmount,
      invoiceGrandTotal: invoiceData.invoiceGrandTotal,
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
      distributedLocations,
      unassignedAmount: invoiceData.unassignedAmount,
      invoiceGrandTotal: invoiceData.invoiceGrandTotal,
    });

    return NextResponse.json({
      invoiceNumber: invoiceData.invoiceNumber,
      invoiceDate: invoiceData.invoiceDate,
      invoiceGrandTotal: invoiceData.invoiceGrandTotal,
      locationsSubtotal: invoiceData.locationsSubtotal,
      unassignedAmount: invoiceData.unassignedAmount,
      locations: invoiceData.locations,
      distributedLocations,
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
