import { useState, useEffect, useRef, useMemo } from "react";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";
import PaymentForm from "./PaymentForm";
import ServiceEditForm from "./ServiceEditForm";
import PaymentHistoryList from "./PaymentHistoryList";
import { deleteService, updateService } from "../../api/serviceApi";
import { useAuth } from "../../hooks/useAuth";
import EmptyState from "../common/EmptyState";
import MathCaptchaModal from "../common/MathCaptchaModal";

export default function FarmerHistoryTable({
  services = [],
  farmer,
  onPaymentRecorded,
  onServiceUpdated,
  onServiceDeleted,
  highlightedServiceId,
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [payingService, setPayingService] = useState(null);
  const [editingService, setEditingService] = useState(null);
  const [deletingService, setDeletingService] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Inline "quick add Bill No." — lets you add a missing bill number
  // right from the service card without opening the full Edit form.
  const [billNoEditingId, setBillNoEditingId] = useState(null);
  const [billNoDraft, setBillNoDraft] = useState("");
  const [billNoError, setBillNoError] = useState(null);
  const [savingBillNo, setSavingBillNo] = useState(false);

  // Date filter (From / To) — filters which service cards are shown
  // below, purely display-side. Nothing else (totals elsewhere on the
  // page, payment/edit/delete logic) is affected since this only
  // narrows the local `filteredServices` list used for rendering.
  //
  // draftFrom/draftTo track what's typed into the calendar inputs;
  // filterFrom/filterTo (the values actually used to filter) only
  // update when "Apply" is pressed — so nothing filters mid-pick.
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  // Search — filters service cards by Bill No. or Crop Name only, purely
  // display-side, same pattern as the date filter (just narrows the local
  // `filteredServices` list used for rendering; nothing else touched).
  // Collapsed behind a button, same as the date filter below.
  const [showSearch, setShowSearch] = useState(false);
  const [draftSearch, setDraftSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Refs to each service card, used only to scroll the recently-updated
  // card into view — no other logic touched.
  const cardRefs = useRef({});

  useEffect(() => {
    if (!highlightedServiceId) return;
    const node = cardRefs.current[highlightedServiceId];
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightedServiceId]);

  const startAddBillNo = (service) => {
    setBillNoEditingId(service._id);
    setBillNoDraft("");
    setBillNoError(null);
  };

  const cancelAddBillNo = () => {
    setBillNoEditingId(null);
    setBillNoDraft("");
    setBillNoError(null);
  };

  const handleSaveBillNo = async (service) => {
    if (!billNoDraft.trim()) {
      setBillNoError("Enter a bill number");
      return;
    }
    setBillNoError(null);
    setSavingBillNo(true);
    try {
      const fd = new FormData();
      fd.append("billNo", billNoDraft.trim());
      fd.append("cropName", service.cropName || "");
      fd.append("serviceType", service.serviceType || "");
      fd.append("kshetra", service.kshetra || "");
      if (service.acres != null) fd.append("acres", service.acres);
      if (service.plotName) fd.append("plotName", service.plotName);
      fd.append("ratePerAcre", service.ratePerAcre || 0);
      fd.append("totalBill", service.totalBill || 0);
      if (service.notes) fd.append("notes", service.notes);

      const res = await updateService(service._id, fd);

      // No more full page reload — just update this one service in place
      // (small inline spinner only, shown on the Save button below) and
      // let the parent move it to the top of the list, same as any other
      // edit/payment update.
      setBillNoEditingId(null);
      setBillNoDraft("");
      setSavingBillNo(false);

      if (onServiceUpdated) {
        onServiceUpdated(res.data.service);
      }
    } catch (err) {
      setBillNoError(err.response?.data?.message || "Failed to save bill number");
      setSavingBillNo(false);
    }
  };

  const statusStyles = {
    Paid: "text-[#4C9A5A] bg-[#E9F3E9] border-[#4C9A5A]/20",
    "Partially Paid": "text-[#D97706] bg-[#FEF3C7] border-[#FDE68A]",
    Unpaid: "text-[#C24949] bg-[#FCEDED] border-[#F3C6C6]",
  };

  const handleDeleteConfirmed = async () => {
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      await deleteService(deletingService._id);
      // No more full page reload — remove it from the list in place.
      // Totals/summary on the parent page recompute automatically since
      // they're derived from the services array.
      if (onServiceDeleted) {
        onServiceDeleted(deletingService._id);
      }
      setDeletingService(null);
      setDeleteLoading(false);
    } catch (err) {
      setDeleteError(err.response?.data?.message || "Failed to delete service");
      setDeletingService(null);
      setDeleteLoading(false);
    }
  };

  // Applies the optional From/To filter, then the optional search query,
  // on top of the services list. Empty from/to means "no restriction",
  // same pattern as the PDF date filters elsewhere in the app. Search
  // matches Bill No. or Crop Name only, case-insensitive.
  const filteredServices = useMemo(() => {
    let result = services;

    if (filterFrom || filterTo) {
      result = result.filter((s) => {
        const d = new Date(s.serviceDate);
        if (filterFrom && d < new Date(filterFrom)) return false;
        if (filterTo && d > new Date(filterTo + "T23:59:59")) return false;
        return true;
      });
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((s) => {
        const bill = (s.billNo || "").toLowerCase();
        const crop = (s.cropName || "").toLowerCase();
        return bill.includes(q) || crop.includes(q);
      });
    }

    return result;
  }, [services, filterFrom, filterTo, searchQuery]);

  const applyDateFilter = () => {
    setFilterFrom(draftFrom);
    setFilterTo(draftTo);
  };

  const clearDateFilter = () => {
    setDraftFrom("");
    setDraftTo("");
    setFilterFrom("");
    setFilterTo("");
  };

  const applySearch = () => {
    setSearchQuery(draftSearch);
  };

  const clearSearch = () => {
    setDraftSearch("");
    setSearchQuery("");
  };

  // Payment Form
  if (payingService) {
    return (
      <div className="animate-in fade-in zoom-in-95 duration-200">
        <PaymentForm
          service={payingService}
          farmer={farmer}
          onCancel={() => setPayingService(null)}
          onSuccess={(updatedService) => {
            setPayingService(null);
            if (onPaymentRecorded) {
              onPaymentRecorded(updatedService);
            }
          }}
        />
      </div>
    );
  }

  // Edit Service Form
  if (editingService) {
    return (
      <div className="animate-in fade-in zoom-in-95 duration-200">
        <ServiceEditForm
          service={editingService}
          onCancel={() => setEditingService(null)}
          onSuccess={(updatedService) => {
            setEditingService(null);
            if (onServiceUpdated) {
              onServiceUpdated(updatedService);
            }
          }}
        />
      </div>
    );
  }

  // Empty Service History
  if (services.length === 0) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-black/[0.04] p-8 animate-in fade-in duration-300">
        <EmptyState
          icon="🧾"
          title="No service records yet"
          subtitle="Add a service to start this farmer's history"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* SEARCH — collapsible, same pattern as the date filter below.
          Filters cards by Bill No. or Crop Name only. Purely
          display-side; nothing else (totals, payment/edit/delete) is
          affected. */}
      <div className="bg-white rounded-2xl shadow-sm border border-black/[0.04] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSearch((prev) => !prev)}
          className="w-full flex items-center justify-between px-4 py-3"
        >
          <span className="flex items-center gap-2 text-[13px] font-bold text-[#1F2A22]">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#1F2A22]/40" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
            </svg>
            Search Bill No. / Crop
          </span>
          <svg
            viewBox="0 0 24 24"
            className={`h-3.5 w-3.5 text-[#1F2A22]/40 transition-transform ${showSearch ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showSearch && (
          <div className="px-4 pb-4 space-y-2.5">
            <input
              type="text"
              autoFocus
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applySearch();
              }}
              placeholder="Bill No. or Crop Name"
              className="w-full bg-[#F6F2E9] border border-black/[0.06] rounded-lg px-2.5 py-2 text-[13px]"
            />
            <button
              type="button"
              onClick={applySearch}
              disabled={!draftSearch}
              className="w-full bg-[#2B5439] text-white rounded-lg py-2 text-[12px] font-bold disabled:opacity-40"
            >
              Search
            </button>
          </div>
        )}

        {/* Inline "Applied: query" summary — only shown once a search is
            actually applied, with its own Clear button, independent of
            whether the panel above is expanded or collapsed. */}
        {searchQuery && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#E9F3E9] border-t border-[#4C9A5A]/15">
            <span className="text-[11px] font-bold text-[#2B5439] truncate pr-2">
              Searching: "{searchQuery}"
            </span>
            <button
              type="button"
              onClick={clearSearch}
              className="text-[11px] font-bold text-[#C24949] uppercase tracking-wide shrink-0"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* DATE FILTER — collapsible From/To calendar filter, with a small
          inline "Applied: X to Y" summary + Clear button once a range is
          set. Purely narrows which cards render below; nothing else is
          affected. */}
      <div className="bg-white rounded-2xl shadow-sm border border-black/[0.04] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowDateFilter((prev) => !prev)}
          className="w-full flex items-center justify-between px-4 py-3"
        >
          <span className="flex items-center gap-2 text-[13px] font-bold text-[#1F2A22]">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#1F2A22]/40" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Filter by Date
          </span>
          <svg
            viewBox="0 0 24 24"
            className={`h-3.5 w-3.5 text-[#1F2A22]/40 transition-transform ${showDateFilter ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDateFilter && (
          <div className="px-4 pb-4 space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-[#1F2A22]/50 uppercase tracking-wide mb-1">From</label>
                <input
                  type="date"
                  value={draftFrom}
                  max={draftTo || undefined}
                  onChange={(e) => setDraftFrom(e.target.value)}
                  className="w-full bg-[#F6F2E9] border border-black/[0.06] rounded-lg px-2.5 py-2 text-[13px]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#1F2A22]/50 uppercase tracking-wide mb-1">To</label>
                <input
                  type="date"
                  value={draftTo}
                  min={draftFrom || undefined}
                  onChange={(e) => setDraftTo(e.target.value)}
                  className="w-full bg-[#F6F2E9] border border-black/[0.06] rounded-lg px-2.5 py-2 text-[13px]"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={applyDateFilter}
              disabled={!draftFrom && !draftTo}
              className="w-full bg-[#2B5439] text-white rounded-lg py-2 text-[12px] font-bold disabled:opacity-40"
            >
              Apply
            </button>
          </div>
        )}

        {/* Inline "Applied: X to Y" summary — only shown once a filter is
            actually set, with its own Clear button, independent of
            whether the picker above is expanded or collapsed. */}
        {(filterFrom || filterTo) && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#E9F3E9] border-t border-[#4C9A5A]/15">
            <span className="text-[11px] font-bold text-[#2B5439]">
              Applied: {filterFrom ? new Date(filterFrom).toLocaleDateString("en-IN") : "…"} →{" "}
              {filterTo ? new Date(filterTo).toLocaleDateString("en-IN") : "…"}
            </span>
            <button
              type="button"
              onClick={clearDateFilter}
              className="text-[11px] font-bold text-[#C24949] uppercase tracking-wide"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Delete Error */}
      {deleteError && (
        <div className="p-3.5 bg-[#FCEDED] border border-[#C24949]/20 rounded-xl flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#C24949] shrink-0 mt-0.5" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p className="text-[#C24949] text-[13px] font-medium leading-tight">{deleteError}</p>
        </div>
      )}

      {/* Empty state for when a filter is applied but matches nothing —
          the services.length === 0 check above only covers "no services
          at all", so this covers "filter narrowed it down to zero". */}
      {filteredServices.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-black/[0.04] p-8 animate-in fade-in duration-300">
          <EmptyState
            icon="🧾"
            title="No services in this range"
            subtitle="Try a different date range, or clear the filter"
          />
        </div>
      ) : (
      filteredServices.map((s, index) => {
        const createdById = typeof s.createdBy === "object" ? s.createdBy?._id : s.createdBy;
        const isOwner = createdById && user?._id && String(createdById) === String(user._id);
        const canEdit = isAdmin || isOwner;

        // Payment Progress
        const bill = Number(s.totalBill) || 0;
        const paid = Number(s.amountPaid) || 0;
        const paidPct = bill > 0 ? Math.min(100, Math.round((paid / bill) * 100)) : 0;

        return (
          <div
            key={s._id}
            ref={(el) => {
              cardRefs.current[s._id] = el;
            }}
            className={`bg-white rounded-[1.5rem] shadow-sm overflow-hidden animate-in slide-in-from-bottom-2 fade-in transition-all duration-500 ${
              highlightedServiceId === s._id
                ? "border-2 border-[#4C9A5A] ring-4 ring-[#4C9A5A]/15"
                : "border border-black/[0.04]"
            }`}
            style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}
          >
            {/* Top Header */}
            <div className="p-5 pb-4">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-[#F3E8F5] flex items-center justify-center text-[#8B4C9E] shadow-inner border border-[#8B4C9E]/10 shrink-0">
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                      <path d="M12 2c0 1.5-.8 2.3-1.6 3.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
                      <path d="M9 3.2c1.6-.3 3 .5 3.4 2-1.6.5-3-.3-3.4-2z" />
                      <circle cx="9.5" cy="7.5" r="1.7" />
                      <circle cx="13" cy="7.2" r="1.7" />
                      <circle cx="8" cy="10.8" r="1.7" />
                      <circle cx="11.5" cy="10.6" r="1.7" />
                      <circle cx="15" cy="10.5" r="1.7" />
                      <circle cx="9.7" cy="14" r="1.7" />
                      <circle cx="13.2" cy="14" r="1.7" />
                      <circle cx="11.5" cy="17.2" r="1.7" />
                    </svg>
                  </div>

                  <div>
                    <h3 className="font-bold text-[#1F2A22] text-[16px] leading-tight mb-0.5">{s.cropName}</h3>
                    <p className="text-[13px] font-medium text-[#4C9A5A]">{s.serviceType}</p>
                  </div>
                </div>

                <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-lg border ${statusStyles[s.paymentStatus] || ""}`}>
                  {s.paymentStatus}
                </span>
              </div>

              {/* Meta Data */}
              <div className="flex flex-wrap gap-2 text-[12px] font-medium text-[#1F2A22]/50">
                {/* Date */}
                <span className="flex items-center gap-1 bg-[#F6F2E9] px-2 py-1 rounded-md">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatDate(s.serviceDate)}
                </span>

                {/* Village */}
                <span className="flex items-center gap-1 bg-[#F6F2E9] px-2 py-1 rounded-md">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {s.village}
                  {s.plotName ? ` • ${s.plotName}` : ""}
                </span>

                {/* Bill No — modernized red pill with integrated + Add button when missing */}
                {s.billNo ? (
                  <span className="flex items-center gap-1 bg-[#F6F2E9] px-2 py-1 rounded-md">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m-6 4h6m-6 4h4M5 3h14a1 1 0 011 1v16l-3-2-3 2-3-2-3 2-3-2-3 2V4a1 1 0 011-1z" />
                    </svg>
                    Bill: {s.billNo}
                  </span>
                ) : billNoEditingId === s._id ? (
                  <span className="flex items-center gap-1.5 bg-[#FCEDED] border border-[#F3C6C6] px-2 py-1.5 rounded-md">
                    <input
                      type="text"
                      autoFocus
                      value={billNoDraft}
                      onChange={(e) => setBillNoDraft(e.target.value)}
                      placeholder="Bill no."
                      className="w-24 bg-white border border-black/[0.08] rounded-lg px-2 py-1 text-[12px] font-medium text-[#1F2A22] focus:outline-none focus:ring-2 focus:ring-[#4C9A5A]/20"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveBillNo(s)}
                      disabled={savingBillNo}
                      className="flex items-center gap-1 text-[11px] font-bold text-white bg-[#4C9A5A] rounded-lg px-2 py-1 disabled:opacity-70"
                    >
                      {savingBillNo ? (
                        <>
                          <svg viewBox="0 0 24 24" className="h-3 w-3 animate-spin" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Saving
                        </>
                      ) : (
                        "Save"
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={cancelAddBillNo}
                      disabled={savingBillNo}
                      className="text-[11px] font-bold text-[#1F2A22]/50"
                    >
                      Cancel
                    </button>
                    {billNoError && (
                      <span className="text-[10px] font-semibold text-[#C24949]">{billNoError}</span>
                    )}
                  </span>
                ) : (
                  <span className="inline-flex items-stretch rounded-md border border-[#F3C6C6] overflow-hidden shadow-sm">
                    <span className="flex items-center gap-1 bg-[#FCEDED] text-[#C24949] px-2 py-1">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
                      </svg>
                      No Bill
                    </span>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => startAddBillNo(s)}
                        className="flex items-center gap-0.5 bg-[#C24949] text-white px-2 py-1 text-[11px] font-bold active:bg-[#A83D3D] transition-colors"
                      >
                        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                        </svg>
                        Add
                      </button>
                    )}
                  </span>
                )}

                {/* Kshetra */}
                {s.kshetra && (
                  <span className="flex items-center gap-1 bg-[#F6F2E9] px-2 py-1 rounded-md">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    {s.kshetra}
                  </span>
                )}

                {/* Acres */}
                <span className="flex items-center gap-1 bg-[#F6F2E9] px-2 py-1 rounded-md">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  {s.acres} ac
                </span>

                {/* Created By */}
                {s.createdBy?.name && (
                  <span className="flex items-center gap-1 bg-[#F6F2E9] px-2 py-1 rounded-md">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Added by {s.createdBy.name}
                  </span>
                )}
              </div>
            </div>

            {/* Financial Section — hidden entirely from staff, admin-only */}
            {isAdmin && (
            <div className="bg-[#F6F2E9]/40 border-t border-black/[0.04] p-5">
              <div className="mb-4">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-[11px] font-bold text-[#1F2A22]/40 uppercase tracking-wide">Bill Total</span>
                  <span className="text-[20px] font-black text-[#1F2A22] tracking-tight">{formatCurrency(s.totalBill)}</span>
                </div>

                {/* Paid Progress Bar */}
                <div className="h-2 w-full bg-black/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${paidPct}%`,
                      backgroundImage: "linear-gradient(90deg, #4C9A5A 0%, #3B7A46 100%)",
                    }}
                  />
                </div>

                <div className="flex justify-between items-center mt-2.5">
                  {/* Paid */}
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#4C9A5A]" />
                    <span className="text-[12px] font-semibold text-[#1F2A22]/60">
                      Paid <span className="text-[#4C9A5A] font-bold">{formatCurrency(s.amountPaid)}</span>
                    </span>
                  </div>

                  {/* Pending */}
                  {Number(s.pendingAmount) > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#C24949]" />
                      <span className="text-[12px] font-semibold text-[#1F2A22]/60">
                        Pending <span className="text-[#C24949] font-bold">{formatCurrency(s.pendingAmount)}</span>
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] font-bold text-[#4C9A5A] bg-[#E9F3E9] px-2 py-0.5 rounded-md">Fully Paid</span>
                  )}
                </div>
              </div>

              {/* Receipt and Payment Buttons */}
              <div className="flex items-center gap-2 pt-2">
                {s.billImage && (
                  <a
                    href={s.billImage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex justify-center items-center gap-1.5 py-2.5 bg-white border border-black/10 rounded-xl text-[12px] font-bold text-[#1F2A22]/70 active:bg-gray-50 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    Receipt
                  </a>
                )}

                {Number(s.pendingAmount) > 0 && (
                  <button
                    type="button"
                    onClick={() => setPayingService(s)}
                    className="flex-[2] py-2.5 text-white rounded-xl font-bold text-[13px] shadow-sm active:scale-[0.98] transition-all flex justify-center items-center"
                    style={{ backgroundImage: "linear-gradient(180deg, #4C9A5A 0%, #3B7A46 100%)" }}
                  >
                    Collect Payment
                  </button>
                )}
              </div>

              {/* Payment History */}
              <PaymentHistoryList serviceId={s._id} />

              {/* Edit / Delete */}
              {canEdit && (
                <div className="flex justify-end gap-4 mt-4 pt-3 border-t border-black/5">
                  {/* Edit */}
                  <button
                    type="button"
                    onClick={() => setEditingService(s)}
                    className="text-[12px] font-bold text-[#1F3D2B]/60 hover:text-[#1F3D2B] transition-colors uppercase tracking-wide flex items-center gap-1"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit
                  </button>

                  {/* Delete */}
                  {isAdmin && Number(s.amountPaid) === 0 && (
                    <button
                      type="button"
                      onClick={() => setDeletingService(s)}
                      className="text-[12px] font-bold text-[#C24949]/70 hover:text-[#C24949] transition-colors uppercase tracking-wide flex items-center gap-1"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
            )}

            {/* Edit-only button for staff who own the service — shown when financial section is hidden */}
            {!isAdmin && canEdit && (
              <div className="border-t border-black/[0.04] px-5 py-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setEditingService(s)}
                  className="text-[12px] font-bold text-[#1F3D2B]/60 hover:text-[#1F3D2B] transition-colors uppercase tracking-wide flex items-center gap-1"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit
                </button>
              </div>
            )}
          </div>
        );
      })
      )}

      {deletingService && (
        <MathCaptchaModal
          title="Delete this service record?"
          message={`This will permanently delete the ${deletingService.cropName} service record and cannot be undone.`}
          onCancel={() => setDeletingService(null)}
          onConfirm={handleDeleteConfirmed}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}