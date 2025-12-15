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
  X,
  TicketPercent,
  AlertCircle,
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
import Loader from "@/components/common/Loader";
import api from "@/lib/api";

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
const MIN_CUSTOM_QTY = 5;

const formatIDR = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

const formatUSD = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount) + "$";

// Mapping test_type_id sesuai info kamu
const resolveTestTypeId = (
  exam: ExamKey,
  testTypeLabel: string,
  pkg?: any
): number | null => {
  const key = String(testTypeLabel || "").trim().toLowerCase();

  if (exam === "ielts") {
    if (key === "listening") return 1;
    if (key === "reading") return 2;
    if (key === "writing") return 3;
    if (key === "speaking") return 4;
    if (key === "complete") return 5;
  } else {
    // TOEFL
    if (key === "listening") return 1;
    if (
      key === "structure" ||
      key === "structure & written expression" ||
      key === "grammar"
    )
      return 2;
    if (key === "reading") return 3;
    if (key === "complete") return 4;
  }

  // fallback ke field dari pkg kalau ada
  if (pkg?.test_type_id) return Number(pkg.test_type_id);
  if (pkg?.testTypeId) return Number(pkg.testTypeId);

  return null;
};

// Bentuk response dari backend /b2b/vouchers/apply
type VoucherApplyResponse = {
  baseAmount: number;
  finalAmount: number;
  totalDiscount: number;
  applied: {
    voucherId: number;
    code: string;
    type: "NOMINAL_NUMBERS" | "PERCENTAGE";
    amount: number; // nilai persentase atau nominal
    discountValue: number; // diskon aktual untuk apply ini
  }[];
  invalidCodes: string[];
  message?: string;
};

