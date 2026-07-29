import { buildAllocationTemplate } from "../../../lib/generateOutputs";
import { seedAllocationRules } from "../../../lib/seedAllocationRules";

export const runtime = "nodejs";

export async function GET() {
  const buffer = buildAllocationTemplate(seedAllocationRules);
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="allocation-rules-template.xlsx"',
    },
  });
}
