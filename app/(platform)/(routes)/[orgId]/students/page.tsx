"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Search, ArrowLeft, Gift, Info } from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import { Pagination } from "@/components/pagination";
import { MemberRow, useMembers } from "@/app/actions/hooks/b2b/useMember";
import { useOrgQuotaSummary } from "@/app/actions/hooks/b2b/useOrg";
import { AddStudentForm } from "@/components/modal/addStudentModal";
import { QuotaAllocationModal } from "@/components/modal/quotaAllocationModal";
import { BulkImportStudentsModal } from "@/components/modal/bulkImportStudentModal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ExamAvailableQuota } from "@/lib/types";
import { useB2BOrgStore } from "@/store/useB2BOrgStore";
import { QuotaBatchAllocationModal } from "@/components/modal/quotaBatchAllocationModal";

const formatExpiry = (dateStr: string | null) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const QuotaTooltipItem = ({
  label,
  data,
}: {
  label: string;
  data: { count: number; expiry: string | null } | undefined;
}) => {
  const count = data?.count ?? 0;
  const expiry = data?.expiry;

  return (
    <div className="flex justify-between items-center gap-4 text-xs">
      <span>{label}:</span>
      <span className="font-mono">
        {count}
        {count > 0 && expiry && (
          <span className="ml-1 text-[10px] text-yellow-300/90">
            (Exp: {formatExpiry(expiry)})
          </span>
        )}
      </span>
    </div>
  );
};

