import Image from "next/image";
import s from "./auth.module.css";

// Shared split layout for login/register: event photography on one side, the form on the other
export default function AuthShell({ image, title, children }: { image: string; title: string; children: React.ReactNode }) {
  return (
    <div className={`container ${s.page}`}>
      <aside className={s.visual}>
        <Image src={image} alt="" fill priority sizes="(max-width: 899px) 100vw, 50vw" />
        <div className={s.visualText}>
          <p className={`display ${s.visualTitle}`}>{title}</p>
        </div>
      </aside>
      <section className={s.formSide}>{children}</section>
    </div>
  );
}
