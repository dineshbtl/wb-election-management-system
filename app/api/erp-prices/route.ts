import { NextResponse } from "next/server";
import axios from "axios";

/**
 * ERPNext → Fetch Item Prices (supports optional filters)
 *
 * Example:
 * /api/erp-prices
 * /api/erp-prices?item_codes=CIVIL WORK,CAT6 Cable,DVR
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const itemCodesParam = searchParams.get("item_codes"); // comma-separated list of item_codes

    // 🔹 Build filters
    let filters = [];
    if (itemCodesParam) {
      const codes = itemCodesParam.split(",").map((c) => c.trim());
      filters = [["item_code", "in", codes]];
    }

    // 🔹 Encode filters and fields
    const filtersEncoded = encodeURIComponent(JSON.stringify(filters));
    const fieldsEncoded = encodeURIComponent(
      JSON.stringify(["item_code", "price_list_rate", "price_list", "currency"])
    );

    // 🔹 ERPNext endpoint
    const ERP_URL = `https://erp.brihaspathi.com/api/resource/Item Price?filters=${filtersEncoded}&fields=${fieldsEncoded}&limit_page_length=500`;

    // 🔹 Fetch from ERPNext
    const response = await axios.get(ERP_URL, {
      headers: {
        Authorization: `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`,
      },
    });

    // ✅ Return data
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error(
      "❌ ERPNext price fetch error:",
      error.response?.data || error.message
    );
    return NextResponse.json(
      { error: error.response?.data || error.message },
      { status: 500 }
    );
  }
}
