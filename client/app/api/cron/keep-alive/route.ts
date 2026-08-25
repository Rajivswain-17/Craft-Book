import { NextResponse } from "next/server";

export async function GET() {
  const backendUrl =
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "https://craft-book-api.onrender.com";

  try {
    const res = await fetch(`${backendUrl.replace(/\/$/, "")}/health`, {
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json({ success: true, timestamp: Date.now(), backend: data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
