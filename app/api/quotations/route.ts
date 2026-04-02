import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const customer = searchParams.get("customer");

  if (!customer) {
    return NextResponse.json(
      { error: "Missing customer name" },
      { status: 400 }
    );
  }

  try {
    const headers = {
      Authorization: `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`,
    };

    const ERP_URL = "https://erp.brihaspathi.com";

    // Step 1: Get quotation list for that customer
    const listRes = await axios.get(
      `${ERP_URL}/api/resource/Quotation?filters=${encodeURIComponent(
        JSON.stringify([["customer_name", "=", customer]])
      )}&fields=${encodeURIComponent(
        JSON.stringify([
          "name",
          "customer_name",
          "transaction_date",
          "status",
          "grand_total",
        ])
      )}`,
      { headers }
    );

    const quotations = listRes.data.data || [];

    // Step 2: Fetch details (items) for each quotation
    const detailed = await Promise.all(
      quotations.map(async (q: any) => {
        try {
          const detail = await axios.get(
            `${ERP_URL}/api/resource/Quotation/${q.name}`,
            { headers }
          );
          return detail.data.data;
        } catch (err) {
          console.warn(`⚠️ Failed to fetch details for ${q.name}`);
          return q;
        }
      })
    );

    return NextResponse.json({ success: true, data: detailed });
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
