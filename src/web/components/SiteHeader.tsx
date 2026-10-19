const STAR_PATH =
  "M234.29,114.85l-45,38.83L203,211.75a16.4,16.4,0,0,1-24.5,17.82L128,198.49,77.47,229.57A16.4,16.4,0,0,1,53,211.75l13.76-58.07-45-38.83A16.46,16.46,0,0,1,31.08,86l59-4.76,22.76-55.08a16.36,16.36,0,0,1,30.27,0l22.75,55.08,59,4.76a16.46,16.46,0,0,1,9.37,28.86Z";

const LOGOUT_PATH =
  "M120,216a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V40a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H56V208h56A8,8,0,0,1,120,216Zm109.66-93.66-40-40a8,8,0,0,0-11.32,11.32L204.69,120H112a8,8,0,0,0,0,16h92.69l-26.35,26.34a8,8,0,0,0,11.32,11.32l40-40A8,8,0,0,0,229.66,122.34Z";

const TITLE_CLASS = "text-[16px] font-medium tracking-[-0.01em]";

type Props = {
  roleLabel: string;
  subtitle?: string;
  onLogout?: () => void;
  /** Transitório: a MemberPage ainda tem teste que exige o título como único h1 (some na Task 11). */
  titleAsH1?: boolean;
};

export function SiteHeader({
  roleLabel,
  subtitle,
  onLogout,
  titleAsH1,
}: Props) {
  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-x-[24px] gap-y-[12px] px-[28px] py-[14px] bg-[color-mix(in_srgb,var(--color-bg)_88%,transparent)] backdrop-blur-[8px] border-b border-neutral-900">
      <div className="flex items-center gap-3 min-w-0">
        <div className="size-9 rounded-md bg-navy flex items-center justify-center flex-none">
          <svg
            viewBox="0 0 256 256"
            width="18"
            height="18"
            aria-hidden="true"
            className="text-gold"
          >
            <path fill="currentColor" d={STAR_PATH} />
          </svg>
        </div>
        <div className="flex flex-col gap-px min-w-0">
          {titleAsH1 ? (
            <h1 className={`m-0 leading-[1.55] ${TITLE_CLASS}`}>Escalação</h1>
          ) : (
            <span className={TITLE_CLASS}>Escalação</span>
          )}
          {subtitle && (
            <span className="text-[12px] text-neutral-400">{subtitle}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[12px] tracking-[0.06em] uppercase text-neutral-500">
          {roleLabel}
        </span>
        {onLogout && (
          <button
            className="btn btn-ghost gap-[6px]"
            type="button"
            onClick={onLogout}
          >
            <svg
              viewBox="0 0 256 256"
              width="15"
              height="15"
              aria-hidden="true"
            >
              <path fill="currentColor" d={LOGOUT_PATH} />
            </svg>
            Sair
          </button>
        )}
      </div>
    </header>
  );
}
