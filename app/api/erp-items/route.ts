import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const group = searchParams.get("group"); // Example: ?group=Camera

  if (!group) {
    return NextResponse.json(
      { error: "Missing group parameter" },
      { status: 400 }
    );
  }

  try {
    const headers = {
      Authorization: `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`,
    };

    // encode filter for ERPNext API
    const filters = encodeURIComponent(
      JSON.stringify([["item_group", "=", group]])
    );

    const response = await axios.get(
      `https://erp.brihaspathi.com/api/resource/Item?fields=%5B%22name%22%2C%22item_name%22%2C%22item_group%22%5D&filters=${filters}&limit_start=0&limit_page_length=500`,
      { headers }
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