export default function StudentsPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = Number(params.orgId);

  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<MemberRow | null>(
    null,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const itemsPerPage = 10;
  const { org, user } = useB2BOrgStore();

  const {
    data: membersList,
    isLoading,
    isError,
  } = useMembers(orgId, {
    page: currentPage,
    pageSize: itemsPerPage,
    q: searchTerm || undefined,
  });

  const { data: quotaSummary, isLoading: isQuotaLoading } =
    useOrgQuotaSummary(orgId);

  const availableQuotas: ExamAvailableQuota = useMemo(() => {
    const base: ExamAvailableQuota = {
      IELTS: {
        Listening: 0,
        Reading: 0,
        Writing: 0,
        Speaking: 0,
        Complete: 0,
      },
      TOEFL: {
        Listening: 0,
        Reading: 0,
        "Structure & Written Expression": 0,
        Complete: 0,
      },
    };

    if (!quotaSummary) return base;

    // IELTS mapping: 1=Listening, 2=Reading, 3=Writing, 4=Speaking, 5=Complete
    const iPer = quotaSummary.ielts.perType as Record<
      string,
      { topup: number; used: number; remaining: number }
    >;

    base.IELTS.Listening = iPer["1"]?.remaining ?? 0;
    base.IELTS.Reading = iPer["2"]?.remaining ?? 0;
    base.IELTS.Writing = iPer["3"]?.remaining ?? 0;
    base.IELTS.Speaking = iPer["4"]?.remaining ?? 0;
    base.IELTS.Complete = iPer["5"]?.remaining ?? 0;

    // TOEFL mapping: 1=Listening, 2=Structure, 3=Reading, 4=Complete
    const tPer = quotaSummary.toefl.perType as Record<
      string,
      { topup: number; used: number; remaining: number }
    >;

    base.TOEFL.Listening = tPer["1"]?.remaining ?? 0;
    base.TOEFL["Structure & Written Expression"] = tPer["2"]?.remaining ?? 0;
    base.TOEFL.Reading = tPer["3"]?.remaining ?? 0;
    base.TOEFL.Complete = tPer["4"]?.remaining ?? 0;

    return base;
  }, [quotaSummary]);

  const allQuotaZero = (() => {
    const i = availableQuotas?.IELTS;
    const t = availableQuotas?.TOEFL;

    const nums = [
      i?.Listening,
      i?.Reading,
      i?.Writing,
      i?.Speaking,
      i?.Complete,
      t?.Listening,
      t?.["Structure & Written Expression"],
      t?.Reading,
      t?.Complete,
    ].map((n) => Number(n ?? 0));

    return nums.every((n) => n <= 0);
  })();

  const totalItems = membersList?.total ?? 0;
  const totalPages = membersList
    ? Math.max(1, Math.ceil(totalItems / itemsPerPage))
    : 1;

  const members = membersList?.data ?? [];

  const formatJoinDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });

  return (
    <TooltipProvider>
      <div className="p-8">
        {/* HEADER */}
        <div className="flex flex-col items-start md:flex-row md:items-center justify-between mb-8">
          <div className="flex-1">
            <Breadcrumb items={[{ label: "Students" }]} />
            <h1 className="text-xl md:text-3xl font-bold text-foreground">
              Student Management
            </h1>
            <p className="mt-2 text-muted-foreground">
              Register and manage student accounts and test quotas
            </p>
          </div>
          <div className="flex md:flex-row flex-col space-y-1 gap-2">
            <Link href={`/${orgId}/dashboard`}>
              <Button variant="outline" className="gap-2 bg-transparent">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <Button
              variant="outline"
              className="gap-2 bg-transparent"
              onClick={() => setShowBulkModal(true)}
            >
              <Upload className="h-4 w-4" />
              Bulk Import
            </Button>
            <Button
              disabled={allQuotaZero}
              onClick={() => setShowAddModal(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Student
            </Button>
          </div>
        </div>

        {/* Search */}
        <Card className="mb-6 p-4">
          <div className="flex items-center gap-2 bg-muted rounded-lg px-4 py-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search students by name or email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 bg-transparent text-foreground placeholder-muted-foreground focus:outline-none"
            />
          </div>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          {isError && (
            <p className="p-4 text-sm text-red-500">
              Failed to load students. Please try again.
            </p>
          )}

          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading...</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                        Name
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                        Email
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                        Status
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                        IELTS Quotas
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                        TOEFL Quotas
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                        Joined
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((student) => {
                      const defaultQuotaItem = { count: 0, expiry: null };

                      // 2. Ambil data quota (Backend sekarang return object {count, expiry})
                      // Kita casting 'as any' jika TS belum diupdate interface-nya,
                      // atau sesuaikan interface MemberRow di file types
                      const ielts = student.quotas?.IELTS ?? {
                        Listening: defaultQuotaItem,
                        Reading: defaultQuotaItem,
                        Writing: defaultQuotaItem,
                        Speaking: defaultQuotaItem,
                        Complete: defaultQuotaItem,
                      };

                      const toefl = student.quotas?.TOEFL ?? {
                        Listening: defaultQuotaItem,
                        Reading: defaultQuotaItem,
                        "Structure & Written Expression": defaultQuotaItem,
                        Complete: defaultQuotaItem,
                      };

                      // 3. Hitung Total (Akses property .count)
                      const ieltsTotal = Object.values(ielts).reduce(
                        (sum, v: any) => sum + (v.count ?? 0),
                        0,
                      );
                      const toeflTotal = Object.values(toefl).reduce(
                        (sum, v: any) => sum + (v.count ?? 0),
                        0,
                      );
                      return (
                        <tr
                          key={student.id}
                          className="border-b border-border hover:bg-muted transition-colors"
                        >
                          <td className="py-4 px-6 text-sm text-foreground font-medium">
                            {student.users?.name ?? "-"}
                          </td>
                          <td className="py-4 px-6 text-sm text-foreground">
                            {student.users?.email ?? "-"}
                          </td>
                          <td className="py-4 px-6 text-sm">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                student.status
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {student.status ? "Active" : "Inactive"}
                            </span>
                          </td>

                          <td className="py-4 px-6 text-sm text-foreground font-medium">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="inline-flex items-center gap-1 cursor-help rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                  <span>{ieltsTotal}</span>
                                  <Info className="h-3 w-3" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs max-w-[300px]">
                                <div className="space-y-1 p-1">
                                  <p className="font-semibold mb-2 border-b pb-1">
                                    IELTS Quota Breakdown
                                  </p>
                                  {/* Pass entire object (count + expiry) ke helper */}
                                  <QuotaTooltipItem
                                    label="Listening"
                                    data={ielts.Listening as any}
                                  />
                                  <QuotaTooltipItem
                                    label="Reading"
                                    data={ielts.Reading as any}
                                  />
                                  <QuotaTooltipItem
                                    label="Writing"
                                    data={ielts.Writing as any}
                                  />
                                  <QuotaTooltipItem
                                    label="Speaking"
                                    data={ielts.Speaking as any}
                                  />
                                  <QuotaTooltipItem
                                    label="Complete"
                                    data={ielts.Complete as any}
                                  />
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </td>

                          {/* KOLOM TOEFL QUOTA */}
                          <td className="py-4 px-6 text-sm text-foreground font-medium">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="inline-flex items-center gap-1 cursor-help rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                  <span>{toeflTotal}</span>
                                  <Info className="h-3 w-3" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs max-w-[300px]">
                                <div className="space-y-1 p-1">
                                  <p className="font-semibold mb-2 border-b pb-1">
                                    TOEFL Quota Breakdown
                                  </p>
                                  <QuotaTooltipItem
                                    label="Listening"
                                    data={toefl.Listening as any}
                                  />
                                  <QuotaTooltipItem
                                    label="Reading"
                                    data={toefl.Reading as any}
                                  />
                                  <QuotaTooltipItem
                                    label="Structure"
                                    data={
                                      toefl[
                                        "Structure & Written Expression"
                                      ] as any
                                    }
                                  />
                                  <QuotaTooltipItem
                                    label="Complete"
                                    data={toefl.Complete as any}
                                  />
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </td>

                          <td className="py-4 px-6 text-sm text-muted-foreground">
                            {formatJoinDate(student.created_at)}
                          </td>

                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setShowQuotaModal(true);
                                }}
                                className="rounded-lg p-2 text-muted-foreground hover:bg-blue-100 transition-colors"
                                title="Allocate Quota"
                              >
                                <Gift className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
              />
            </>
          )}
        </Card>

        {showBulkModal && (
          <BulkImportStudentsModal
            orgId={orgId}
            availableQuotas={availableQuotas}
            isQuotaLoading={isQuotaLoading}
            onClose={() => setShowBulkModal(false)}
            onSuccess={() => setCurrentPage(1)}
          />
        )}

        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Add New Student
              </h2>
              <AddStudentForm
                orgId={orgId}
                availableQuotas={availableQuotas}
                onClose={() => setShowAddModal(false)}
                onSuccess={() => setShowAddModal(false)}
              />
            </Card>
          </div>
        )}

        {showQuotaModal &&
          selectedStudent &&
          (org?.status == true ? (
            <QuotaAllocationModal
              orgId={orgId}
              student={selectedStudent}
              availableQuotas={availableQuotas}
              onClose={() => setShowQuotaModal(false)}
            />
          ) : (
            <QuotaBatchAllocationModal
              orgId={orgId}
              student={selectedStudent}
              availableQuotas={availableQuotas}
              onClose={() => setShowQuotaModal(false)}
            />
          ))}
      </div>
    </TooltipProvider>
  );
}
