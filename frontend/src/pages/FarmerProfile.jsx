import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getFarmerProfile, deleteFarmer } from "../api/farmerApi";
import { getServicesByFarmer } from "../api/serviceApi";
import FarmerHistoryTable from "../components/payments/FarmerHistoryTable";
import FarmerForm from "../components/farmers/FarmerForm";
import { useAuth } from "../hooks/useAuth";
import Spinner from "../components/common/Spinner";
import { formatCurrency } from "../utils/formatCurrency";
import SettleAllModal from "../components/payments/SettleAllModal";
import BulkPaymentModal from "../components/payments/BulkPaymentModal";
import ReminderButton from "../components/payments/ReminderButton";

export default function FarmerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [farmer, setFarmer] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Tracks which service card was just changed (payment, edit, bill no.
  // added) so it can be briefly highlighted and scrolled into view —
  // purely visual, doesn't affect data or ordering.
  const [highlightedServiceId, setHighlightedServiceId] = useState(null);

  // Acres date-range filter — only affects the Acres Summary numbers.
  // Defaults to unfiltered (shows totals across ALL services). Only
  // switches to a filtered view once the user explicitly applies a range.
  const [showAcresFilter, setShowAcresFilter] = useState(false);
  const [acresFrom, setAcresFrom] = useState("");
  const [acresTo, setAcresTo] = useState("");
  const [appliedAcresFrom, setAppliedAcresFrom] = useState("");
  const [appliedAcresTo, setAppliedAcresTo] = useState("");
  const [applyingAcresFilter, setApplyingAcresFilter] = useState(false);
  const isAcresFilterActive = Boolean(appliedAcresFrom || appliedAcresTo);

  const loadData = async () => {
    try {
      const [farmerRes, servicesRes] = await Promise.all([
        getFarmerProfile(id),
        getServicesByFarmer(id),
      ]);

      setFarmer(farmerRes.data);
      setServices(servicesRes.data.services);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load farmer");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Updates service(s) in place — no reordering here. Display order is
  // controlled purely by serviceDate (see sortedServices below), so an
  // action like adding a bill no., editing, or collecting payment never
  // moves a card. It only moves if its actual service date is the newest.
  // The updated card is also briefly highlighted and scrolled into view
  // so there's no need to hunt for it in the list.
  const updateServicesInPlace = (updated) => {
    const updatedList = Array.isArray(updated) ? updated : [updated];
    const updatedById = new Map(updatedList.map((u) => [u._id, u]));
    setServices((prev) => prev.map((s) => updatedById.get(s._id) || s));

    if (updatedList.length > 0) {
      const targetId = updatedList[0]._id;
      setHighlightedServiceId(targetId);
      setTimeout(() => {
        setHighlightedServiceId((current) => (current === targetId ? null : current));
      }, 2000);
    }
  };

  const handlePaymentRecorded = (updatedService) => {
    updateServicesInPlace(updatedService);
  };

  const handleServiceUpdated = (updatedService) => {
    updateServicesInPlace(updatedService);
  };

  const handleServiceDeleted = (deletedId) => {
    setServices((prev) => prev.filter((s) => s._id !== deletedId));
  };

  const handleDeleteFarmer = async () => {
    if (!window.confirm(`Delete ${farmer.fullName}? This cannot be undone.`)) return;
    setDeleteError(null);
    try {
      await deleteFarmer(id);
      navigate("/farmers");
    } catch (err) {
      setDeleteError(err.response?.data?.message || "Failed to delete farmer");
    }
  };

  const handleSettledAll = (updatedServices) => {
    updateServicesInPlace(updatedServices);
    setShowSettleModal(false);
  };

  const handleBulkPaid = (updatedServices) => {
    updateServicesInPlace(updatedServices);
  };

  const handleApplyAcresFilter = () => {
    setApplyingAcresFilter(true);
    // Brief delay purely so the user gets visible feedback that the filter
    // was actually applied — the calculation itself is instant client-side.
    setTimeout(() => {
      setAppliedAcresFrom(acresFrom);
      setAppliedAcresTo(acresTo);
      setApplyingAcresFilter(false);
    }, 350);
  };

  const handleClearAcresFilter = () => {
    setAcresFrom("");
    setAcresTo("");
    setAppliedAcresFrom("");
    setAppliedAcresTo("");
    setShowAcresFilter(false);
  };

  if (loading) {
    return <Spinner label="Loading farmer..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F2E9] px-6">
        <div className="max-w-sm w-full bg-white/50 backdrop-blur-sm rounded-3xl border border-[#F3C6C6]/50 shadow-sm p-8 text-center flex flex-col items-center">
          <div className="h-16 w-16 rounded-2xl bg-[#FCEDED] border border-[#F3C6C6] flex items-center justify-center mb-4 shadow-inner">
            <svg viewBox="0 0 24 24" className="h-8 w-8 text-[#C24949]" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
              <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>

          <h3 className="text-[#C24949] text-base font-semibold mb-1">Unable to load</h3>
          <p className="text-[#C24949]/80 text-sm font-medium">{error}</p>

          <button
            onClick={() => navigate("/farmers")}
            className="mt-6 text-[#1F3D2B] bg-[#F6F2E9] px-4 py-2 rounded-xl text-sm font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="min-h-screen bg-[#F6F2E9] pb-24 font-sans selection:bg-[#4C9A5A]/20">
        <div className="relative px-6 pt-10 pb-16 overflow-hidden rounded-b-[2rem] shadow-sm bg-gradient-to-b from-[#1F3D2B] to-[#234730]">
          <div className="relative z-10">
            <h1 className="text-xl font-bold text-white tracking-tight">Edit Farmer</h1>
            <p className="text-[#B9D9BE] text-sm mt-1">Update profile details</p>
          </div>
        </div>

        <div className="px-5 -mt-8 relative z-10 max-w-md mx-auto">
          <div className="bg-white rounded-3xl shadow-sm border border-black/[0.04] p-5">
            <FarmerForm
              existingFarmer={farmer}
              onSuccess={(updated) => {
                setFarmer(updated);
                setEditing(false);
              }}
              onCancel={() => setEditing(false)}
            />
          </div>
        </div>
      </div>
    );
  }

  const initials = farmer?.fullName
    ? farmer.fullName.trim().split(/\s+/).slice(0, 2).map((n) => n[0]).join("").toUpperCase()
    : "F";

  // FARMER FINANCIAL SUMMARY — always across ALL services, unaffected by the acres filter
  const totalBill = services.reduce((sum, service) => sum + Number(service.totalBill || 0), 0);
  const totalCollected = services.reduce((sum, service) => sum + Number(service.amountPaid || 0), 0);
  const totalPending = services.reduce((sum, service) => sum + Number(service.pendingAmount || 0), 0);

  // ACRES SUMMARY — filtered by service date range if a filter is applied,
  // otherwise shows totals across every service (the permanent default view).
  const acresSourceServices = isAcresFilterActive
    ? services.filter((service) => {
        const d = new Date(service.serviceDate);
        if (appliedAcresFrom && d < new Date(appliedAcresFrom)) return false;
        if (appliedAcresTo) {
          const toEnd = new Date(appliedAcresTo);
          toEnd.setHours(23, 59, 59, 999);
          if (d > toEnd) return false;
        }
        return true;
      })
    : services;

  const totalAcres = acresSourceServices.reduce((sum, service) => sum + Number(service.acres || 0), 0);

  // Pending Acres is PRORATED by how much of each service's bill is still
  // unpaid — not all-or-nothing. A service that's 50% paid only contributes
  // 50% of its acres here. Since this reads service.pendingAmount/totalBill
  // directly from `services` state, it recalculates automatically the
  // moment a bulk or settle-all payment updates those services — including
  // partial payments across multiple services at once.
  const pendingAcres = acresSourceServices.reduce((sum, service) => {
    const bill = Number(service.totalBill || 0);
    const pending = Number(service.pendingAmount || 0);
    const acres = Number(service.acres || 0);
    if (bill <= 0 || pending <= 0) return sum;
    const unpaidRatio = Math.min(pending / bill, 1);
    return sum + acres * unpaidRatio;
  }, 0);

  // Display order for Service History — sorted purely by serviceDate,
  // newest first / oldest last. This is recalculated from `services`
  // every render, so it stays correct no matter what action (add bill no,
  // edit, payment, delete) triggered the update — the order only changes
  // when a service's actual date changes or a new one is added.
  const sortedServices = [...services].sort(
    (a, b) => new Date(b.serviceDate) - new Date(a.serviceDate)
  );

  return (
    <div className="min-h-screen bg-[#F6F2E9] pb-24 font-sans selection:bg-[#4C9A5A]/20">
      {/* Mobile App Header */}
      <div
        className="relative px-6 pt-10 pb-20 overflow-hidden rounded-b-[2.5rem] shadow-sm"
        style={{ backgroundImage: "linear-gradient(180deg, #1F3D2B 0%, #234730 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay"
          style={{ backgroundImage: "repeating-linear-gradient(115deg, #ffffff 0px, #ffffff 1px, transparent 1px, transparent 14px)" }}
        />

        <div className="relative z-10">
          <button
            onClick={() => navigate("/farmers")}
            className="flex items-center gap-1.5 text-xs font-semibold text-white/90 bg-white/5 border border-white/10 rounded-xl px-3 py-2 mb-4 hover:bg-white/10 active:scale-95 transition-all duration-200 backdrop-blur-sm w-max"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Farmers List
          </button>
        </div>
      </div>

      <div className="px-5 -mt-16 relative z-10 max-w-md mx-auto space-y-4">
        {/* Profile Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-black/[0.04] p-5">
          <div className="flex justify-between items-start mb-4">
            <div className="flex gap-4 items-center">
              <div className="h-14 w-14 rounded-2xl bg-[#E9F3E9] text-[#2B5439] flex items-center justify-center text-lg font-bold shadow-inner border border-[#4C9A5A]/10 shrink-0">
                {initials}
              </div>

              <div>
                <h1 className="text-xl font-bold text-[#1F2A22] leading-tight mb-1">{farmer.fullName}</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#F6F2E9] text-[#1F3D2B]/70 text-[11px] font-bold uppercase tracking-widest border border-[#1F3D2B]/5">
                  {farmer.farmerCode}
                </span>
              </div>
            </div>

            {isAdmin && (
              <button
                onClick={() => setEditing(true)}
                className="p-2 text-[#1F3D2B]/50 hover:text-[#1F3D2B] bg-[#F6F2E9]/50 hover:bg-[#F6F2E9] rounded-xl transition-all"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>

          {/* Farmer Information */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-[#F6F2E9]/50 rounded-xl p-3 border border-[#1F3D2B]/5">
              <p className="text-[10px] uppercase font-bold text-[#1F2A22]/50 tracking-wider mb-1">Village</p>
              <p className="text-sm font-semibold text-[#1F2A22] truncate">{farmer.village}</p>
            </div>

            <div className="bg-[#F6F2E9]/50 rounded-xl p-3 border border-[#1F3D2B]/5">
              <p className="text-[10px] uppercase font-bold text-[#1F2A22]/50 tracking-wider mb-1">Mobile</p>
              <p className="text-sm font-semibold text-[#1F2A22]">{farmer.mobile}</p>
            </div>

            {farmer.altMobile && (
              <div className="bg-[#F6F2E9]/50 rounded-xl p-3 border border-[#1F3D2B]/5 col-span-2">
                <p className="text-[10px] uppercase font-bold text-[#1F2A22]/50 tracking-wider mb-1">Alt Mobile</p>
                <p className="text-sm font-semibold text-[#1F2A22]">{farmer.altMobile}</p>
              </div>
            )}
          </div>

          {/* Acres Summary — admin only. Includes a date-range filter that
              only changes the numbers when explicitly applied; otherwise
              shows totals across every service, as before. */}
          {isAdmin && (
          <div className="pt-4 border-t border-black/[0.05]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] uppercase font-bold text-[#1F2A22]/40 tracking-widest">
                Acres Summary
              </p>
              <button
                type="button"
                onClick={() => setShowAcresFilter((v) => !v)}
                className="flex items-center gap-1 text-[10.5px] font-bold text-[#4C9A5A] bg-[#E9F3E9] px-2.5 py-1 rounded-full active:scale-95 transition-transform"
              >
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Filter by Date
              </button>
            </div>

            {isAcresFilterActive && (
              <div className="flex items-center gap-2 mb-3 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex-1 flex items-center gap-2 bg-gradient-to-r from-[#E9F3E9] to-[#E9F3E9]/60 border border-[#4C9A5A]/20 rounded-xl px-3 py-2 min-w-0">
                  <span className="h-6 w-6 shrink-0 rounded-lg bg-[#4C9A5A] text-white flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold text-[#4C9A5A]/70 uppercase tracking-wide leading-none mb-0.5">
                      Filter Applied
                    </p>
                    <p className="text-[12px] font-bold text-[#2B5439] truncate leading-tight">
                      {appliedAcresFrom
                        ? new Date(appliedAcresFrom).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                        : "Start"}
                      {" – "}
                      {appliedAcresTo
                        ? new Date(appliedAcresTo).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                        : "Today"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearAcresFilter}
                  aria-label="Clear filter"
                  className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl bg-white border border-[#4C9A5A]/20 text-[#4C9A5A] hover:bg-[#FCEDED] hover:text-[#C24949] hover:border-[#F3C6C6] active:scale-95 transition-all"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            )}

            {showAcresFilter && (
              <div className="bg-[#F6F2E9]/70 rounded-2xl p-3.5 mb-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-[#1F2A22]/50 uppercase tracking-wide mb-1">From</label>
                    <input
                      type="date"
                      name="acresFrom"
                      value={acresFrom}
                      onChange={(e) => setAcresFrom(e.target.value)}
                      className="w-full bg-white border border-black/[0.08] rounded-lg px-2.5 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#1F2A22]/50 uppercase tracking-wide mb-1">To</label>
                    <input
                      type="date"
                      name="acresTo"
                      value={acresTo}
                      onChange={(e) => setAcresTo(e.target.value)}
                      className="w-full bg-white border border-black/[0.08] rounded-lg px-2.5 py-2 text-xs"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleClearAcresFilter}
                    disabled={applyingAcresFilter}
                    className="flex-1 bg-white border border-black/[0.08] text-[#1F2A22]/60 rounded-lg py-2 text-xs font-bold disabled:opacity-50"
                  >
                    Show All
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyAcresFilter}
                    disabled={(!acresFrom && !acresTo) || applyingAcresFilter}
                    className="flex-[1.5] bg-[#4C9A5A] text-white rounded-lg py-2 text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {applyingAcresFilter ? (
                      <>
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 animate-spin" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3.5" />
                          <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Applying...
                      </>
                    ) : (
                      "Apply"
                    )}
                  </button>
                </div>
              </div>
            )}

            <div
              key={`${appliedAcresFrom}-${appliedAcresTo}`}
              className="grid grid-cols-2 gap-2 animate-in fade-in duration-300"
            >
              <div className="bg-[#F6F2E9]/70 rounded-xl p-3 border border-black/[0.04]">
                <p className="text-[9px] uppercase font-bold text-[#1F2A22]/45 tracking-wide mb-1">Total Acres</p>
                <p className="text-sm font-black text-[#1F2A22] break-words">{totalAcres.toFixed(2)}</p>
              </div>
              <div className="bg-[#FEF3C7]/50 rounded-xl p-3 border border-[#D97706]/10">
                <p className="text-[9px] uppercase font-bold text-[#D97706]/70 tracking-wide mb-1">Pending Acres</p>
                <p className="text-sm font-black text-[#D97706] break-words">{pendingAcres.toFixed(2)}</p>
              </div>
            </div>
          </div>
          )}

          {/* Financial Summary — admin only */}
          {isAdmin && (
          <div className="pt-4 mt-4 border-t border-black/[0.05]">
            <p className="text-[10px] uppercase font-bold text-[#1F2A22]/40 tracking-widest mb-3">Payment Summary</p>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#F6F2E9]/70 rounded-xl p-3 border border-black/[0.04]">
                <p className="text-[9px] uppercase font-bold text-[#1F2A22]/45 tracking-wide mb-1">Total Bill</p>
                <p className="text-sm font-black text-[#1F2A22] break-words">{formatCurrency(totalBill)}</p>
              </div>

              <div className="bg-[#E9F3E9]/70 rounded-xl p-3 border border-[#4C9A5A]/10">
                <p className="text-[9px] uppercase font-bold text-[#4C9A5A]/70 tracking-wide mb-1">Collected</p>
                <p className="text-sm font-black text-[#4C9A5A] break-words">{formatCurrency(totalCollected)}</p>
              </div>

              <div className="bg-[#FEF3C7]/50 rounded-xl p-3 border border-[#D97706]/10">
                <p className="text-[9px] uppercase font-bold text-[#D97706]/70 tracking-wide mb-1">Pending</p>
                <p className="text-sm font-black text-[#D97706] break-words">{formatCurrency(totalPending)}</p>
              </div>
            </div>

            {/* Action buttons — modernized: smaller/compact, icon-led,
                softer pill shape, tuned for one-handed mobile use. Same
                conditions/handlers as before, only the markup changed. */}
            <div className="mt-3 space-y-2">
              {isAdmin && totalPending > 0 && (
                <button
                  onClick={() => setShowSettleModal(true)}
                  className="w-full flex items-center justify-center gap-1.5 bg-[#FEF3C7]/60 hover:bg-[#FEF3C7] active:scale-[0.98] border border-[#D97706]/20 text-[#B45309] rounded-xl py-2.5 text-[12.5px] font-bold transition-all"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Clear All Pending
                </button>
              )}

              {totalPending > 0 && (
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="w-full flex items-center justify-center gap-1.5 bg-[#E9F3E9]/70 hover:bg-[#E9F3E9] active:scale-[0.98] border border-[#4C9A5A]/20 text-[#2B5439] rounded-xl py-2.5 text-[12.5px] font-bold transition-all"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m-6 4h6m-6 4h4M5 3h14a1 1 0 011 1v16l-3-2-3 2-3-2-3 2-3-2-3 2V4a1 1 0 011-1z" />
                  </svg>
                  Record Payment (Multiple)
                </button>
              )}
            </div>

            <ReminderButton
              farmer={farmer}
              totals={{ totalBill, totalCollected, totalPending }}
            />
          </div>
          )}

          {deleteError && (
            <div className="bg-[#FCEDED] border border-[#F3C6C6] rounded-xl p-3 mt-4 flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#C24949] shrink-0" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <p className="text-[#C24949] text-xs font-semibold">{deleteError}</p>
            </div>
          )}

          {isAdmin && services.length === 0 && (
            <button
              onClick={handleDeleteFarmer}
              className="w-full mt-4 flex items-center justify-center gap-1.5 bg-[#FCEDED]/50 text-[#C24949] hover:bg-[#FCEDED] active:scale-[0.98] border border-[#F3C6C6]/50 rounded-xl py-2.5 text-[12.5px] font-bold transition-all"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Delete Farmer
            </button>
          )}
        </div>

        {/* Add New Service — modernized: shorter height, tighter padding
            and font size for mobile, same gradient family as the header
            for visual consistency, same onClick/navigation as before. */}
        <button
          onClick={() => navigate("/add-service", { state: { farmer } })}
          className="w-full flex items-center justify-center gap-2 text-white rounded-2xl py-3 text-[13.5px] font-bold shadow-sm active:scale-[0.98] transition-all"
          style={{ backgroundImage: "linear-gradient(180deg, #4C9A5A 0%, #3B7A46 100%)" }}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Add New Service
        </button>

        {/* Service History */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-lg font-bold text-[#1F2A22] tracking-tight">Service History</h2>
            {services.length > 0 && (
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#4C9A5A] bg-[#E9F3E9] rounded-lg px-2.5 py-1 shadow-sm border border-[#4C9A5A]/10">
                {services.length} Total
              </span>
            )}
          </div>

          <div className="bg-white rounded-[1.5rem] shadow-sm border border-black/[0.04] overflow-hidden">
            <FarmerHistoryTable
              services={sortedServices}
              farmer={farmer}
              onPaymentRecorded={handlePaymentRecorded}
              onServiceUpdated={handleServiceUpdated}
              onServiceDeleted={handleServiceDeleted}
              highlightedServiceId={highlightedServiceId}
            />
          </div>
        </div>
      </div>

      {showSettleModal && (
        <SettleAllModal
          farmerId={id}
          farmerName={farmer.fullName}
          totalPending={totalPending}
          onSuccess={handleSettledAll}
          onClose={() => setShowSettleModal(false)}
        />
      )}

      {showBulkModal && (
        <BulkPaymentModal
          farmerId={id}
          farmer={farmer}
          totalPending={totalPending}
          onSuccess={handleBulkPaid}
          onClose={() => setShowBulkModal(false)}
        />
      )}
    </div>
  );
}