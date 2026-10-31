export default function Spinner({ label = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      {/* Same stretching-arc keyframes as the Dashboard loader */}
      <style>{`
        @keyframes arc-rotate {
          to { transform: rotate(360deg); }
        }
        @keyframes arc-dash {
          0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; }
          50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; }
          100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; }
        }
      `}</style>

      <div className="relative w-11 h-11 mb-4">
        {/* Same stretching-arc loader as the Dashboard: arc grows fast,
            shrinks slow, while the circle keeps turning */}
        <svg
          viewBox="0 0 48 48"
          className="absolute inset-0 h-full w-full"
          style={{ animation: "arc-rotate 1.6s linear infinite" }}
          aria-hidden="true"
        >
          <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(76,154,90,0.15)" strokeWidth="4" />
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="#4C9A5A"
            strokeWidth="4"
            strokeLinecap="round"
            style={{ animation: "arc-dash 1.4s ease-in-out infinite" }}
          />
        </svg>
      </div>

      <p className="text-[11.5px] font-bold text-[#1F2A22]/40 tracking-widest uppercase animate-pulse">
        {label}
      </p>
    </div>
  );
}