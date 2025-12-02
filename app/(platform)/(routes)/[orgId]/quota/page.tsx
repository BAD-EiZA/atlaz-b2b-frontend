"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  Zap,
  BookOpen,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import { Pagination } from "@/components/pagination";
import {
  useOrgPackages,
  useOrgPaymentHistory,
  useOrgQuotaSummary,
} from "@/app/actions/hooks/b2b/useOrg";
import { getExamQuotaPercent, getRemainingQuota } from "@/helper/query";
import { useB2BOrgStore } from "@/store/useB2BOrgStore";

// --- helper: ambil accessToken dari cookie (sama seperti pricing_b2b.jsx) ---
const getAccessToken = () => {
  if (typeof document === "undefined") return null;
  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith("accessToken="))
      ?.split("=")[1] || null
  );
};

type ExamKey = "ielts" | "toefl";
type Currency = "IDR" | "USD";

const MAX_VISIBLE_PACKAGES = 4;

const formatIDR = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

const formatUSD = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount);

export default function QuotaPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = Number(params.orgId);
  const router = useRouter();

  const [selectedExam, setSelectedExam] = useState<ExamKey>("ielts");
  const [selectedTestType, setSelectedTestType] = useState<string>("Complete");

  const [currentTransactionPage, setCurrentTransactionPage] = useState(1);
  const transactionItemsPerPage = 10;

  // Index untuk carousel packages
  const [currentPackageIndex, setCurrentPackageIndex] = useState(0);

  // context B2B (org + user) dari zustand
  const { org, user } = useB2BOrgStore();

  // ---- Currency detection ----
  const [currency, setCurrency] = useState<Currency>("IDR");
  const [isDetectingCurrency, setIsDetectingCurrency] = useState(true);

  useEffect(() => {
    const detectCurrency = async () => {
      try {
        // 1) Dapatkan IP publik user dari ipify
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipJson = await ipRes.json();
        const ip = ipJson?.ip;

        if (!ip) {
          throw new Error("IP not found");
        }

        // 2) Kirim ke API route yang pakai geoip-country
        const geoRes = await fetch(`/api/geoip?ip=${encodeURIComponent(ip)}`);
        const geoJson = await geoRes.json();

        const country = geoJson?.country as string | null;

        // 3) Atur currency:
        //    - Indonesia (ID) => IDR
        //    - Selain itu => USD
        if (country && country.toUpperCase() !== "ID") {
          setCurrency("USD");
        } else {
          setCurrency("IDR");
        }
      } catch (error) {
        console.error("Failed to detect location, fallback to IDR:", error);
        setCurrency("IDR");
      } finally {
        setIsDetectingCurrency(false);
      }
    };

    detectCurrency();
  }, []);

  // ---- Data hooks ----
  const {
    data: packagesData,
    isLoading: packagesLoading,
    isError: packagesError,
  } = useOrgPackages(orgId);

  const {
    data: quotaSummary,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useOrgQuotaSummary(orgId);

  const {
    data: historyData,
    isLoading: historyLoading,
    isError: historyError,
  } = useOrgPaymentHistory({
    orgId,
    page: currentTransactionPage,
    pageSize: transactionItemsPerPage,
  });

  const examPackages = packagesData?.examPackages;

  const currentExam =
    selectedExam === "ielts" ? examPackages?.ielts : examPackages?.toefl;

  const currentTestTypes = currentExam?.testTypes || [];

  // Pastikan selectedTestType selalu valid ketika data packages berubah
  useEffect(() => {
    if (!currentExam) return;
    if (!currentExam.testTypes.length) return;

    if (!currentExam.testTypes.includes(selectedTestType)) {
      setSelectedTestType(currentExam.testTypes[0]);
    }
  }, [currentExam, selectedTestType]);

  // Reset index carousel saat ganti exam / test type
  useEffect(() => {
    setCurrentPackageIndex(0);
  }, [selectedExam, selectedTestType]);

  const currentPackages = currentExam?.packagesByType[selectedTestType] || [];

  const remainingTests = getRemainingQuota(
    quotaSummary,
    selectedExam,
    selectedTestType
  );

  const quotaPercent = getExamQuotaPercent(quotaSummary, selectedExam);

  const transactions = historyData?.transactions || [];
  const totalItems = historyData?.raw.total || 0;
  const pageSize = historyData?.raw.pageSize || transactionItemsPerPage;
  const totalTransactionPages = historyData
    ? Math.max(1, Math.ceil(historyData.raw.total / pageSize))
    : 1;

  const getPricePerTest = (price: number, quota: number) => {
    if (!quota) return 0;
    return Math.round(price / quota);
  };

  // ---- Map harga USD per packageId (hasil dari easy-currencies via API route) ----
  const [usdPriceMap, setUsdPriceMap] = useState<Record<number, number>>({});

  useEffect(() => {
    // Hanya konversi kalau:
    // - currency = USD (user di luar Indonesia)
    // - dan ada currentPackages
    if (currency !== "USD") return;
    if (!currentPackages.length) return;

    // Cari package yang belum punya harga USD
    const missingPkgs = currentPackages.filter(
      (pkg: any) => usdPriceMap[pkg.id] == null
    );
    if (!missingPkgs.length) return;

    const controller = new AbortController();

    const fetchUSDPrices = async () => {
      try {
        const res = await fetch("/api/currency/convert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            packages: missingPkgs.map((pkg: any) => ({
              id: pkg.id,
              amount: pkg.price, // harga IDR
            })),
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error("Failed to convert currency");
        }

        const data = await res.json();

        const newMap: Record<number, number> = {};
        (data.items || []).forEach(
          (item: { id: number; usd: number; idr: number }) => {
            newMap[item.id] = item.usd;
          }
        );

        setUsdPriceMap((prev) => ({ ...prev, ...newMap }));
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Currency conversion error:", error);
      }
    };

    fetchUSDPrices();

    return () => controller.abort();
  }, [currency, currentPackages, usdPriceMap]);

  // Helper: ambil harga yang ditampilkan sesuai currency (IDR / USD)
  const getDisplayPrice = (pkg: any) => {
    if (currency === "USD") {
      const usd = usdPriceMap[pkg.id];
      if (usd != null) {
        return {
          amount: usd,
          currency: "USD" as Currency,
        };
      }
      // Kalau USD belum ready (lagi fetch / error), sementara fallback IDR
    }

    return {
      amount: pkg.price as number,
      currency: "IDR" as Currency,
    };
  };

  // ---------- BUY handler (create invoice B2B) ----------
  const [buyingId, setBuyingId] = useState<number | null>(null);

  const handlePurchase = async (pkg: any) => {
    // Pastikan user login
    if (!user?.id) {
      router.push("/login");
      return;
    }

    // Pastikan org ada: pakai orgId dari URL atau dari store
    const finalOrgId = org?.id ?? orgId;
    if (!finalOrgId) {
      alert("Organization tidak ditemukan. Silakan pilih organisasi dulu.");
      return;
    }

    // Kalau user di luar Indonesia, kita set currency = USD, kalau tidak IDR.
    const displayPrice = getDisplayPrice(pkg);
    const finalCurrency: Currency =
      currency === "USD" ? "USD" : displayPrice.currency;

    try {
      setBuyingId(pkg.id);

      const token = getAccessToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await axios.post(
        `https://api-test.hiatlaz.com/api/v1/payment_b2b/payment/create-invoice`,
        {
          orgId: finalOrgId,
          priceId: pkg.id,
          currency: finalCurrency, // "IDR" atau "USD"
          user: {
            id: user.id,
            email: user.email,
          },
        },
        { headers }
      );

      const url = res?.data?.data?.invoice_url;
      if (url) {
        window.location.href = url;
      } else {
        alert("Gagal membuat invoice. Silakan coba lagi.");
      }
    } catch (err: any) {
      console.error("B2B payment error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to create invoice.";
      alert(msg);
    } finally {
      setBuyingId(null);
    }
  };

  const examLabel =
    currentExam?.name ?? (selectedExam === "ielts" ? "IELTS" : "TOEFL");

  const totalPackages = currentPackages.length;
  const maxStartIndex = Math.max(0, totalPackages - MAX_VISIBLE_PACKAGES);
  const showCarouselControls = totalPackages > MAX_VISIBLE_PACKAGES;

  const visiblePackages = currentPackages.slice(
    currentPackageIndex,
    currentPackageIndex + MAX_VISIBLE_PACKAGES
  );

  const handleNextPackages = () => {
    setCurrentPackageIndex((prev) => {
      const nextIndex = prev + MAX_VISIBLE_PACKAGES;
      return Math.min(nextIndex, maxStartIndex);
    });
  };

  const handlePrevPackages = () => {
    setCurrentPackageIndex((prev) => Math.max(prev - MAX_VISIBLE_PACKAGES, 0));
  };

  return (
    <div className="p-8">
      <div className="flex md:flex-row flex-col items-start md:items-center justify-between mb-2">
        <div className="flex-1">
          <Breadcrumb items={[{ label: "Quota & Purchase" }]} />
          <h1 className="text-xl md:text-3xl font-bold text-foreground">
            Quota Purchase
          </h1>
          <p className="mt-2 text-sm md:text-base text-muted-foreground">
            Buy and manage test quotas for your organization
          </p>
        </div>
        <Link href={`/${orgId}/dashboard`}>
          <Button variant="outline" className="gap-2 bg-transparent">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Info currency */}
      <div className="mb-4 text-sm text-muted-foreground">
        {isDetectingCurrency
          ? "Detecting your location and currency..."
          : currency === "IDR"
          ? "Prices are shown in Indonesian Rupiah (IDR)."
          : "Prices are shown in US Dollars (USD) based on your location."}
      </div>

      {/* Exam Type Selection */}
      <div className="mb-2 flex gap-4">
        <Button
          onClick={() => {
            setSelectedExam("ielts");
            setSelectedTestType("Complete");
          }}
          variant={selectedExam === "ielts" ? "default" : "outline"}
          className="gap-2"
        >
          <BookOpen className="h-4 w-4" />
          IELTS
        </Button>
        <Button
          onClick={() => {
            setSelectedExam("toefl");
            setSelectedTestType("Complete");
          }}
          variant={selectedExam === "toefl" ? "default" : "outline"}
          className="gap-2"
        >
          <BookOpen className="h-4 w-4" />
          TOEFL
        </Button>
      </div>

      {/* Test Type Tabs */}
      <div className="mb-2">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {currentTestTypes.length === 0 && !packagesLoading && (
            <span className="text-sm text-muted-foreground">
              No packages available for this exam.
            </span>
          )}
          {currentTestTypes.map((testType) => (
            <Button
              key={testType}
              onClick={() => setSelectedTestType(testType)}
              variant={selectedTestType === testType ? "default" : "outline"}
              className="whitespace-nowrap"
            >
              {testType}
            </Button>
          ))}
        </div>
      </div>

      {/* Current Usage */}
      <Card className="mb-8 p-6">
        {summaryError ? (
          <p className="text-sm text-red-500">
            Failed to load quota summary. Please try again.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between ">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Available Quota - {examLabel} {selectedTestType}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Your remaining tests
                </p>
              </div>
              <div className="text-right">
                {summaryLoading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-foreground">
                      {remainingTests}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Tests remaining
                    </p>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Pricing Packages */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Buy {examLabel} {selectedTestType} Quota
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Currency: {currency === "IDR" ? "IDR (Indonesia)" : "USD (outside Indonesia)"}
        </p>

        {packagesError && (
          <p className="text-sm text-red-500 mb-4">
            Failed to load packages. Please refresh the page.
          </p>
        )}

        {packagesLoading ? (
          <p className="text-sm text-muted-foreground">Loading packages...</p>
        ) : currentPackages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No packages available for this test type.
          </p>
        ) : (
          <>
            <div className="relative">
              {showCarouselControls && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 rounded-full bg-background shadow disabled:opacity-40"
                    onClick={handlePrevPackages}
                    disabled={currentPackageIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 rounded-full bg-background shadow disabled:opacity-40"
                    onClick={handleNextPackages}
                    disabled={currentPackageIndex >= maxStartIndex}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {visiblePackages.map((pkg: any) => {
                  const displayPrice = getDisplayPrice(pkg);
                  const totalPrice = displayPrice.amount;
                  const pricePerTest = getPricePerTest(
                    totalPrice,
                    pkg.quotaAmount
                  );

                  const formattedTotal =
                    displayPrice.currency === "IDR"
                      ? formatIDR(totalPrice)
                      : formatUSD(totalPrice);

                  const formattedPerTest =
                    displayPrice.currency === "IDR"
                      ? formatIDR(pricePerTest)
                      : formatUSD(pricePerTest);

                  return (
                    <Card
                      key={pkg.id}
                      className={`p-6 relative transition-all ${
                        pkg.popular
                          ? "ring-2 ring-primary shadow-lg"
                          : "border-border"
                      }`}
                    >
                      {pkg.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                            Best Value
                          </span>
                        </div>
                      )}

                      <h3 className="text-lg font-bold text-foreground mb-2">
                        {pkg.name}
                      </h3>
                      <div className="mb-6">
                        <div className="text-3xl font-bold text-foreground">
                          {formattedTotal}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formattedPerTest} per test
                        </p>
                      </div>

                      <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-primary">
                        <Zap className="h-4 w-4" />
                        {pkg.quotaAmount}x Tests
                      </div>

                      <ul className="mb-6 space-y-3">
                        {pkg.features.map((feature: string, idx: number) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-sm text-foreground"
                          >
                            <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>

                      <Button
                        onClick={() => handlePurchase(pkg)}
                        className="w-full gap-2"
                        variant={pkg.popular ? "default" : "outline"}
                        disabled={buyingId === pkg.id}
                      >
                        <ShoppingCart className="h-4 w-4" />
                        {buyingId === pkg.id ? "Processing..." : "Buy Now"}
                      </Button>
                    </Card>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Purchase History */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Purchase History
        </h2>

        {historyError ? (
          <p className="text-sm text-red-500 mb-4">
            Failed to load purchase history.
          </p>
        ) : historyLoading ? (
          <p className="text-sm text-muted-foreground">Loading history...</p>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No purchase history yet.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                      Package
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                      Amount
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction: any) => (
                    <tr
                      key={transaction.id}
                      className="border-b border-border hover:bg-muted"
                    >
                      <td className="py-3 px-4 text-sm text-foreground">
                        {transaction.date}
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground">
                        {transaction.package}
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-foreground">
                        {transaction.currency === "IDR"
                          ? formatIDR(transaction.amount)
                          : `${transaction.amount} ${transaction.currency}`}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                          {transaction.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentTransactionPage}
              totalPages={totalTransactionPages}
              onPageChange={setCurrentTransactionPage}
              totalItems={totalItems}
              itemsPerPage={pageSize}
            />
          </>
        )}
      </Card>
    </div>
  );
}
