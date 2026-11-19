import Image from "next/image";
import s from "./auth.module.css";

// Shared split layout for login/register: a riso-printed poster on one side, the form on the other
export default function AuthShell({ image, title, tone = "pink", children }: { image: string; title: string; tone?: string; children: React.ReactNode }) {
  return (
    <div className={`container ${s.page}`}>
      <aside className={`${s.visual} riso`} data-tone={tone}>
        <Image src={image} alt="" fill preload loading="eager" sizes="(max-width: 899px) 100vw, 50vw" />
        <p className={`display ${s.visualTitle} stamp`}>{title}</p>
      </aside>
      <section className={s.formSide}>{children}</section>
    </div>
  );
}
