"use client";

import { Fragment, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Search,
  ArrowLeft,
  X,
  ChevronDown,
  ClockIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { Pagination } from "@/components/pagination";
import {
  ExamType,
  useOrgResults,
  useStudentHistory,
} from "@/app/actions/hooks/b2b/useResults";
import { useParams } from "next/navigation";

// ✨ optional: biar rapi
type SortField = "recentlyDone" | "createdAt" | "name";

export default function ResultsPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = Number(params.orgId);
  const [searchTerm, setSearchTerm] = useState("");
  const [examType, setExamType] = useState<ExamType>("ielts");
  const [expandedResultId, setExpandedResultId] = useState<number | null>(null);
  const [historyModal, setHistoryModal] = useState<{
    open: boolean;
    studentId: number | null;
    studentName: string;
  }>({ open: false, studentId: null, studentName: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ===== SORT STATE (FE only) =====
  const [sortBy, setSortBy] = useState<SortField>("recentlyDone");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // ---- FETCH RESULTS ----
  const {
    data: results,
    total,
    loading,
  } = useOrgResults({
    exam: examType,
    page: currentPage,
    pageSize: itemsPerPage,
    q: searchTerm,
    orgId,
  });

  const totalPages = Math.ceil((total || 0) / itemsPerPage) || 1;

  const formatScore = (score: number | null | undefined) =>
    score !== null && score !== undefined ? score : "-";

  const formatDateTime = (value: string | Date | null | undefined) => {
    if (!value) return "-";
    return new Date(value).toLocaleString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const renderTestDetailsTable = (testDetails: any[], isIelts: boolean) => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="text-left py-3 px-4 font-semibold text-foreground">
                Test Type
              </th>
              {isIelts ? (
                <>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">
                    Exam Date
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">
                    Listening
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">
                    Reading
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">
                    Writing
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">
                    Speaking
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">
                    Overall
                  </th>
                </>
              ) : (
                <>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">
                    Exam Date
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">
                    Listening
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">
                    Structure
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">
                    Reading
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">
                    Overall
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {testDetails.map((detail, idx) => (
              <tr
                key={idx}
                className="border-b border-border hover:bg-muted/50"
              >
                <td className="py-3 px-4 text-foreground capitalize font-medium">
                  {detail.type}
                </td>
                <td className="py-3 px-4 text-foreground capitalize font-medium">
                  {formatDateTime(detail.date)}
                </td>
                {isIelts ? (
                  <>
                    <td className="py-3 px-4 text-foreground">
                      {formatScore(detail.listening)}
                    </td>
                    <td className="py-3 px-4 text-foreground">
                      {formatScore(detail.reading)}
                    </td>
                    <td className="py-3 px-4 text-foreground">
                      {formatScore(detail.writing)}
                    </td>
                    <td className="py-3 px-4 text-foreground">
                      {formatScore(detail.speaking)}
                    </td>
                    <td className="py-3 px-4 text-foreground">
                      {formatScore(detail.overall)}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-3 px-4 text-foreground">
                      {formatScore(detail.listening)}
                    </td>
                    <td className="py-3 px-4 text-foreground">
                      {formatScore(detail.structure)}
                    </td>
                    <td className="py-3 px-4 text-foreground">
                      {formatScore(detail.reading)}
                    </td>
                    <td className="py-3 px-4 text-foreground">
                      {formatScore(detail.overall)}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const handleOpenHistory = (studentId: number, studentName: string) => {
    setHistoryModal({ open: true, studentId, studentName });
  };

  // ---- HISTORY HOOK ----
  const { data: historyData, loading: historyLoading } = useStudentHistory({
    exam: examType,
    userId: historyModal.studentId ?? undefined,
    enabled: historyModal.open,
  });

  // ===== SORTING LOGIC (FE) =====
  const sortedResults = useMemo(() => {
    const arr = (results || []) as any[];
    if (!arr.length) return arr;

    const clone = [...arr];

    clone.sort((a, b) => {
      // 🔤 Sort by name (studentName)
      if (sortBy === "name") {
        const aName = (a.studentName || "").toLowerCase();
        const bName = (b.studentName || "").toLowerCase();

        if (aName < bName) return sortDir === "asc" ? -1 : 1;
        if (aName > bName) return sortDir === "asc" ? 1 : -1;
        return 0;
      }

      // 🕒 Sort by date fields
      const field = sortBy as "recentlyDone" | "createdAt";
      const aVal = a[field] ? new Date(a[field]).getTime() : 0;
      const bVal = b[field] ? new Date(b[field]).getTime() : 0;

      if (sortDir === "desc") {
        return bVal - aVal;
      }
      return aVal - bVal;
    });

    return clone;
  }, [results, sortBy, sortDir]);

  const handleHeaderSort = (column: SortField) => {
    if (sortBy === column) {
      // toggle direction
      setSortDir((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      // switch column, default:
      // - Name → asc (A-Z)
      // - Date fields → desc (newest first)
      setSortBy(column);
      if (column === "name") {
        setSortDir("asc");
      } else {
        setSortDir("desc");
      }
    }
  };

  const renderSortIcon = (column: SortField) => {
    if (sortBy !== column) {
      return (
        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground ml-1" />
      );
    }

    return sortDir === "desc" ? (
      <ArrowDown className="h-3.5 w-3.5 ml-1" />
    ) : (
      <ArrowUp className="h-3.5 w-3.5 ml-1" />
    );
  };

  const overallColSpan = examType === "ielts" ? 9 : 8;

  return (
    <div className="p-8">
      <div className="flex md:flex-row flex-col items-start md:items-center justify-between mb-4">
        <div className="flex-1">
          <Breadcrumb items={[{ label: "Test Results" }]} />
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Test Results & Reports
          </h1>
          <p className="mt-2 text-muted-foreground">
            View and manage student test results and certificates
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${orgId}/dashboard`}>
            <Button variant="outline" className="gap-2 bg-transparent">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Exam type tabs + search */}
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex gap-2">
          <Button
            variant={examType === "ielts" ? "default" : "outline"}
            onClick={() => {
              setExamType("ielts");
              setCurrentPage(1);
              setExpandedResultId(null);
            }}
            className="px-6"
          >
            IELTS
          </Button>
          <Button
            variant={examType === "toefl" ? "default" : "outline"}
            onClick={() => {
              setExamType("toefl");
              setCurrentPage(1);
              setExpandedResultId(null);
            }}
            className="px-6"
          >
            TOEFL
          </Button>
        </div>

        <Card className="p-4">
          <div className="flex items-center gap-2 bg-muted rounded-lg px-4 py-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by student name..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 bg-transparent text-foreground placeholder-muted-foreground focus:outline-none"
            />
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left py-4 px-6 text-sm font-semibold text-foreground w-8" />
                <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                  {/* 🔤 Sort by Name */}
                  <button
                    type="button"
                    onClick={() => handleHeaderSort("name")}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <span>Name</span>
                    {renderSortIcon("name")}
                  </button>
                </th>
                {examType === "ielts" ? (
                  <>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                      Overall Band
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                      Listening Band
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                      Reading Band
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                      Writing Band
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                      Speaking Band
                    </th>
                  </>
                ) : (
                  <>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                      Overall Score
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                      Listening Score
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                      Structure Score
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                      Reading Score
                    </th>
                  </>
                )}
                {/* HEADER SORT: RECENTLY DONE */}
                <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                  <button
                    type="button"
                    onClick={() => handleHeaderSort("recentlyDone")}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <span>Recently Done</span>
                    {renderSortIcon("recentlyDone")}
                  </button>
                </th>
                {/* HEADER SORT: CREATED */}
                <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                  <button
                    type="button"
                    onClick={() => handleHeaderSort("createdAt")}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <span>Account Created</span>
                    {renderSortIcon("createdAt")}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={overallColSpan}
                    className="py-6 px-6 text-center text-muted-foreground"
                  >
                    Loading results...
                  </td>
                </tr>
              )}

              {!loading &&
                sortedResults.map((result: any) => (
                  <Fragment key={result.id}>
                    <tr className="border-b border-border hover:bg-muted transition-colors cursor-pointer">
                      <td className="py-4 px-6">
                        <button
                          onClick={() =>
                            setExpandedResultId(
                              expandedResultId === result.id ? null : result.id
                            )
                          }
                          className="rounded-lg p-2 text-muted-foreground hover:bg-background transition-colors"
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              expandedResultId === result.id ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </td>
                      <td className="py-4 px-6 text-sm text-foreground font-medium">
                        {result.studentName}
                      </td>
                      {examType === "ielts" ? (
                        <>
                          <td className="py-4 px-6 text-sm text-foreground">
                            {formatScore(result.overallBand)}
                          </td>
                          <td className="py-4 px-6 text-sm text-foreground">
                            {formatScore(result.listeningBand)}
                          </td>
                          <td className="py-4 px-6 text-sm text-foreground">
                            {formatScore(result.readingBand)}
                          </td>
                          <td className="py-4 px-6 text-sm text-foreground">
                            {formatScore(result.writingBand)}
                          </td>
                          <td className="py-4 px-6 text-sm text-foreground">
                            {formatScore(result.speakingBand)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-4 px-6 text-sm text-foreground">
                            {formatScore(result.overallScore)}
                          </td>
                          <td className="py-4 px-6 text-sm text-foreground">
                            {formatScore(result.listeningScore)}
                          </td>
                          <td className="py-4 px-6 text-sm text-foreground">
                            {formatScore(result.structureScore)}
                          </td>
                          <td className="py-4 px-6 text-sm text-foreground">
                            {formatScore(result.readingScore)}
                          </td>
                        </>
                      )}
                      <td className="py-4 px-6 text-sm text-foreground">
                        {formatDateTime(result.recentlyDone)}
                      </td>
                      <td className="py-4 px-6 text-sm text-foreground">
                        {formatDateTime(result.createdAt)}
                      </td>
                    </tr>

                    {expandedResultId === result.id && (
                      <tr className="border-b border-border bg-muted/30">
                        <td colSpan={overallColSpan} className="py-6 px-6">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-foreground">
                                Latest Test Attempts
                              </h3>
                              <Button
                                onClick={() =>
                                  handleOpenHistory(
                                    result.id,
                                    result.studentName
                                  )
                                }
                                className="gap-2"
                              >
                                <ClockIcon />
                                Test History
                              </Button>
                            </div>
                            {renderTestDetailsTable(
                              result.testDetails || [],
                              examType === "ielts"
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}

              {!loading && sortedResults.length === 0 && (
                <tr>
                  <td
                    colSpan={overallColSpan}
                    className="py-6 px-6 text-center text-muted-foreground"
                  >
                    No test results found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={total}
          itemsPerPage={itemsPerPage}
        />
      </Card>

      {/* HISTORY MODAL */}
      {historyModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-3xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-background p-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Test History - {examType.toUpperCase()}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {historyModal.studentName}
                </p>
              </div>
              <button
                onClick={() =>
                  setHistoryModal({
                    open: false,
                    studentId: null,
                    studentName: "",
                  })
                }
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-4">
              {historyLoading && (
                <div className="rounded-lg border border-border p-4 text-center text-muted-foreground">
                  Loading history...
                </div>
              )}

              {!historyLoading && historyData && (
                <>
                  {Object.keys(historyData.groups).length === 0 && (
                    <div className="rounded-lg border border-border p-4 text-center text-muted-foreground">
                      <p>No {examType.toUpperCase()} tests recorded yet</p>
                    </div>
                  )}

                  {Object.keys(historyData.groups).length > 0 && (
                    <Tabs
                      defaultValue={Object.keys(historyData.groups)[0]}
                      className="w-full"
                    >
                      <TabsList className="mb-4">
                        {Object.keys(historyData.groups).map((type) => (
                          <TabsTrigger
                            key={type}
                            value={type}
                            className="capitalize "
                          >
                            {type}
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {Object.entries(historyData.groups).map(
                        ([type, attempts]) => (
                          <TabsContent
                            key={type}
                            value={type}
                            className="space-y-2"
                          >
                            <h3 className="font-semibold text-foreground capitalize">
                              {type}
                            </h3>

                            <div className="overflow-x-auto rounded-lg border border-border">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-border bg-muted">
                                    <th className="text-left py-3 px-4 font-semibold text-foreground">
                                      Date
                                    </th>
                                    {examType === "ielts" ? (
                                      <>
                                        <th className="text-left py-3 px-4 font-semibold text-foreground">
                                          Listening
                                        </th>
                                        <th className="text-left py-3 px-4 font-semibold text-foreground">
                                          Reading
                                        </th>
                                        <th className="text-left py-3 px-4 font-semibold text-foreground">
                                          Writing
                                        </th>
                                        <th className="text-left py-3 px-4 font-semibold text-foreground">
                                          Speaking
                                        </th>
                                        <th className="text-left py-3 px-4 font-semibold text-foreground">
                                          Overall
                                        </th>
                                      </>
                                    ) : (
                                      <>
                                        <th className="text-left py-3 px-4 font-semibold text-foreground">
                                          Listening
                                        </th>
                                        <th className="text-left py-3 px-4 font-semibold text-foreground">
                                          Structure
                                        </th>
                                        <th className="text-left py-3 px-4 font-semibold text-foreground">
                                          Reading
                                        </th>
                                        <th className="text-left py-3 px-4 font-semibold text-foreground">
                                          Overall
                                        </th>
                                      </>
                                    )}
                                  </tr>
                                </thead>
                                <tbody>
                                  {(attempts as any[]).map((att) => (
                                    <tr
                                      key={att.testId}
                                      className="border-b border-border"
                                    >
                                      <td className="py-3 px-4 text-foreground">
                                        {formatDateTime(att.date)}
                                      </td>
                                      {examType === "ielts" ? (
                                        <>
                                          <td className="py-3 px-4 text-foreground">
                                            {formatScore(att.listening)}
                                          </td>
                                          <td className="py-3 px-4 text-foreground">
                                            {formatScore(att.reading)}
                                          </td>
                                          <td className="py-3 px-4 text-foreground">
                                            {formatScore(att.writing)}
                                          </td>
                                          <td className="py-3 px-4 text-foreground">
                                            {formatScore(att.speaking)}
                                          </td>
                                          <td className="py-3 px-4 text-foreground">
                                            {formatScore(att.overall)}
                                          </td>
                                        </>
                                      ) : (
                                        <>
                                          <td className="py-3 px-4 text-foreground">
                                            {formatScore(att.listening)}
                                          </td>
                                          <td className="py-3 px-4 text-foreground">
                                            {formatScore(att.structure)}
                                          </td>
                                          <td className="py-3 px-4 text-foreground">
                                            {formatScore(att.reading)}
                                          </td>
                                          <td className="py-3 px-4 text-foreground">
                                            {formatScore(att.overall)}
                                          </td>
                                        </>
                                      )}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </TabsContent>
                        )
                      )}
                    </Tabs>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
