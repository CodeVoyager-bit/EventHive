import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Pagination as PaginationInfo } from "@/types";
import { qs, type SearchParams } from "@/lib/query";
import s from "./Pagination.module.css";

export default function Pagination({ pagination, params, basePath }: { pagination: PaginationInfo; params: SearchParams; basePath: string }) {
  const { page, pages } = pagination;
  if (pages <= 1) return null;

  const link = (target: number, label: string, icon: React.ReactNode, enabled: boolean) =>
    enabled ? (
      <Link href={`${basePath}${qs(params, { page: target === 1 ? null : target })}`} className="btn btn-secondary btn-sm">
        {icon}
        {label}
      </Link>
    ) : (
      <span className="btn btn-secondary btn-sm" aria-disabled="true" style={{ opacity: 0.5 }}>
        {icon}
        {label}
      </span>
    );

  return (
    <nav className={s.nav} aria-label="Pagination">
      {link(page - 1, "Previous", <ChevronLeft size={16} aria-hidden="true" />, page > 1)}
      <span className={s.info}>
        Page {page} of {pages}
      </span>
      {link(page + 1, "Next", <ChevronRight size={16} aria-hidden="true" />, page < pages)}
    </nav>
  );
}
