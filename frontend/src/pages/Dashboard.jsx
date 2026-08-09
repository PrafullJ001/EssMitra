import { useEffect, useState, useRef } from "react";
import { getDashboardStats } from "../api/dashboardApi";
import StatCard from "../components/dashboard/StatCard";
import RecentServiceItem from "../components/dashboard/RecentServiceItem";
import { useAuth } from "../hooks/useAuth";
import Spinner from "../components/common/Spinner";
import EmptyState from "../components/common/EmptyState";
import { useNavigate } from "react-router-dom";

const getTodayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activePreset, setActivePreset] = useState("Recent");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const isFirstSearchRender = useRef(true);

  const loadStats = async (params = {}) => {
    setLoading(true);
    try {
      const { data } = await getDashboardStats(params);
      setStats(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (isFirstSearchRender.current) {
      isFirstSearchRender.current = false;
      return;
    }
    const handle = setTimeout(() => {
      loadStats({ ...dateRange, search: searchQuery });
    }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handlePresetRecent = () => {
    setActivePreset("Recent");
    setShowCustomRange(false);
    setDateRange({ from: "", to: "" });
    loadStats({ search: searchQuery });
  };

  const handlePresetToday = () => {
    const today = getTodayLocal();
    setActivePreset("Today");
    setShowCustomRange(false);
    setDateRange({ from: today, to: today });
    loadStats({ from: today, to: today, search: searchQuery });
  };

  const handlePresetWeek = () => {
    const from = daysAgo(7);
    const to = getTodayLocal();
    setActivePreset("Last Week");
    setShowCustomRange(false);
    setDateRange({ from, to });
    loadStats({ from, to, search: searchQuery });
  };

  const handleToggleCustomRange = () => {
    setShowCustomRange((prev) => {
      const next = !prev;
      if (next) setActivePreset("Custom");
      return next;
    });
  };

  const handleApplyCustomRange = () => {
    setActivePreset("Custom");
    setDateRange({ from: customFrom, to: customTo });
    loadStats({ from: customFrom, to: customTo, search: searchQuery });
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F2E9] px-6">
        <div className="max-w-sm w-full flex flex-col items-center text-center">
          <div className="relative mb-6">
            <div
              className="absolute inset-0 rounded-full blur-2xl opacity-60 animate-pulse"
              style={{
                backgroundImage:
                  "radial-gradient(circle, #4C9A5A 0%, transparent 70%)",
              }}
            />
            <div
              className="relative h-20 w-20 rounded-full flex items-center justify-center shadow-lg"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #4C9A5A 0%, #2B5439 100%)",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-9 w-9 text-white animate-spin"
                style={{ animationDuration: "1.4s" }}
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  opacity="0.25"
                />
                <path
                  d="M21 12a9 9 0 0 0-9-9"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mb-5">
            <span className="h-2 w-2 rounded-full bg-[#4C9A5A] animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="h-2 w-2 rounded-full bg-[#4C9A5A] animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="h-2 w-2 rounded-full bg-[#4C9A5A] animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>

          <h2 className="text-[#1F3D2B] text-lg font-bold leading-tight mb-1.5">
            Loading your dashboard...
          </h2>
          <p className="text-[#1F2A22]/60 text-sm font-medium leading-snug mb-0.5">
            तुमचे डॅशबोर्ड लोड होत आहे...
          </p>

          <div className="mt-5 bg-white/70 border border-black/[0.05] rounded-2xl px-4 py-3">
            <p className="text-[#1F2A22]/55 text-xs font-medium leading-relaxed">
              This can take 20–30 seconds on the first load. Thanks for
              your patience!
              <br />
              <span className="text-[#1F2A22]/45">
                पहिल्यांदा लोड होताना 20-30 सेकंद लागू शकतात. कृपया थांबा.
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F2E9] px-6">
        <div className="max-w-sm w-full bg-white/50 backdrop-blur-sm rounded-3xl border border-[#F3C6C6]/50 shadow-sm p-8 text-center flex flex-col items-center transition-all">
          <div className="h-16 w-16 rounded-2xl bg-[#FCEDED] border border-[#F3C6C6] flex items-center justify-center mb-4 shadow-inner">
            <svg viewBox="0 0 24 24" className="h-8 w-8 text-[#C24949]" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
              <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className="text-[#C24949] text-base font-semibold mb-1">Unable to load</h3>
          <p className="text-[#C24949]/80 text-sm font-medium">{error}</p>
        </div>
      </div>
    );
  }

  const initials = user?.name
    ? user.name.trim().split(/\s+/).slice(0, 2).map((n) => n[0]).join("").toUpperCase()
    : "";

  const displayedRecentServices = (stats?.recentServices || [])
    .filter((s) => s.farmer)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  const formatCurrency = (amount) => {
    return Number(amount || 0).toLocaleString("en-IN");
  };

  return (
    <div className="min-h-screen bg-[#F6F2E9] pb-24 font-sans selection:bg-[#4C9A5A]/20">
      <div
        className="relative px-6 pt-10 pb-20 overflow-hidden rounded-b-[2.5rem] shadow-sm"
        style={{
          backgroundImage: "linear-gradient(180deg, #1F3D2B 0%, #234730 60%, #2B5439 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage:
              "repeating-linear-gradient(115deg, #ffffff 0px, #ffffff 1px, transparent 1px, transparent 14px)",
          }}
        />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white text-sm font-bold backdrop-blur-md shadow-inner">
              {initials || (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                  <circle cx="12" cy="8" r="3.5" stroke="white" strokeWidth="1.6" />
                  <path d="M5 20c1.5-3.5 5-5 7-5s5.5 1.5 7 5" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-xs text-[#B9D9BE] font-medium tracking-wide uppercase mb-0.5">
                Welcome back
              </p>
              <h1 className="text-lg font-bold text-white tracking-tight">{user?.name}</h1>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 text-xs font-semibold text-[#F3C6C6] bg-white/5 border border-white/10 rounded-xl px-4 py-2 hover:bg-white/10 hover:text-white active:scale-95 transition-all duration-200 backdrop-blur-sm"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
              <path d="M15 17l5-5-5-5M20 12H9M13 21H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Logout
          </button>
        </div>
      </div>

      {isAdmin && (
        <div className="px-5 -mt-12 relative z-10 max-w-5xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Total Farmers" value={stats.totalFarmers} accent="blue" />
            <StatCard
              label="Total Acres"
              value={stats.totalAcres != null ? Number(stats.totalAcres).toFixed(2) : "0.0000"}
              accent="green"
            />
            <StatCard label="Total Billed" value={`₹${formatCurrency(stats.totalBillAmount)}`} accent="green" />
            <StatCard label="Collected" value={`₹${formatCurrency(stats.totalAmountReceived)}`} accent="green" />
            <StatCard label="Pending" value={`₹${formatCurrency(stats.totalPendingAmount)}`} accent="orange" />
            <StatCard label="Total Services" value={stats.totalServiceRecords} accent="blue" />
          </div>
        </div>
      )}

      <div className={`px-5 ${isAdmin ? "mt-8" : "-mt-12 relative z-10"} max-w-5xl mx-auto`}>
        <div className="flex items-end justify-between mb-4 px-1">
          <h2 className="text-lg font-bold text-[#878f87] tracking-tight">Recent Services</h2>
          {displayedRecentServices.length > 0 && (
            <span className="text-[11px] font-bold uppercase tracking-wide text-[#4C9A5A] bg-[#E9F3E9] rounded-lg px-2.5 py-1 shadow-sm border border-[#4C9A5A]/10">
              {displayedRecentServices.length} shown
            </span>
          )}
        </div>

        <div
          className={`flex items-center gap-1.5 mb-3 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1 ${
            !isAdmin ? "gap-2 mb-4" : ""
          }`}
        >
          <button
            onClick={handlePresetRecent}
            className={`shrink-0 flex-1 min-w-[76px] font-bold whitespace-nowrap transition-all ${
              !isAdmin
                ? "px-3 py-3 rounded-2xl text-[13px] shadow-sm"
                : "px-2 py-2 rounded-xl text-[11px] leading-tight"
            } ${
              activePreset === "Recent"
                ? "bg-[#2B5439] text-white shadow-sm"
                : !isAdmin
                ? "bg-white text-[#1F2A22]/70 border border-black/[0.08]"
                : "bg-white text-[#1F2A22]/60 border border-black/[0.06]"
            }`}
          >
            Recent
          </button>

          <button
            onClick={handlePresetToday}
            className={`shrink-0 flex-1 min-w-[76px] font-bold whitespace-nowrap transition-all ${
              !isAdmin
                ? "px-3 py-3 rounded-2xl text-[13px] shadow-sm"
                : "px-2 py-2 rounded-xl text-[11px] leading-tight"
            } ${
              activePreset === "Today"
                ? "bg-[#2B5439] text-white shadow-sm"
                : !isAdmin
                ? "bg-white text-[#1F2A22]/70 border border-black/[0.08]"
                : "bg-white text-[#1F2A22]/60 border border-black/[0.06]"
            }`}
          >
            Today
          </button>

          <button
            onClick={handlePresetWeek}
            className={`shrink-0 flex-1 min-w-[76px] font-bold whitespace-nowrap transition-all ${
              !isAdmin
                ? "px-3 py-3 rounded-2xl text-[13px] shadow-sm"
                : "px-2 py-2 rounded-xl text-[11px] leading-tight"
            } ${
              activePreset === "Last Week"
                ? "bg-[#2B5439] text-white shadow-sm"
                : !isAdmin
                ? "bg-white text-[#1F2A22]/70 border border-black/[0.08]"
                : "bg-white text-[#1F2A22]/60 border border-black/[0.06]"
            }`}
          >
            Last Week
          </button>

          <button
            onClick={handleToggleCustomRange}
            className={`shrink-0 flex-1 min-w-[76px] font-bold whitespace-nowrap transition-all ${
              !isAdmin
                ? "px-3 py-3 rounded-2xl text-[13px] shadow-sm"
                : "px-2 py-2 rounded-xl text-[11px] leading-tight"
            } ${
              activePreset === "Custom"
                ? "bg-[#2B5439] text-white shadow-sm"
                : !isAdmin
                ? "bg-white text-[#1F2A22]/70 border border-black/[0.08]"
                : "bg-white text-[#1F2A22]/60 border border-black/[0.06]"
            }`}
          >
            Custom
          </button>
        </div>

        {showCustomRange && (
          <div className="bg-white rounded-2xl shadow-sm border border-black/[0.04] p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#1F2A22]/50 uppercase tracking-wide mb-1.5">From</label>
                <input
                  type="date"
                  name="dashboardFrom"
                  autoComplete="off"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full bg-[#F6F2E9] border border-black/[0.06] rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#1F2A22]/50 uppercase tracking-wide mb-1.5">To</label>
                <input
                  type="date"
                  name="dashboardTo"
                  autoComplete="off"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full bg-[#F6F2E9] border border-black/[0.06] rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              onClick={handleApplyCustomRange}
              className="w-full bg-[#4C9A5A] text-white rounded-xl py-2.5 text-sm font-bold"
            >
              Apply Range
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-black/[0.04] p-3 flex items-center gap-2.5 mb-4">
          <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-[#1F2A22]/30 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input
            type="text"
            name="dashboardSearch"
            autoComplete="off"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search farmer name or village..."
            className="flex-1 bg-transparent text-sm text-[#1F2A22] placeholder-[#1F2A22]/30 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-[#1F2A22]/30 hover:text-[#1F2A22]/60 shrink-0"
            >
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>

        <div className="bg-white rounded-[1.5rem] shadow-sm border border-black/[0.04] p-1 overflow-hidden transition-all">
          {loading ? (
            <div className="py-6">
              <Spinner label="Loading..." />
            </div>
          ) : displayedRecentServices.length === 0 ? (
            <div className="py-6">
              <EmptyState
                icon="🌱"
                title="No services found"
                subtitle="Try a different date range or search term"
              />
            </div>
          ) : (
            <div className="flex flex-col">
              {displayedRecentServices.map((service) => (
                <div
                  key={service._id}
                  {...(isAdmin && {
                    onClick: () =>
                      service.farmer && navigate(`/farmers/${service.farmer._id}`),
                  })}
                  className={`transition-colors rounded-xl ${
                    isAdmin ? "cursor-pointer active:bg-black/[0.02]" : ""
                  }`}
                >
                  <RecentServiceItem service={service} disableNavigation={!isAdmin} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}