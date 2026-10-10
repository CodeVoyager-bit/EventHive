import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/ssr";
import type { Pagination as PaginationInfo } from "@/types";
import { qs, type SearchParams } from "@/lib/query";
import s from "./Pagination.module.css";

export default function Pagination({ pagination, params, basePath }: { pagination: PaginationInfo; params: SearchParams; basePath: string }) {
  const { page, pages } = pagination;
  if (pages <= 1) return null;

  const link = (target: number, label: string, icon: React.ReactNode, enabled: boolean, iconFirst: boolean) => {
    const content = iconFirst ? <>{icon}{label}</> : <>{label}{icon}</>;
    return enabled ? (
      <Link href={`${basePath}${qs(params, { page: target === 1 ? null : target })}`} className="btn btn-secondary btn-sm">{content}</Link>
    ) : (
      <span className="btn btn-secondary btn-sm" aria-disabled="true">{content}</span>
    );
  };

  return (
    <nav className={s.nav} aria-label="Pagination">
      {link(page - 1, "Previous", <CaretLeft size={16} aria-hidden="true" />, page > 1, true)}
      <span className={`${s.info} num`}>Page {page} of {pages}</span>
      {link(page + 1, "Next", <CaretRight size={16} aria-hidden="true" />, page < pages, false)}
    </nav>
  );
}
