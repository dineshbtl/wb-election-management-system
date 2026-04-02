import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // In a real application, you would:
    // 1. Hash the password and compare with stored hash
    // 2. Query the database for user credentials
    // 3. Generate a JWT token
    // 4. Set secure HTTP-only cookies

    // Mock authentication for demo
    if (username && password) {
      const mockUser = {
        id: 1,
        username,
        fullName: "Survey Team Member",
        division: "Pune",
        depot: "Central",
        role: "surveyor",
      };

      return NextResponse.json({
        success: true,
        user: mockUser,
        token: "mock-jwt-token",
      });
    }

    return NextResponse.json(
      { success: false, message: "Invalid credentials" },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
