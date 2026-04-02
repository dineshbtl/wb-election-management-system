import { NextResponse } from "next/server";
import axios from "axios";

export async function GET() {
  try {
    // Fetch large page size (500 items)
    const response = await axios.get(
      "https://erp.brihaspathi.com/api/resource/Item?limit_start=0&limit_page_length=5000",
      {
        headers: {
          Authorization: `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`,
        },
      }
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error(
      "❌ ERPNext fetch error:",
      error.response?.data || error.message
    );
    return NextResponse.json(
      { error: error.response?.data || error.message },
      { status: 500 }
    );
  }
}
