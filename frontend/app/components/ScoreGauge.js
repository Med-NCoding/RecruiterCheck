const TONE_COLORS = {
  danger: "#ff6872",
  warning: "#ffc15a",
  success: "#52d6a5",
  neutral: "#8e98a5",
};

export default function ScoreGauge({ score, tone = "neutral", label = "Model confidence" }) {
  const target = Math.round(Math.min(Math.max(score, 0), 1) * 100);

  return (
    <div
      className="grid h-24 w-24 shrink-0 place-items-center rounded-full p-[6px]"
      style={{
        background: `conic-gradient(${TONE_COLORS[tone]} ${target}%, #303640 ${target}% 100%)`,
      }}
      role="meter"
      aria-label={label}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={target}
      aria-valuetext={`${target}% ${label.toLowerCase()}`}
    >
      <div className="grid h-full w-full place-items-center rounded-full bg-surface shadow-inner shadow-foreground/5">
        <div className="text-center">
          <span className="block text-xl font-semibold tracking-[-0.04em] text-foreground">{target}%</span>
          <span className="mt-0.5 block text-[9px] font-medium text-muted">confidence</span>
        </div>
      </div>
    </div>
  );
}
