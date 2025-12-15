"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building, FileText, Settings, Users } from "lucide-react";

import { useB2BOrgStore } from "@/store/useB2BOrgStore";
import {
  useDashboard,
  type DashboardSummary,
  type TestMode,
} from "@/app/actions/hooks/b2b/useDashboard";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";

/* =========================
 * Extra types derived from DashboardSummary
 * =======================*/

type QuotaByExamTypePoint = DashboardSummary["quotaByExamType"][number];
type MonthlyTestsPoint = DashboardSummary["monthlyTests"][number];
type SkillAvgPoint = DashboardSummary["ieltsSkillAvg"][number];
type RadarPoint = DashboardSummary["cefrDistribution"][number];

/* =========================
 * Test mode options
 * =======================*/

const TEST_MODE_OPTIONS: { value: TestMode; label: string }[] = [
  { value: "all", label: "All tests" },
  { value: "complete-only", label: "Complete only" },
  { value: "section-only", label: "Section only" },
];

/* =========================
 * Chart components
 * =======================*/

// 1. Quota: Bought vs Used vs Remaining (stacked bar)
const quotaChartConfig = {
  totalQuotaBought: {
    label: "Bought",
    // more muted: background reference for total stock
    color: "var(--chart-3)",
  },
  totalQuotaUsed: {
    label: "Used",
    // primary accent: highlight actual usage
    color: "var(--chart-1)",
  },
  remainingQuota: {
    label: "Remaining",
    // secondary accent: highlight how much is left
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

// 3 & 4. Combined IELTS + TOEFL skill averages (horizontal mixed bar)
const skillCombinedConfig = {
  avgScore: {
    label: "Average score: ",
  },
} satisfies ChartConfig;

function SkillBarCombinedChart({
  ielts,
  toefl,
}: {
  ielts: SkillAvgPoint[];
  toefl: SkillAvgPoint[];
}) {
  const [examType, setExamType] = useState<"IELTS" | "TOEFL">("IELTS");

  const palette = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
  ];

  const rawData = examType === "IELTS" ? ielts ?? [] : toefl ?? [];

  const chartData = rawData.map((item, index) => ({
    skill: item.skill,
    avgScore: Math.floor(item.avgScore),
    fill: palette[index % palette.length],
  }));

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Average Skill Scores</CardTitle>
          <CardDescription>
            {examType === "IELTS"
              ? "IELTS – Listening, Reading, Writing, Speaking"
              : "TOEFL ITP – Listening, Structure & Written Expression, Reading"}
          </CardDescription>
        </div>

        {/* Simple toggle IELTS / TOEFL */}
        <div className="inline-flex items-center gap-1 rounded-md border bg-background p-1 text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => setExamType("IELTS")}
            className={`rounded px-2 py-1 ${
              examType === "IELTS"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            IELTS
          </button>
          <button
            type="button"
            onClick={() => setExamType("TOEFL")}
            className={`rounded px-2 py-1 ${
              examType === "TOEFL"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            TOEFL ITP
          </button>
        </div>
      </CardHeader>

      <CardContent>
        <ChartContainer
          config={skillCombinedConfig}
          className="w-full max-w-full"
        >
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{ left: 20 }}
            barSize={40}
          >
            <YAxis
              dataKey="skill"
              type="category"
              tickLine={false}
              tickMargin={5}
              axisLine={false}
            />
            <XAxis dataKey="avgScore" type="number" />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="avgScore" radius={5} />
          </BarChart>
        </ChartContainer>
        {chartData.length === 0 && (
          <p className="mt-4 text-xs text-muted-foreground">
            No skill score data available for this period.
          </p>
        )}
      </CardContent>

      <CardFooter className="flex-col items-start gap-1 text-xs text-muted-foreground">
        <p>
          Switch between IELTS and TOEFL ITP to compare average skill
          performance.
        </p>
      </CardFooter>
    </Card>
  );
}

function QuotaStackedBarChart({ data }: { data: QuotaByExamTypePoint[] }) {
  return (
    <Card className="h-full">
      <div className="p-6 pb-2">
        <h2 className="text-lg font-semibold">
          Quota Bought vs Used vs Remaining
        </h2>
        <p className="text-sm text-muted-foreground">
          Per exam type (IELTS &amp; TOEFL ITP)
        </p>
      </div>
      <div className="px-6 pb-6">
        <ChartContainer config={quotaChartConfig} className="w-full max-w-full">
          <BarChart accessibilityLayer barSize={60} data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="examType"
              tickLine={false}
              tickMargin={10}
              tickSize={10}
              axisLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="totalQuotaBought"
              stackId="quota"
              fill="var(--color-totalQuotaBought)"
            />
            <Bar
              dataKey="totalQuotaUsed"
              stackId="quota"
              fill="var(--color-totalQuotaUsed)"
            />
            <Bar
              dataKey="remainingQuota"
              stackId="quota"
              fill="var(--color-remainingQuota)"
              radius={[12, 12, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
        {data.length === 0 && (
          <p className="mt-4 text-xs text-muted-foreground">
            No quota data available yet.
          </p>
        )}
      </div>
    </Card>
  );
}

// 2. Monthly tests (bar chart – total tests)
const monthlyTestsConfig = {
  total: {
    label: "Total tests",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

function MonthlyTestsAreaChart({ data }: { data: MonthlyTestsPoint[] }) {
  const chartData = (data ?? []).map((item) => ({
    month: item.month, // sudah diformat dari backend
    total: (item.ielts ?? 0) + (item.toefl ?? 0),
  }));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Tests per Month</CardTitle>
        <CardDescription>
          Total IELTS + TOEFL ITP (selected period)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={monthlyTestsConfig}
          className="w-full max-w-full"
        >
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => String(value).slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar
              dataKey="total"
              fill="var(--color-total)"
              radius={8}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-1 text-xs text-muted-foreground">
        <p>Showing total completed tests per month.</p>
        <p>Includes all IELTS and TOEFL ITP tests in the selected period.</p>
      </CardFooter>
    </Card>
  );
}

// 3. IELTS skill averages (horizontal bars)
const ieltsSkillConfig = {
  avgScore: {
    label: "Average score",
  },
} satisfies ChartConfig;

function IeltsSkillBarChart({ data }: { data: SkillAvgPoint[] }) {
  const palette = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
  ];

  const chartData = (data ?? []).map((item, index) => ({
    skill: item.skill,
    avgScore: item.avgScore,
    fill: palette[index % palette.length],
  }));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Average IELTS Skill Scores</CardTitle>
        <CardDescription>
          Listening, Reading, Writing, Speaking (selected period)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={ieltsSkillConfig} className="w-full max-w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{ left: 0 }}
          >
            <YAxis
              dataKey="skill"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <XAxis dataKey="avgScore" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="avgScore" radius={5} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-1 text-xs text-muted-foreground">
        <p>Each bar shows the overall average per IELTS skill.</p>
      </CardFooter>
    </Card>
  );
}

// 4. TOEFL skill averages (horizontal bars)
const toeflSkillConfig = {
  avgScore: {
    label: "Average score",
  },
} satisfies ChartConfig;

function ToeflSkillBarChart({ data }: { data: SkillAvgPoint[] }) {
  const palette = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
  ];

  const chartData = (data ?? []).map((item, index) => ({
    skill: item.skill,
    avgScore: item.avgScore,
    fill: palette[index % palette.length],
  }));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Average TOEFL ITP Skill Scores</CardTitle>
        <CardDescription>
          Listening, Structure, Reading (selected period)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={toeflSkillConfig} className="w-full max-w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{ left: 20 }}
          >
            <YAxis
              dataKey="skill"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <XAxis dataKey="avgScore" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="avgScore" radius={5} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-1 text-xs text-muted-foreground">
        <p>Each bar shows the overall average per TOEFL ITP skill.</p>
      </CardFooter>
    </Card>
  );
}

