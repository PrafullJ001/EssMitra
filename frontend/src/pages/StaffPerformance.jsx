import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getStaffPerformance, getStaffPerformanceForUser } from "../api/staffApi";
import Spinner from "../components/common/Spinner";

// Truncates (not rounds) to exactly 2 decimal places — e.g. 44.55667 → "44.55"
const truncateTo2 = (value) => {
  const num = Number(value) || 0;
  return (Math.floor(num * 100) / 100).toFixed(2);
};

export default function StaffPerformance() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Global date-range filter — recalculates totals for ALL staff at once.
  // Defaults to unfiltered (all-time totals).
  const [showFilter, setShowFilter] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const isFilterActive = Boolean(appliedFrom || appliedTo);

  // Per-staff-card filter — lets you calculate ONE staff member's totals
  // for their own custom range, independent of everyone else's cards.
  // Keyed by userId: { show, from, to, appliedFrom, appliedTo, loading, error, override }
  const [cardFilters, setCardFilters] = useState({});

  const getCardState = (userId) =>
    cardFilters[userId] || {
      show: false,
      from: "",
      to: "",
      appliedFrom: "",
      appliedTo: "",
      loading: false,
      error: null,
      override: null,
    };

  const updateCardState = (userId, patch) => {
    setCardFilters((prev) => ({
      ...prev,
      [userId]: { ...getCardState(userId), ...patch },
    }));
  };

  const toggleCardFilter = (userId) => {
    const cf = getCardState(userId);
    updateCardState(userId, { show: !cf.show });
  };

  const applyCardFilter = async (userId) => {
    const cf = getCardState(userId);
    updateCardState(userId, { loading: true, error: null });
    try {
      const { data: result } = await getStaffPerformanceForUser(userId, cf.from, cf.to);
      updateCardState(userId, {
        loading: false,
        appliedFrom: cf.from,
        appliedTo: cf.to,
        override: result,
      });
    } catch (err) {
      updateCardState(userId, {
        loading: false,
        error: err.response?.data?.message || "Failed to load",
      });
    }
  };

  const clearCardFilter = (userId) => {
    updateCardState(userId, {
      show: false,
      from: "",
      to: "",
      appliedFrom: "",
      appliedTo: "",
      loading: false,
      error: null,
      override: null,
    });
  };

  const loadData = (from, to) => {
    setLoading(true);
    setError(null);
    getStaffPerformance(from, to)
      .then(({ data }) => setData(data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApplyFilter = () => {
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
    loadData(dateFrom, dateTo);
  };

  const handleClearFilter = () => {
    setDateFrom("");
    setDateTo("");
    setAppliedFrom("");
    setAppliedTo("");
    setShowFilter(false);
    loadData();
  };

  return (
    <div className="min-h-screen bg-[#F6F2E9] pb-24 font-sans">
      <div
        className="relative px-6 pt-10 pb-16 overflow-hidden rounded-b-[2.5rem] shadow-sm"
        style={{ backgroundImage: "linear-gradient(180deg, #1F3D2B 0%, #234730 60%, #2B5439 100%)" }}
      >
        <button onClick={() => navigate("/profile")} className="inline-flex items-center bg-white/10 border border-white/15 text-white text-sm font-semibold px-3.5 py-1.5 rounded-xl mb-3 hover:bg-white/20 active:scale-95 transition-all">
          ← Back
        </button>
        <h1 className="text-xl font-bold text-white tracking-tight">Staff Performance</h1>
        <p className="text-[#B9D9BE] text-xs mt-1">Entries and acres logged per user</p>
      </div>

      <div className="px-5 -mt-8 relative z-10 max-w-2xl mx-auto space-y-3">
        {/* Global date range filter — applies to every staff card */}
        <div className="bg-white rounded-[1.5rem] shadow-sm border border-black/[0.04] p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] uppercase font-bold text-[#1F2A22]/40 tracking-widest">
              Date Range (All Staff)
              {isFilterActive && (
                <span className="ml-2 normal-case font-semibold text-[#4C9A5A] tracking-normal">(filtered)</span>
              )}
            </p>
            <button
              type="button"
              onClick={() => setShowFilter((v) => !v)}
              className="flex items-center gap-1 text-[11px] font-bold text-[#4C9A5A] bg-[#E9F3E9] px-2.5 py-1 rounded-lg"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Filter
            </button>
          </div>

          {showFilter && (
            <div className="bg-[#F6F2E9]/70 rounded-2xl p-3.5 mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-[#1F2A22]/50 uppercase tracking-wide mb-1">From</label>
                  <input
                    type="date"
                    name="staffPerfFrom"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full bg-white border border-black/[0.08] rounded-lg px-2.5 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#1F2A22]/50 uppercase tracking-wide mb-1">To</label>
                  <input
                    type="date"
                    name="staffPerfTo"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full bg-white border border-black/[0.08] rounded-lg px-2.5 py-2 text-xs"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClearFilter}
                  className="flex-1 bg-white border border-black/[0.08] text-[#1F2A22]/60 rounded-lg py-2 text-xs font-bold"
                >
                  Show All
                </button>
                <button
                  type="button"
                  onClick={handleApplyFilter}
                  disabled={!dateFrom && !dateTo}
                  className="flex-[1.5] bg-[#4C9A5A] text-white rounded-lg py-2 text-xs font-bold disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {loading && <Spinner label="Loading..." />}
        {error && <p className="text-center text-[#C24949] text-sm py-6">{error}</p>}

        {!loading && !error && data.length === 0 && (
          <div className="bg-white rounded-[1.5rem] shadow-sm p-6 text-center text-[#8A968C] text-sm">
            No service entries recorded yet
          </div>
        )}

        {data.map((s) => {
          const cf = getCardState(s.userId);
          const isCardFilterActive = Boolean(cf.appliedFrom || cf.appliedTo);
          const displayTotals = cf.override || {
            totalEntries: s.totalEntries,
            totalAcres: s.totalAcres,
            totalBillAmount: s.totalBillAmount,
          };

          return (
            <div key={s.userId} className="bg-white rounded-[1.5rem] shadow-sm border border-black/[0.04] p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-bold text-[#1F2A22]">{s.name}</p>
                  <p className="text-xs text-[#8A968C]">{s.mobile}</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wide bg-[#E9F3E9] text-[#4C9A5A] px-2.5 py-1 rounded-lg">
                  {s.role}
                </span>
              </div>

              {/* Per-staff individual filter */}
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[10px] uppercase font-bold text-[#1F2A22]/35 tracking-wide">
                  {isCardFilterActive ? "Custom Range" : "All Time"}
                </p>
                <button
                  type="button"
                  onClick={() => toggleCardFilter(s.userId)}
                  className="flex items-center gap-1 text-[10px] font-bold text-[#4C9A5A] bg-[#E9F3E9] px-2 py-1 rounded-md"
                >
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Filter
                </button>
              </div>

              {cf.show && (
                <div className="bg-[#F6F2E9]/70 rounded-xl p-3 mb-3 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-[#1F2A22]/50 uppercase tracking-wide mb-1">From</label>
                      <input
                        type="date"
                        value={cf.from}
                        onChange={(e) => updateCardState(s.userId, { from: e.target.value })}
                        className="w-full bg-white border border-black/[0.08] rounded-lg px-2 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-[#1F2A22]/50 uppercase tracking-wide mb-1">To</label>
                      <input
                        type="date"
                        value={cf.to}
                        onChange={(e) => updateCardState(s.userId, { to: e.target.value })}
                        className="w-full bg-white border border-black/[0.08] rounded-lg px-2 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => clearCardFilter(s.userId)}
                      className="flex-1 bg-white border border-black/[0.08] text-[#1F2A22]/60 rounded-lg py-1.5 text-[11px] font-bold"
                    >
                      Show All
                    </button>
                    <button
                      type="button"
                      onClick={() => applyCardFilter(s.userId)}
                      disabled={cf.loading || (!cf.from && !cf.to)}
                      className="flex-[1.5] bg-[#4C9A5A] text-white rounded-lg py-1.5 text-[11px] font-bold disabled:opacity-50"
                    >
                      {cf.loading ? "Applying..." : "Apply"}
                    </button>
                  </div>
                  {cf.error && (
                    <p className="text-[#C24949] text-[11px] font-semibold">{cf.error}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-[#F6F2E9] rounded-xl py-2.5">
                  <p className="text-lg font-bold text-[#1F2A22]">{displayTotals.totalEntries}</p>
                  <p className="text-[10px] text-[#8A968C] uppercase tracking-wide">Entries</p>
                </div>
                <div className="bg-[#F6F2E9] rounded-xl py-2.5">
                  <p className="text-lg font-bold text-[#1F2A22]">{truncateTo2(displayTotals.totalAcres)}</p>
                  <p className="text-[10px] text-[#8A968C] uppercase tracking-wide">Acres</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}