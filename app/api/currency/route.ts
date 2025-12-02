import { NextRequest, NextResponse } from "next/server";
import { Convert } from "easy-currencies"; // ES module import

type PackageInput = {
  id: number;
  amount: number; // dalam IDR
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const packages = (body.packages || []) as PackageInput[];

    if (!Array.isArray(packages) || packages.length === 0) {
      return NextResponse.json(
        { error: "packages must be a non-empty array" },
        { status: 400 }
      );
    }

    // Ambil semua rate dari IDR sekali saja (cached mode)
    // easy mode: Convert().from("IDR").fetch()
    const convert = await Convert().from("IDR").fetch();

    // Rate IDR -> USD (1 IDR = ? USD)
    const rates = (convert as any).rates || {};
    const rateToUSD = typeof rates["USD"] === "number" ? rates["USD"] : null;

    if (!rateToUSD) {
      return NextResponse.json(
        { error: "USD rate not available for IDR" },
        { status: 500 }
      );
    }

    // Konversi tiap paket dari IDR ke USD pakai rates yang sudah di-fetch
    const items = await Promise.all(
      packages.map(async (p) => {
        const usdValue = await convert.amount(p.amount).to("USD");
        return {
          id: p.id,
          idr: p.amount,
          usd: Number(usdValue.toFixed(2)), // rapihin 2 decimal
        };
      })
    );

    return NextResponse.json({
      rate: rateToUSD,
      items,
    });
  } catch (error) {
    console.error("Currency convert error (easy-currencies):", error);
    return NextResponse.json(
      { error: "Failed to convert currency" },
      { status: 500 }
    );
  }
}
