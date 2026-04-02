import { NextResponse } from "next/server";

export const POST = async (req: Request) => {
  try {
    const body = await req.json();
    const token = body?.token;
    const role = body?.role;

    if (typeof token !== "string" || token.length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid token" },
        { status: 400 },
      );
    }

    const res = NextResponse.json({ success: true });
    const roleCookie =
      role === null || role === undefined ? "" : String(role);

    res.cookies.set("token", token, {
      httpOnly: false,
      secure: false, // set to true in production (HTTPS)
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    res.cookies.set("role", roleCookie, {
      httpOnly: false,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err) {
    console.error("Error setting cookie:", err);
    return NextResponse.json(
      { success: false, error: "Failed to set cookie" },
      { status: 400 }
    );
  }
};