// 5. CEFR distribution (radar)
const cefrConfig = {
  students: {
    label: "Students",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

function CefrRadarChart({ data }: { data: RadarPoint[] }) {
  return (
    <Card className="h-full">
      <div className="p-6 pb-2 text-center">
        <h2 className="text-lg font-semibold">TOEFL CEFR Level Distribution</h2>
        <p className="text-sm text-muted-foreground">
          A1 – C1 (best level per student, selected period)
        </p>
      </div>
      <div className="px-6 pb-6">
        <ChartContainer
          config={cefrConfig}
          className="mx-auto aspect-square max-h-[260px] w-full max-w-full"
        >
          <RadarChart data={data}>
            <ChartTooltip content={<ChartTooltipContent />} />
            <PolarAngleAxis dataKey="label" />
            <PolarGrid />
            <Radar
              dataKey="students"
              fill="var(--color-students)"
              fillOpacity={0.6}
              dot={{ r: 4, fillOpacity: 1 }}
            />
          </RadarChart>
        </ChartContainer>
        {data.length === 0 && (
          <p className="mt-4 text-xs text-muted-foreground text-center">
            No CEFR data available for this period.
          </p>
        )}
      </div>
    </Card>
  );
}

// 6. IELTS band distribution (radar)
const bandConfig = {
  students: {
    label: "Students",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

function IeltsBandRadarChart({ data }: { data: RadarPoint[] }) {
  return (
    <Card className="h-full">
      <div className="p-6 pb-2 text-center">
        <h2 className="text-lg font-semibold">IELTS Band Distribution</h2>
        <p className="text-sm text-muted-foreground">
          Band 3.0 – 9.0 (best band per student, selected period)
        </p>
      </div>
      <div className="px-6 pb-6">
        <ChartContainer
          config={bandConfig}
          className="mx-auto aspect-square max-h-[260px] w-full max-w-full"
        >
          <RadarChart data={data}>
            <ChartTooltip content={<ChartTooltipContent />} />
            <PolarAngleAxis dataKey="label" />
            <PolarGrid />
            <Radar
              dataKey="students"
              fill="var(--color-students)"
              fillOpacity={0.6}
              dot={{ r: 4, fillOpacity: 1 }}
            />
          </RadarChart>
        </ChartContainer>
        {data.length === 0 && (
          <p className="mt-4 text-xs text-muted-foreground text-center">
            No IELTS band data available for this period.
          </p>
        )}
      </div>
    </Card>
  );
}

/* =========================
 * Page component
 * =======================*/

export default function DashboardPage() {
  const router = useRouter();
  const params = useParams<{ orgId: string }>();
  const { orgId, user } = useB2BOrgStore();

  const [testMode, setTestMode] = useState<TestMode>("all");

  // Date range filter (YYYY-MM-DD from <input type="date" />)
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const quickMenuItems = [
    {
      href: `/${orgId}/organization`,
      icon: Building,
      label: "Organization",
      description: "Manage organization profile",
    },
    {
      href: `/${orgId}/quota`,
      icon: Settings,
      label: "Quota & Purchase",
      description: "Buy and manage test quotas",
    },
    {
      href: `/${orgId}/students`,
      icon: Users,
      label: "Students",
      description: "Manage students",
    },
    {
      href: `/${orgId}/results`,
      icon: FileText,
      label: "Test Results",
      description: "View test reports",
    },
  ];

  useEffect(() => {
    if (!orgId || !user) {
      // if store context is not available, redirect to check page
      router.replace("/b2b/check");
      return;
    }

    if (String(orgId) !== String(params.orgId)) {
      // normalize URL orgId with store orgId
      router.replace(`/${orgId}/dashboard`);
    }
  }, [orgId, user, params.orgId, router]);

  const { data, isLoading, error } = useDashboard({
    orgId,
    testMode,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const summary: DashboardSummary | null = data ?? null;

  if (!orgId || !user || String(orgId) !== String(params.orgId)) {
    return null;
  }

  const handleClearDateRange = () => {
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="p-8">
      {/* BACK TO ACADEMY (left) */}
      <div className="mb-6">
        <Link href="https://academy.hiatlaz.com/">
          <Button variant="outline" className="gap-2 bg-transparent">
            <ArrowLeft className="h-4 w-4" />
            Back to Academy
          </Button>
        </Link>
      </div>
       <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
          {quickMenuItems.map((item) => (
            <Link key={item.href} href={item.href} className="group">
              <Card className="h-full cursor-pointer p-6 transition-all hover:border-primary hover:shadow-lg">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 rounded-lg bg-blue-50 p-4 transition-colors group-hover:bg-blue-100">
                    <item.icon className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-foreground">
                    {item.label}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>

      {/* STATUS */}
      {isLoading && (
        <p className="mb-4 text-sm text-muted-foreground">
          Loading dashboard analytics...
        </p>
      )}

      {error && !isLoading && (
        <p className="mb-4 text-sm text-red-500">
          Failed to load dashboard: {error.message}
        </p>
      )}

      {/* FILTER BAR */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-foreground">
            Analytics Overview
          </h2>
          <p className="text-xs text-muted-foreground">
            Filter by test type and date range. If no dates are selected, the
            last 12 months are used by default.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          {/* Test mode toggle */}
          <div className="flex flex-col items-start md:flex-row md:items-center gap-2 text-sm">
            <span className="text-muted-foreground">Test type:</span>
            <div className="inline-flex items-center gap-1 rounded-md border bg-background p-1">
              {TEST_MODE_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  size="sm"
                  variant={testMode === opt.value ? "default" : "ghost"}
                  className={
                    testMode === opt.value
                      ? "shadow-sm"
                      : "text-muted-foreground"
                  }
                  onClick={() => setTestMode(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Date range filter */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Date range:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-xs"
            />
            <span className="text-muted-foreground text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-xs"
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs"
              onClick={handleClearDateRange}
            >
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* CHARTS GRID */}
      {summary && (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
          {/* 5. CEFR distribution */}
          <CefrRadarChart data={summary.cefrDistribution ?? []} />

          {/* 6. IELTS band distribution */}
          <IeltsBandRadarChart data={summary.ieltsBandDistribution ?? []} />

          {/* Combined skill chart */}
          <SkillBarCombinedChart
            ielts={summary.ieltsSkillAvg ?? []}
            toefl={summary.toeflSkillAvg ?? []}
          />

          {/* 2. Tests per month (bar chart) */}
          <MonthlyTestsAreaChart data={summary.monthlyTests ?? []} />
        </div>
      )}
    </div>
  );
}
