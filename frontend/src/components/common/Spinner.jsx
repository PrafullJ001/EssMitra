export default function Spinner({ label = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative w-11 h-11 mb-4">
        {/* Soft ambient glow behind the ring */}
        <div
          className="absolute inset-0 rounded-full blur-md opacity-40"
          style={{ backgroundImage: "radial-gradient(circle, #4C9A5A 0%, transparent 70%)" }}
        />

        {/* Background track */}
        <div className="absolute inset-0 border-[3px] border-[#4C9A5A]/10 rounded-full" />

        {/* Active spinning indicator — slightly rounded cap, softer duration */}
        <div
          className="absolute inset-0 border-[3px] border-transparent border-t-[#4C9A5A] border-r-[#4C9A5A]/40 rounded-full animate-spin"
          style={{ animationDuration: "0.9s" }}
        />

        {/* Center dot for a bit more polish */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="h-1.5 w-1.5 rounded-full bg-[#4C9A5A]/50" />
        </div>
      </div>

      <p className="text-[11.5px] font-bold text-[#1F2A22]/40 tracking-widest uppercase animate-pulse">
        {label}
      </p>
    </div>
  );
}