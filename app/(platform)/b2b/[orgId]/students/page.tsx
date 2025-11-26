"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Upload,
  Search,
  Mail,
  Trash2,
  Edit,
  ArrowLeft,
  Gift,
} from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import { Pagination } from "@/components/pagination";
import { MemberRow, useMembers } from "@/app/actions/hooks/b2b/useMember";
import { useOrgQuotaSummary } from "@/app/actions/hooks/b2b/useOrg";
import { AddStudentForm } from "@/components/modal/addStudentModal";
import { QuotaAllocationModal } from "@/components/modal/quotaAllocationModal";
import { BulkImportStudentsModal } from "@/components/modal/bulkImportStudentModal";

type ExamAvailableQuota = {
  IELTS: {
    Reading: number;
    Listening: number;
    Writing: number;
    Speaking: number;
    Complete: number;
  };
  TOEFL: {
    Reading: number;
    Listening: number;
    "Structure & Written Expression": number;
    Complete: number;
  };
};

export default function StudentsPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = Number(params.orgId);

  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<MemberRow | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const itemsPerPage = 10;

  const {
    data: membersList,
    isLoading,
    isError,
  } = useMembers(orgId, {
    page: currentPage,
    pageSize: itemsPerPage,
    q: searchTerm || undefined,
  });

  const { data: quotaSummary } = useOrgQuotaSummary(orgId);

  const availableQuotas: ExamAvailableQuota = useMemo(() => {
    const base: ExamAvailableQuota = {
      IELTS: {
        Reading: 0,
        Listening: 0,
        Writing: 0,
        Speaking: 0,
        Complete: 0,
      },
      TOEFL: {
        Reading: 0,
        Listening: 0,
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

  const totalItems = membersList?.total ?? 0;
  const totalPages = membersList
    ? Math.max(1, Math.ceil(totalItems / itemsPerPage))
    : 1;

  const members = membersList?.data ?? [];

  const handleDelete = (id: number) => {
    // belum ada endpoint delete member → sementara tampilkan alert
    alert("Delete member belum diimplementasikan.");
  };

  const handleAddStudentSuccess = () => {
    setShowAddModal(false);
  };

  const formatJoinDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });

  return (
    <div className="p-8">
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
          <Link href={`/b2b/${orgId}/dashboard`}>
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
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
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
                      Quotas Allocated
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
                    const allQuotasTotal =
                      Object.values(student.quotas.IELTS).reduce(
                        (sum, v) => sum + v,
                        0
                      ) +
                      Object.values(student.quotas.TOEFL).reduce(
                        (sum, v) => sum + v,
                        0
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
                          {allQuotasTotal}
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
                            {/* <button className="rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors">
                              <Mail className="h-4 w-4" />
                            </button>
                            <button className="rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors">
                              <Edit className="h-4 w-4" />
                            </button> */}
                            {/* <button
                              onClick={() => handleDelete(student.id)}
                              className="rounded-lg p-2 text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button> */}
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

      {/* Bulk Import section tetap dummy
      <div className="mt-8">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Bulk Import Students
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Import multiple students at once by uploading a CSV file with
            columns: Name, Email, Student ID
          </p>
          <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center bg-muted/30 cursor-pointer hover:bg-muted transition-colors">
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-foreground mb-1">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">
              CSV files up to 10 MB
            </p>
          </div>
        </Card>
      </div> */}
      {showBulkModal && (
        <BulkImportStudentsModal
          orgId={orgId}
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => {
            // refresh daftar members setelah import
            setCurrentPage(1);
            // kalau pakai react-query, invalidate query "members"
            // tapi di sini cukup rely ke useMembers dengan dependen currentPage/searchTerm
          }}
        />
      )}
      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Add New Student
            </h2>
            <AddStudentForm
              orgId={orgId}
              onClose={() => setShowAddModal(false)}
              onSuccess={handleAddStudentSuccess}
            />
          </Card>
        </div>
      )}

      {/* Quota Allocation Modal */}
      {showQuotaModal && selectedStudent && (
        <QuotaAllocationModal
          orgId={orgId}
          student={selectedStudent}
          availableQuotas={availableQuotas}
          onClose={() => setShowQuotaModal(false)}
        />
      )}
    </div>
  );
}
