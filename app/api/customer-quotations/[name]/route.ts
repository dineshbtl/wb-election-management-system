import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(
  req: Request,
  { params }: { params: { name: string } }
) {
  const customer = decodeURIComponent(params.name);

  try {
    const headers = {
      Authorization: `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`,
    };

    const ERP_URL = "https://erp.brihaspathi.com";

    // Get all quotations for that customer
    const listRes = await axios.get(
      `${ERP_URL}/api/resource/Quotation?filters=${encodeURIComponent(
        JSON.stringify([["customer_name", "=", customer]])
      )}&fields=${encodeURIComponent(
        JSON.stringify(["name", "transaction_date", "status", "grand_total"])
      )}`,
      { headers }
    );

    const quotations = listRes.data.data || [];

    // Fetch items for each quotation
    const detailed = await Promise.all(
      quotations.map(async (q: any) => {
        try {
          const res = await axios.get(
            `${ERP_URL}/api/resource/Quotation/${q.name}`,
            { headers }
          );
          return res.data.data;
        } catch {
          return q;
        }
      })
    );

    return NextResponse.json(detailed);
  } catch (error: any) {
    console.error(
      "❌ ERP quotation fetch error:",
      error.response?.data || error.message
    );
    return NextResponse.json(
      { error: error.response?.data || error.message },
      { status: 500 }
    );
  }
}
