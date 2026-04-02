// import { NextResponse } from "next/server";
// import axios from "axios";

// export async function GET(req: Request) {
//   const { searchParams } = new URL(req.url);

//   // Read parameters
//   const search = searchParams.get("search") || ""; // optional search query
//   const start = Number(searchParams.get("start")) || 0; // offset
//   const limit = Number(searchParams.get("limit")) || 20; // number per page

//   try {
//     const headers = {
//       Authorization: `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`,
//     };

//     // Construct filters dynamically
//     const filters = search
//       ? encodeURIComponent(
//           JSON.stringify([["customer_name", "like", `%${search}%`]])
//         )
//       : "";

//     // ERPNext API URL
//     const url = `https://erp.brihaspathi.com/api/resource/Customer?fields=${encodeURIComponent(
//       JSON.stringify([
//         "name",
//         "customer_name",
//         "mobile_no",
//         "email_id",
//         "gstin",
//         "creation",
//       ])
//     )}&limit_start=${start}&limit_page_length=${limit}${
//       filters ? `&filters=${filters}` : ""
//     }`;

//     const response = await axios.get(url, { headers });

//     return NextResponse.json({
//       success: true,
//       total: response.data.data?.length || 0,
//       customers: response.data.data || [],
//     });
//   } catch (error: any) {
//     console.error(
//       "❌ ERPNext customer fetch error:",
//       error.response?.data || error.message
//     );
//     return NextResponse.json(
//       { error: error.response?.data || error.message },
//       { status: 500 }
//     );
//   }
// }

import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // 🧭 Read parameters
  const search = searchParams.get("search") || "";
  const start = Number(searchParams.get("start")) || 0;
  const limit = Number(searchParams.get("limit")) || 1000; // fetch up to 1000 records

  try {
    const headers = {
      Authorization: `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`,
    };

    // 🧠 Build filters dynamically for search
    const filters = search
      ? encodeURIComponent(
          JSON.stringify([["customer_name", "like", `%${search}%`]])
        )
      : "";

    // 🧭 ERPNext API URL
    const url = `https://erp.brihaspathi.com/api/resource/Customer?fields=${encodeURIComponent(
      JSON.stringify([
        "name",
        "customer_name",
        "mobile_no",
        "email_id",
        "gstin",
        "creation",
      ])
    )}&limit_start=${start}&limit_page_length=${limit}${
      filters ? `&filters=${filters}` : ""
    }`;

    // 🔹 Fetch from ERPNext
    const response = await axios.get(url, { headers });

    return NextResponse.json({
      success: true,
      total: response.data.data?.length || 0,
      customers: response.data.data || [],
    });
  } catch (error: any) {
    console.error(
      "❌ ERPNext customer fetch error:",
      error.response?.data || error.message
    );
    return NextResponse.json(
      { error: error.response?.data || error.message },
      { status: 500 }
    );
  }
}
