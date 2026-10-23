
import { NextRequest, NextResponse } from "next/server";
import { researchClaim } from "@/lib/research";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const claim = body?.claim;

    if (
      typeof claim !== "string" ||
      claim.trim().length < 12 ||
      claim.length > 500
    ) {
      return NextResponse.json(
        { error: "Claim must be between 12 and 500 characters." },
        { status: 400 }
      );
    }

    const result = await researchClaim(claim.trim());

    return NextResponse.json(result);
  } catch (error) {
    console.error("Research API failed:", error);

    return NextResponse.json(
      { error: "Unable to retrieve research sources." },
      { status: 502 }
    );
  }
}