const resolveVoucherTestType = (exam: ExamKey): "IELTS" | "TOEFL" =>
  exam === "ielts" ? "IELTS" : "TOEFL";

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
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipJson = await ipRes.json();
        const ip = ipJson?.ip;

        if (!ip) {
          throw new Error("IP not found");
        }

        const geoRes = await fetch(
          `https://api.country.is/${encodeURIComponent(ip)}`
        );
        const geoJson = await geoRes.json();

        const country = geoJson?.country as string | null;

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

  const quotaPercent = getExamQuotaPercent(quotaSummary, selectedExam); // kalau dipakai di tempat lain

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
  const [isConvertingCurrency, setIsConvertingCurrency] = useState(false);

  useEffect(() => {
    // Hanya konversi kalau:
    // - currency = USD (user di luar Indonesia)
    // - dan ada currentPackages
    if (currency !== "USD") return;
    if (!currentPackages.length) return;

    const missingPkgs = currentPackages.filter(
      (pkg: any) => usdPriceMap[pkg.id] == null
    );
    if (!missingPkgs.length) return;

    const controller = new AbortController();

    const fetchUSDPrices = async () => {
      try {
        setIsConvertingCurrency(true);

        const res = await fetch("/b2b/api/currency", {
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
      } finally {
        if (!controller.signal.aborted) {
          setIsConvertingCurrency(false);
        }
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
      // Saat USD belum ready, sementara fallback IDR (tapi kita sudah tunjukkan Loader di atas)
      return {
        amount: pkg.price as number,
        currency: "IDR" as Currency,
      };
    }

    return {
      amount: pkg.price as number,
      currency: "IDR" as Currency,
    };
  };

  // ---------- BUY handler (create invoice B2B) ----------
  const [buyingId, setBuyingId] = useState<number | null>(null);

  // ---- STATE: Quantity & Voucher per package ----
  const [qtyMap, setQtyMap] = useState<Record<number, number>>({});
  const [voucherInputMap, setVoucherInputMap] = useState<Record<number, string>>(
    {}
  );
  const [voucherResultMap, setVoucherResultMap] = useState<
    Record<number, VoucherApplyResponse | null>
  >({});
  const [appliedVoucherCodesMap, setAppliedVoucherCodesMap] = useState<
    Record<number, string[]>
  >({});
  const [voucherErrorMap, setVoucherErrorMap] = useState<
    Record<number, string | null>
  >({});
  const [voucherLoadingMap, setVoucherLoadingMap] = useState<
    Record<number, boolean>
  >({});

  const applyVoucherForPackage = async (
    pkg: any,
    quantity: number,
    codes: string[]
  ) => {
    const trimmedCodes = codes
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);

    if (!user?.id) {
      router.push("/login");
      return;
    }

    if (!trimmedCodes.length) {
      // clear voucher state
      setVoucherResultMap((prev) => ({ ...prev, [pkg.id]: null }));
      setAppliedVoucherCodesMap((prev) => ({ ...prev, [pkg.id]: [] }));
      setVoucherErrorMap((prev) => ({ ...prev, [pkg.id]: null }));
      return;
    }

    // Untuk saat ini, batasi voucher hanya untuk IDR
    if (currency !== "IDR") {
      setVoucherErrorMap((prev) => ({
        ...prev,
        [pkg.id]: "Voucher only applies for IDR prices.",
      }));
      return;
    }

    const displayPrice = getDisplayPrice(pkg);
    const unitPrice = displayPrice.amount;
    const baseAmount = unitPrice * quantity;

    if (baseAmount <= 0) return;

    try {
      setVoucherLoadingMap((prev) => ({ ...prev, [pkg.id]: true }));
      setVoucherErrorMap((prev) => ({ ...prev, [pkg.id]: null }));

      const token = getAccessToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const payload = {
        userId: user.id,
        codes: trimmedCodes,
        baseAmount,
        platform_type: "B2B",
        test_type: resolveVoucherTestType(selectedExam),
      };

      const res = await api.post<VoucherApplyResponse>(
        `/v1/b2b/voucher/apply`,
        payload,
        { headers }
      );

      const result = res.data;

      const appliedCodes = result.applied.map((a) => a.code.toUpperCase());

      setVoucherResultMap((prev) => ({ ...prev, [pkg.id]: result }));
      setAppliedVoucherCodesMap((prev) => ({
        ...prev,
        [pkg.id]: appliedCodes,
      }));

      if (result.invalidCodes?.length) {
        setVoucherErrorMap((prev) => ({
          ...prev,
          [pkg.id]: `Invalid or unusable codes: ${result.invalidCodes.join(
            ", "
          )}`,
        }));
      } else if (!appliedCodes.length) {
        setVoucherErrorMap((prev) => ({
          ...prev,
          [pkg.id]: result.message || "Voucher cannot be applied.",
        }));
      } else {
        setVoucherErrorMap((prev) => ({ ...prev, [pkg.id]: null }));
      }
    } catch (err: any) {
      console.error("Apply voucher error", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to apply voucher.";
      setVoucherErrorMap((prev) => ({ ...prev, [pkg.id]: msg }));
    } finally {
      setVoucherLoadingMap((prev) => ({ ...prev, [pkg.id]: false }));
    }
  };

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

    const qty = qtyMap[pkg.id] ?? 1;
    const displayPrice = getDisplayPrice(pkg);
    const baseUnitPrice = displayPrice.amount;
    const baseAmount = baseUnitPrice * qty;

    const voucherResult = voucherResultMap[pkg.id];
    const totalPrice = voucherResult ? voucherResult.finalAmount : baseAmount;

    const finalCurrency: Currency = displayPrice.currency;
    const testCategory = selectedExam === "ielts" ? "IELTS" : "TOEFL";

    const testTypeId = resolveTestTypeId(selectedExam, selectedTestType, pkg);
    if (!testTypeId) {
      alert("Test type ID not found for this package.");
      return;
    }

    const appliedCodes = appliedVoucherCodesMap[pkg.id] || [];

    try {
      setBuyingId(pkg.id);

      const token = getAccessToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const payload = {
        orgId: finalOrgId,
        currency: finalCurrency,
        amount: totalPrice,
        user: {
          id: user.id,
          email: user.email,
        },
        price: {
          id: pkg.id,
          name: pkg.name,
          title: pkg.name,
          test_category: testCategory,
          test_type_id: testTypeId,
          attempt_quota: pkg.quotaAmount * qty,
          exam: selectedExam,
          test_type: selectedTestType,
          features: pkg.features,
          popular: pkg.popular ?? false,
          vouchers: appliedCodes, // kirim daftar kode voucher ke backend
        },
      };

      const res = await axios.post(
        `https://api-test.hiatlaz.com/api/v1/payment_b2b/payment/create-invoice`,
        payload,
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
    setCurrentPackageIndex((prev) =>
      Math.max(prev - MAX_VISIBLE_PACKAGES, 0)
    );
  };

  // --- Loader condition & messages ---
  const showPricingLoader =
    isDetectingCurrency ||
    packagesLoading ||
    (currency === "USD" && isConvertingCurrency);

  const pricingLoaderTitle = isDetectingCurrency
    ? "Detecting your location and currency..."
    : packagesLoading
    ? "Loading available packages..."
    : currency === "USD" && isConvertingCurrency
    ? "Converting prices to USD..."
    : "Loading...";

  const pricingLoaderSubtitle = isDetectingCurrency
    ? "We use your location to select the best currency for you."
    : packagesLoading
    ? "Fetching the latest quota packages for your organization."
    : currency === "USD" && isConvertingCurrency
    ? "Updating prices based on current exchange rates."
    : "Please wait a moment.";

  // -------------- CUSTOM QUOTA MODAL STATE --------------
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customQty, setCustomQty] = useState<string>(String(MIN_CUSTOM_QTY));
  const [isBuyingCustom, setIsBuyingCustom] = useState(false);

  // base package untuk custom pricing (pakai paket pertama di test type aktif)
  const basePackageForCustom = currentPackages[0] || null;

  const numericCustomQty = parseInt(customQty || "0", 10) || 0;

  let customPerTest = 0;
  let customCurrencyForDisplay: Currency = currency;

  if (basePackageForCustom) {
    const baseDisplay = getDisplayPrice(basePackageForCustom);
    customCurrencyForDisplay = baseDisplay.currency;
    customPerTest = getPricePerTest(
      baseDisplay.amount,
      basePackageForCustom.quotaAmount
    );
  }

  const effectiveQty =
    numericCustomQty && numericCustomQty > 0
      ? Math.max(MIN_CUSTOM_QTY, numericCustomQty)
      : MIN_CUSTOM_QTY;

  const customTotal = customPerTest * effectiveQty;

  const formattedCustomPerTest =
    customCurrencyForDisplay === "IDR"
      ? formatIDR(customPerTest)
      : formatUSD(customPerTest);

  const formattedCustomTotal =
    customCurrencyForDisplay === "IDR"
      ? formatIDR(customTotal)
      : formatUSD(customTotal);

  const handleOpenCustomModal = () => {
    if (!currentPackages.length) {
      alert("No packages available for this exam and test type.");
      return;
    }
    setCustomQty(String(MIN_CUSTOM_QTY));
    setIsCustomModalOpen(true);
  };

  const handleCustomPurchase = async () => {
    if (!user?.id) {
      router.push("/login");
      return;
    }

    const finalOrgId = org?.id ?? orgId;
    if (!finalOrgId) {
      alert("Organization tidak ditemukan. Silakan pilih organisasi dulu.");
      return;
    }

    if (!basePackageForCustom || !customPerTest) {
      alert("Custom price is not available for this test type.");
      return;
    }

    const testCategory = selectedExam === "ielts" ? "IELTS" : "TOEFL";
    const qty =
      numericCustomQty && numericCustomQty > 0
        ? Math.max(MIN_CUSTOM_QTY, numericCustomQty)
        : MIN_CUSTOM_QTY;

    const total = customPerTest * qty;
    const finalCurrency: Currency = customCurrencyForDisplay;

    const testTypeId = resolveTestTypeId(
      selectedExam,
      selectedTestType,
      basePackageForCustom
    );
    if (!testTypeId) {
      alert("Test type ID not found for custom quota.");
      return;
    }

    try {
      setIsBuyingCustom(true);

      const token = getAccessToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const payload = {
        orgId: finalOrgId,
        currency: finalCurrency,
        amount: total,
        user: {
          id: user.id,
          email: user.email,
        },
        price: {
          id: null,
          name: `Custom ${examLabel} ${selectedTestType} - ${qty}x`,
          title: `Custom ${examLabel} ${selectedTestType} - ${qty}x`,
          test_category: testCategory,
          test_type_id: testTypeId,
          attempt_quota: qty,
          exam: selectedExam,
          test_type: selectedTestType,
          is_custom: true,
          base_per_test: customPerTest,
          base_package_id: basePackageForCustom.id,
        },
      };

      const res = await axios.post(
        `https://api-test.hiatlaz.com/api/v1/payment_b2b/payment/create-invoice`,
        payload,
        { headers }
      );

      const url = res?.data?.data?.invoice_url;
      if (url) {
        window.location.href = url;
      } else {
        alert("Gagal membuat invoice custom. Silakan coba lagi.");
      }
    } catch (err: any) {
      console.error("B2B custom payment error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to create custom invoice.";
      alert(msg);
    } finally {
      setIsBuyingCustom(false);
    }
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
      <Card className="mb-3 p-6">
        {summaryError ? (
          <p className="text-sm text-red-500">
            Failed to load quota summary. Please try again.
          </p>
        ) : (
          <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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

            {/* Button untuk custom quota */}
            {/* <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenCustomModal}
                className="gap-2"
              >
                <Zap className="h-4 w-4" />
                Custom quota purchase (min {MIN_CUSTOM_QTY} tests)
              </Button>
            </div> */}
          </>
        )}
      </Card>

      {/* Pricing Packages */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Buy {examLabel} {selectedTestType} Quota
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Currency: {currency === "IDR" ? "IDR" : "USD"}
        </p>

        {packagesError && (
          <p className="text-sm text-red-500 mb-4">
            Failed to load packages. Please refresh the page.
          </p>
        )}

        {showPricingLoader ? (
          <Loader
            size="md"
            title={pricingLoaderTitle}
            subtitle={pricingLoaderSubtitle}
            className="py-8"
          />
        ) : currentPackages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No packages available for this test type.
          </p>
        ) : (
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
                const basePackagePrice = displayPrice.amount;
                const qty = qtyMap[pkg.id] ?? 1;

                const voucherResult = voucherResultMap[pkg.id] || null;
                const appliedCodes = appliedVoucherCodesMap[pkg.id] || [];

                const baseTotal = basePackagePrice * qty;
                const totalPriceToShow = voucherResult
                  ? voucherResult.finalAmount
                  : baseTotal;

                const pricePerTest = getPricePerTest(
                  basePackagePrice,
                  pkg.quotaAmount
                );

                const formattedTotal =
                  displayPrice.currency === "IDR"
                    ? formatIDR(totalPriceToShow)
                    : formatUSD(totalPriceToShow);

                const formattedPerTest =
                  displayPrice.currency === "IDR"
                    ? formatIDR(pricePerTest)
                    : formatUSD(pricePerTest);

                const totalDiscount =
                  voucherResult?.totalDiscount && voucherResult.totalDiscount > 0
                    ? voucherResult.totalDiscount
                    : 0;

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

                    <h3 className="text-lg font-bold text-foreground ">
                      {pkg.name}
                    </h3>

                    {/* Harga + info per test */}
                    <div className="mb-4">
                      <div className="text-3xl font-bold text-foreground">
                        {formattedTotal}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Total for{" "}
                        <span className="font-semibold">{qty}x</span> package
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formattedPerTest} per test
                      </p>
                      {totalDiscount > 0 && (
                        <p className="mt-1 text-xs text-emerald-700">
                          You save{" "}
                          {displayPrice.currency === "IDR"
                            ? formatIDR(totalDiscount)
                            : formatUSD(totalDiscount)}{" "}
                          with voucher.
                        </p>
                      )}
                    </div>

              

                    <ul className="space-y-3">
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

                    {/* Quantity input */}
                    <div className="">
                      <label className="text-xs font-medium text-muted-foreground">
                        Quantity (packages)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={qty}
                        onChange={(e) => {
                          const raw = parseInt(e.target.value || "1", 10);
                          const newQty =
                            Number.isNaN(raw) || raw <= 0 ? 1 : raw;
                          setQtyMap((prev) => ({ ...prev, [pkg.id]: newQty }));

                          const existingCodes =
                            appliedVoucherCodesMap[pkg.id] || [];
                          if (existingCodes.length) {
                            // re-apply voucher dengan quantity baru
                            applyVoucherForPackage(
                              pkg,
                              newQty,
                              existingCodes
                            );
                          } else {
                            setVoucherResultMap((prev) => ({
                              ...prev,
                              [pkg.id]: null,
                            }));
                          }
                        }}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    {/* Voucher input (only for IDR) */}
                    {currency === "IDR" && (
                      <div className=" space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">
                          Redeem voucher
                        </label>
                        <div className="flex flex-col space-y-2">
                          <input
                            type="text"
                            value={voucherInputMap[pkg.id] || ""}
                            onChange={(e) =>
                              setVoucherInputMap((prev) => ({
                                ...prev,
                                [pkg.id]: e.target.value,
                              }))
                            }
                            placeholder="Enter voucher code"
                            className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                            disabled={voucherLoadingMap[pkg.id]}
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              const newCode =
                                (voucherInputMap[pkg.id] || "").trim();
                              if (!newCode) return;

                              const existing =
                                appliedVoucherCodesMap[pkg.id] || [];
                              const allCodes = [...existing, newCode];

                              setVoucherInputMap((prev) => ({
                                ...prev,
                                [pkg.id]: "",
                              }));

                              const quantity = qtyMap[pkg.id] ?? 1;
                              applyVoucherForPackage(pkg, quantity, allCodes);
                            }}
                            disabled={
                              voucherLoadingMap[pkg.id] ||
                              !(voucherInputMap[pkg.id] || "").trim()
                            }
                            className="gap-1"
                          >
                            <TicketPercent className="h-4 w-4" />
                            Redeem
                          </Button>
                        </div>

                        {voucherErrorMap[pkg.id] && (
                          <p className="flex items-center gap-1 text-xs text-red-500">
                            <AlertCircle className="h-3 w-3" />
                            {voucherErrorMap[pkg.id]}
                          </p>
                        )}

                        {appliedCodes.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {appliedCodes.map((code) => (
                              <span
                                key={code}
                                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                              >
                                <TicketPercent className="h-3 w-3" />
                                {code}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const remaining = appliedCodes.filter(
                                      (c) => c !== code
                                    );
                                    const quantity = qtyMap[pkg.id] ?? 1;
                                    applyVoucherForPackage(
                                      pkg,
                                      quantity,
                                      remaining
                                    );
                                  }}
                                  className="ml-1 text-emerald-700/70 hover:text-emerald-900"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

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

      {/* CUSTOM QUOTA MODAL */}
      {isCustomModalOpen && basePackageForCustom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-md mx-4 p-6 relative">
            <button
              type="button"
              onClick={() => setIsCustomModalOpen(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-semibold text-foreground mb-1">
              Custom Quota - {examLabel} {selectedTestType}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Minimum purchase is {MIN_CUSTOM_QTY} tests. The total price is
              calculated from the current price per test.
            </p>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Price per test
                </p>
                <p className="text-base font-semibold text-foreground">
                  {formattedCustomPerTest}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Quantity (tests)
                </label>
                <input
                  type="number"
                  min={MIN_CUSTOM_QTY}
                  value={customQty}
                  onChange={(e) => setCustomQty(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
                {numericCustomQty > 0 && numericCustomQty < MIN_CUSTOM_QTY && (
                  <p className="mt-1 text-xs text-red-500">
                    Minimum purchase is {MIN_CUSTOM_QTY} tests. Total is
                    calculated for {effectiveQty} tests.
                  </p>
                )}
              </div>

              <div className="border-t border-border pt-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Total ({effectiveQty} tests)
                  </p>
                  <p className="text-lg font-bold text-foreground">
                    {formattedCustomTotal}
                  </p>
                </div>
                <Button
                  onClick={handleCustomPurchase}
                  disabled={isBuyingCustom || !customPerTest}
                  className="gap-2"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {isBuyingCustom ? "Processing..." : "Buy Custom Quota"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
