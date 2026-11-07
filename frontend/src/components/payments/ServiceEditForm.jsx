import { useState, useEffect, useRef } from "react";
import { updateService } from "../../api/serviceApi";
import { getSettings, updateSettings } from "../../api/settingsApi";
import { CROPS, SERVICE_TYPES } from "../../constants/serviceOptions";
import { useAuth } from "../../hooks/useAuth";
import MathCaptchaModal from "../common/MathCaptchaModal";

// Turns the stored service date (an ISO string) into the YYYY-MM-DD text that
// <input type="date"> needs, using the phone's local date so it matches the
// date shown on the service card.
const toDateInputValue = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function ServiceEditForm({ service, onSuccess, onCancel }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const initialCropIsKnown = CROPS.includes(service.cropName);
  const initialServiceTypeIsKnown = SERVICE_TYPES.includes(service.serviceType);
  const initialR = service.acres ? String(Number(service.acres) * 40) : "";
  const originalBillNo = service.billNo || "";
  const originalAcres = service.acres != null ? String(service.acres) : "";
  const originalServiceDate = toDateInputValue(service.serviceDate);

  // Service date — editable. Starts on the date already saved for this service.
  const [serviceDate, setServiceDate] = useState(originalServiceDate);

  const [billNo, setBillNo] = useState(service.billNo || "");
  // "Bill No. available?" — same Yes / No choice as Add Service. Starts on
  // Yes when this service already has a bill number, otherwise on No. When
  // No, the bill number is not required and is saved empty.
  const [hasBillNo, setHasBillNo] = useState(Boolean(service.billNo));
  const [cropName, setCropName] = useState(initialCropIsKnown ? service.cropName : "Other");
  const [cropOther, setCropOther] = useState(initialCropIsKnown ? "" : service.cropName || "");
  const [serviceType, setServiceType] = useState(initialServiceTypeIsKnown ? service.serviceType : "Other");
  const [serviceTypeOther, setServiceTypeOther] = useState(initialServiceTypeIsKnown ? "" : service.serviceType || "");

  const [plotR, setPlotR] = useState(initialR);
  const [acres, setAcres] = useState(service.acres || "");
  const [areaInputSource, setAreaInputSource] = useState("R");
  const [plotName, setPlotName] = useState(service.plotName || "");

  const [ratePerAcre, setRatePerAcre] = useState(service.ratePerAcre || 0);
  const [editingRate, setEditingRate] = useState(false);
  const [newRate, setNewRate] = useState("");

  const [totalBill, setTotalBill] = useState(service.totalBill || "");
  const [notes, setNotes] = useState(service.notes || "");

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Bill-number series prefix (e.g. "A-") — same as Add Service. Admin sets
  // it once; typing only the digits (002) saves as "A-002". Remembered on
  // this device too, in case the server doesn't return it.
  const [billPrefix, setBillPrefix] = useState(() => {
    try {
      return localStorage.getItem("billPrefix") || "";
    } catch {
      return "";
    }
  });
  const [editingBillPrefix, setEditingBillPrefix] = useState(false);
  const [newBillPrefix, setNewBillPrefix] = useState("");
  // The shared (global) rate per acre from settings — sent along when the
  // series is saved. Kept separate from this service's own rate above so
  // saving the series can never overwrite the global rate with this
  // service's rate.
  const [settingsRate, setSettingsRate] = useState(0);

  // Shown when the server says this bill number is already used. The service
  // is NOT saved in that case.
  const [duplicateBillMsg, setDuplicateBillMsg] = useState("");
  const billInputRef = useRef(null);
  const duplicateBoxRef = useRef(null);
  // The last form data that was sent, so "Continue anyway" can send it again
  // with the duplicate check switched off.
  const lastFormDataRef = useRef(null);

  // Captcha confirmation gate for sensitive-field edits (Bill No., Acres, Guntha)
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    getSettings()
      .then(({ data }) => {
        if (!service.ratePerAcre) setRatePerAcre(data.ratePerAcre);

        setSettingsRate(Number(data.ratePerAcre) || 0);

        // Use the shared bill series from the server when it is provided
        if (typeof data.billPrefix === "string") {
          setBillPrefix(data.billPrefix);
          try {
            localStorage.setItem("billPrefix", data.billPrefix);
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => {});
  }, [service.ratePerAcre]);

  // When the duplicate message appears, bring it into view so the user
  // always sees it right after clicking Save Changes.
  useEffect(() => {
    if (duplicateBillMsg && duplicateBoxRef.current) {
      duplicateBoxRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [duplicateBillMsg]);

  const handleRChange = (val) => {
    setAreaInputSource("R");
    setPlotR(val);
    if (val === "") {
      setAcres("");
      return;
    }
    const numericR = Number(val);
    if (!Number.isFinite(numericR)) return;
    setAcres((numericR / 40).toFixed(2));
  };

  const handleAcresChange = (val) => {
    setAreaInputSource("ACRES");
    setAcres(val);
    if (val === "") {
      setPlotR("");
      return;
    }
    const numericAcres = Number(val);
    if (!Number.isFinite(numericAcres)) return;
    setPlotR(String(Math.round((numericAcres * 40 + Number.EPSILON) * 100) / 100));
  };

  useEffect(() => {
    if (!ratePerAcre) {
      setTotalBill("");
      return;
    }

    let exactAcres = 0;
    if (areaInputSource === "R" && plotR !== "") {
      exactAcres = Number(plotR) / 40;
    } else if (areaInputSource === "ACRES" && acres !== "") {
      exactAcres = Number(acres);
    }

    if (!Number.isFinite(exactAcres) || exactAcres <= 0) {
      setTotalBill("");
      return;
    }

    const exactBill = exactAcres * Number(ratePerAcre);
    const finalBill = Math.round((exactBill + Number.EPSILON) * 100) / 100;
    setTotalBill(String(finalBill));
  }, [plotR, acres, ratePerAcre, areaInputSource]);

  const handleSaveRate = async () => {
    if (!newRate) return;
    try {
      const { data } = await updateSettings({ ratePerAcre: Number(newRate) });
      setRatePerAcre(data.ratePerAcre);
      setEditingRate(false);
      setNewRate("");
    } catch {
      setError("Failed to update rate");
    }
  };

  // Save bill series (admin only) — same as Add Service
  const handleSaveBillPrefix = async () => {
    const prefix = newBillPrefix.trim();

    setBillPrefix(prefix);

    try {
      localStorage.setItem("billPrefix", prefix);
    } catch {
      /* ignore */
    }

    setEditingBillPrefix(false);
    setNewBillPrefix("");

    try {
      await updateSettings({
        ...(Number(settingsRate) > 0
          ? { ratePerAcre: Number(settingsRate) }
          : {}),
        billPrefix: prefix,
      });
    } catch {
      setError(
        "Bill series saved on this device only — could not save it on the server"
      );
    }
  };

  // Actually performs the update API call. Shared by the direct-save path
  // and the "confirm via captcha" path so the logic only lives in one place.
  const performUpdate = async (fd) => {
    setLoading(true);
    try {
      await updateService(service._id, fd);
      // Force a full page refresh so every screen (bill total, paid,
      // pending, history) reflects exactly what's in the database.
      window.location.reload();
    } catch (err) {
      const serverMsg = err.response?.data?.message || "";

      // Duplicate bill number: show the message with buttons instead of
      // the plain error line. Nothing was saved.
      const isDuplicateBill =
        err.response?.data?.code === "DUPLICATE_BILL" ||
        /Bill No\.\s*.+?\s+already exists/i.test(serverMsg);

      if (isDuplicateBill) {
        // Keep just the bill number for the short on-screen message
        const clash =
          (serverMsg.match(/Bill No\.\s*(.+?)\s+already exists/i) || [])[1] ||
          fd.get("billNo");

        setDuplicateBillMsg(clash || "—");

        // Close the captcha so the duplicate message is visible
        setShowCaptcha(false);
        setPendingFormData(null);
      } else {
        setError(serverMsg || "Failed to update service");
      }
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setDuplicateBillMsg("");

    const finalCrop = cropName === "Other" ? cropOther.trim() : cropName;
    const finalServiceType = serviceType === "Other" ? serviceTypeOther.trim() : serviceType;

    if (hasBillNo && !billNo.trim()) return setError("Bill No. is required");
    if (!finalCrop) return setError("Please select or enter a crop name");
    if (!finalServiceType) return setError("Please select or enter a service type");
    if (totalBill === "" || totalBill === null) return setError("Total bill is required");

    // Typed digits get the series prefix in front (002 -> A-002), unless the
    // user already typed the prefix themselves. An unchanged bill number is
    // never touched, so older bills with a different format stay as they are.
    const typedBillNo = hasBillNo ? billNo.trim() : "";
    const finalBillNo =
      typedBillNo !== originalBillNo &&
      typedBillNo &&
      billPrefix &&
      !typedBillNo.toLowerCase().startsWith(billPrefix.toLowerCase())
        ? `${billPrefix}${typedBillNo}`
        : typedBillNo;

    const fd = new FormData();
    fd.append("billNo", finalBillNo);
    fd.append("cropName", finalCrop);
    fd.append("serviceType", finalServiceType);
    fd.append("kshetra", plotR ? `${plotR} R` : "");
    if (acres !== "") fd.append("acres", acres);
    if (plotName !== "") fd.append("plotName", plotName);
    fd.append("ratePerAcre", ratePerAcre);
    fd.append("totalBill", totalBill);
    if (notes !== "") fd.append("notes", notes);

    // Only sent when the date was actually changed, so every other edit
    // behaves exactly as it did before.
    if (serviceDate && serviceDate !== originalServiceDate) {
      fd.append("serviceDate", serviceDate);
    }

    lastFormDataRef.current = fd;

    // Bill No., Acres, or Guntha (R) changed from what they originally were —
    // require a math captcha confirmation before saving these sensitive fields.
    const billNoChanged = typedBillNo !== originalBillNo;
    const acresChanged = String(acres) !== originalAcres;
    const gunthaChanged = plotR !== initialR;

    if (billNoChanged || acresChanged || gunthaChanged) {
      setPendingFormData(fd);
      setShowCaptcha(true);
      return;
    }

    await performUpdate(fd);
  };

  const handleCaptchaConfirm = async () => {
    setConfirmLoading(true);
    await performUpdate(pendingFormData);
    setConfirmLoading(false);
  };

  const handleCaptchaCancel = () => {
    setShowCaptcha(false);
    setPendingFormData(null);
  };

  // "Continue anyway" on the duplicate message — sends the same form again
  // with the server's duplicate check switched off. The confirmation was
  // already given before the first attempt, so it goes straight through.
  const handleContinueAnyway = async () => {
    const fd = lastFormDataRef.current;
    if (!fd) return;

    fd.set("allowDuplicateBill", "true");
    setDuplicateBillMsg("");

    await performUpdate(fd);
  };

  const inputClassName =
    "w-full bg-[#F6F2E9]/50 border border-black/[0.05] rounded-2xl px-4 py-3.5 text-[15px] font-medium text-[#1F2A22] placeholder:text-[#1F2A22]/30 focus:outline-none focus:ring-4 focus:ring-[#4C9A5A]/10 focus:border-[#4C9A5A]/50 transition-all";
  const labelClassName =
    "block text-[12px] font-bold text-[#1F2A22]/60 uppercase tracking-wider mb-1.5 ml-1";

  return (
    <form onSubmit={handleSubmit} autoComplete="off" className="bg-white rounded-[1.5rem] shadow-sm border border-black/[0.04] p-6 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-full bg-[#E9F3E9] flex items-center justify-center text-[#4C9A5A]">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="font-bold text-xl text-[#1F2A22]">Edit Service</h2>
      </div>

      <div className="space-y-4">
        <div>
          {/* Bill No. available? — same Yes / No choice as Add Service */}
          <div className="bg-[#F6F2E9]/50 rounded-2xl p-3.5 border border-black/[0.05] mb-3">
            <span className={`${labelClassName} mb-0`}>Bill No. available? / बिल क्रमांक आहे का?</span>

            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setHasBillNo(true)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${
                  hasBillNo
                    ? "bg-[#4C9A5A] text-white"
                    : "bg-white text-[#5B6B5E] border border-black/[0.06]"
                }`}
              >
                Yes
              </button>

              <button
                type="button"
                onClick={() => {
                  setHasBillNo(false);
                  setBillNo("");
                  setDuplicateBillMsg("");
                  setEditingBillPrefix(false);
                }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${
                  !hasBillNo
                    ? "bg-[#C24949] text-white"
                    : "bg-white text-[#5B6B5E] border border-black/[0.06]"
                }`}
              >
                No
              </button>
            </div>
          </div>

          {hasBillNo ? (
            <div>
            {/* Bill series — same as Add Service */}
            <div className="flex justify-between items-center mb-2">
              <span className={`${labelClassName} mb-0`}>Bill Series / बिल श्रेणी</span>

              {isAdmin && !editingBillPrefix && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingBillPrefix(true);
                    setNewBillPrefix(billPrefix);
                  }}
                  className="text-[11px] font-bold text-[#4C9A5A] bg-[#E9F3E9] px-2.5 py-1 rounded-lg"
                >
                  Edit series
                </button>
              )}
            </div>

            {!editingBillPrefix ? (
              <p className="text-lg font-bold text-[#1F2A22] mb-3 ml-1">
                {billPrefix || (
                  <span className="text-sm font-medium text-[#1F2A22]/40">No series set</span>
                )}
              </p>
            ) : (
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  name="newBillPrefix"
                  autoComplete="off"
                  value={newBillPrefix}
                  onChange={(e) => setNewBillPrefix(e.target.value)}
                  maxLength={12}
                  placeholder="e.g. A-"
                  className="flex-1 min-w-0 bg-white border border-black/[0.06] rounded-xl px-3.5 py-2 text-sm focus:outline-none"
                />
                <button type="button" onClick={handleSaveBillPrefix} className="shrink-0 bg-[#2B5439] text-white rounded-xl px-4 text-sm font-semibold">
                  Save
                </button>
                <button type="button" onClick={() => setEditingBillPrefix(false)} className="shrink-0 bg-white border border-black/[0.08] rounded-xl px-4 text-sm font-semibold">
                  Cancel
                </button>
              </div>
            )}

            <label className={labelClassName}>Bill No. / बिल क्रमांक *</label>
<input
  type="text"
  inputMode="numeric"
  pattern="[0-9]*"
  name="billNo"
  autoComplete="off"
  ref={billInputRef}
  value={billNo}
  onChange={(e) => {
    setBillNo(e.target.value.replace(/\D/g, ""));   // digits only
    setDuplicateBillMsg("");
  }}
  placeholder="Enter bill number"
  required={hasBillNo}
  className={inputClassName}
/>

            {billPrefix &&
              billNo.trim() &&
              billNo.trim() !== originalBillNo &&
              !billNo.trim().toLowerCase().startsWith(billPrefix.toLowerCase()) && (
                <p className="text-[11px] text-[#1F2A22]/40 mt-1.5 ml-1">
                  Will be saved as{" "}
                  <span className="font-bold text-[#2B5439]">
                    {`${billPrefix}${billNo.trim()}`}
                  </span>
                </p>
              )}

            {/* Duplicate bill number — same message and buttons as Add Service.
                Nothing was saved when this shows. */}
            {duplicateBillMsg && (
              <div
                ref={duplicateBoxRef}
                className="mt-3 bg-[#FCEDED] border border-[#C24949]/40 ring-2 ring-[#C24949]/10 rounded-xl px-3 py-2.5 space-y-2"
              >
                <div className="space-y-0.5">
                  <p className="text-[#C24949] text-xs font-bold leading-snug">
                    ⚠ Bill No. {duplicateBillMsg} already exists. Not saved yet.
                  </p>

                  <p className="text-[#C24949]/80 text-[11px] font-medium leading-snug">
                    बिल क्रमांक {duplicateBillMsg} आधीच वापरलेला आहे. अजून जतन झाले नाही.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDuplicateBillMsg("");

                      const el = billInputRef.current;

                      if (el) {
                        el.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });

                        el.focus();
                        el.select();
                      }
                    }}
                    className="flex-1 min-w-0 bg-[#C24949] text-white rounded-lg py-2 text-[11px] leading-tight font-bold active:scale-[0.98] transition-all"
                  >
                    Change Bill No.
                    <br />
                    बिल क्रमांक बदला
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleContinueAnyway}
                    className="flex-1 min-w-0 bg-white border border-[#C24949]/40 text-[#C24949] rounded-lg py-2 text-[11px] leading-tight font-semibold active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    Continue anyway
                    <br />
                    तरीही पुढे जा
                  </button>
                </div>
              </div>
            )}
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-[#FCEDED] border border-[#F3C6C6] rounded-xl px-3.5 py-2.5">
              <span className="h-2 w-2 rounded-full bg-[#C24949] shrink-0 animate-pulse" />
              <p className="text-[#C24949] text-xs font-semibold">
                No bill number on file for this service
              </p>
            </div>
          )}
        </div>

        {service.village && (
          <div>
            <label className={labelClassName}>Village</label>
            <div className="w-full bg-[#F6F2E9]/50 border border-black/[0.05] rounded-2xl px-4 py-3.5 text-[15px] font-medium text-[#1F2A22]/60">
              {service.village}
            </div>
            <p className="text-[11px] text-[#1F2A22]/40 mt-1.5 ml-1">Change village from Farmer Profile</p>
          </div>
        )}

        <div>
          <label className={labelClassName}>Service Date / सेवा दिनांक *</label>
          <input
            type="date"
            name="serviceDate"
            autoComplete="off"
            value={serviceDate}
            onChange={(e) => setServiceDate(e.target.value)}
            required
            className={inputClassName}
          />
        </div>

        <div>
          <label className={labelClassName}>Crop Name</label>
          <select value={cropName} onChange={(e) => setCropName(e.target.value)} className={inputClassName}>
            {CROPS.map((crop) => <option key={crop} value={crop}>{crop}</option>)}
          </select>
          {cropName === "Other" && (
            <input
              name="cropOther"
              autoComplete="off"
              value={cropOther}
              onChange={(e) => setCropOther(e.target.value)}
              placeholder="Type crop name"
              className={`${inputClassName} mt-2`}
            />
          )}
        </div>

        <div>
          <label className={labelClassName}>Service Type</label>
          <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} className={inputClassName}>
            {SERVICE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          {serviceType === "Other" && (
            <input
              name="serviceTypeOther"
              autoComplete="off"
              value={serviceTypeOther}
              onChange={(e) => setServiceTypeOther(e.target.value)}
              placeholder="Type service type"
              className={`${inputClassName} mt-2`}
            />
          )}
        </div>

        <div className="bg-[#F6F2E9]/50 rounded-2xl p-3.5 border border-black/[0.05]">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClassName}>In R (Guntha)</label>
              <input
                type="number"
                inputMode="decimal"
                name="plotR"
                autoComplete="off"
                value={plotR}
                onChange={(e) => handleRChange(e.target.value)}
                className="w-full bg-white border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#4C9A5A]/10"
              />
            </div>
            <div>
              <label className={labelClassName}>In Acres</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                name="acres"
                autoComplete="off"
                value={acres}
                onChange={(e) => handleAcresChange(e.target.value)}
                className="w-full bg-white border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#4C9A5A]/10"
              />
            </div>
          </div>
          <p className="text-[11px] text-[#1F2A22]/40 mt-2 ml-1">40 R = 1 Acre — enter either field</p>
        </div>

        <div>
          <label className={labelClassName}>Plot Name</label>
          <input
            name="plotName"
            autoComplete="off"
            value={plotName}
            onChange={(e) => setPlotName(e.target.value)}
            className={inputClassName}
          />
        </div>

        <div className="bg-[#F6F2E9]/50 rounded-2xl p-3.5 border border-black/[0.05]">
          <div className="flex justify-between items-center">
            <span className={`${labelClassName} mb-0`}>Rate / Acre</span>
            {isAdmin && !editingRate && (
              <button
                type="button"
                onClick={() => { setEditingRate(true); setNewRate(ratePerAcre); }}
                className="text-[11px] font-bold text-[#4C9A5A] bg-[#E9F3E9] px-2.5 py-1 rounded-lg"
              >
                Edit rate
              </button>
            )}
          </div>

          {!editingRate ? (
            <p className="text-xl font-bold text-[#1F2A22] mt-1">
              ₹{ratePerAcre}<span className="text-sm font-medium text-[#1F2A22]/40"> /acre</span>
            </p>
          ) : (
            <div className="flex gap-2 mt-2">
              <input
                type="number"
                name="newRate"
                autoComplete="off"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                className="flex-1 bg-white border border-black/[0.06] rounded-xl px-3.5 py-2 text-sm focus:outline-none"
              />
              <button type="button" onClick={handleSaveRate} className="bg-[#2B5439] text-white rounded-xl px-4 text-sm font-semibold">
                Save
              </button>
              <button type="button" onClick={() => setEditingRate(false)} className="bg-white border border-black/[0.08] rounded-xl px-4 text-sm font-semibold">
                Cancel
              </button>
            </div>
          )}
        </div>

        <div>
          <label className={labelClassName}>Total Bill *</label>
          <input
            type="number"
            name="totalBill"
            autoComplete="off"
            value={totalBill}
            onChange={(e) => setTotalBill(e.target.value)}
            required
            className={inputClassName}
          />
        </div>

        <div>
          <label className={labelClassName}>Notes</label>
          <textarea
            name="notes"
            autoComplete="off"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={inputClassName}
          />
        </div>
      </div>

      {error && (
        <div className="mt-5 p-3.5 bg-[#FCEDED] border border-[#C24949]/20 rounded-xl">
          <p className="text-[#C24949] text-[13px] font-medium">{error}</p>
        </div>
      )}

      <div className="flex gap-3 pt-6 mt-2 border-t border-black/[0.04]">
        <button type="button" onClick={onCancel} disabled={loading} className="flex-1 bg-white border border-black/10 text-[#1F2A22] rounded-2xl py-3.5 font-bold text-[15px]">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="flex-[1.5] bg-[#4C9A5A] text-white rounded-2xl py-3.5 font-bold text-[15px] disabled:opacity-70">
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {showCaptcha && (
  <MathCaptchaModal
    title="Confirm Bill No. / Area Change"
    message="You're changing the Bill No., Acres, or Guntha for this service. Please confirm to continue."
    onCancel={handleCaptchaCancel}
    onConfirm={handleCaptchaConfirm}
    loading={confirmLoading}
    confirmLabel="Confirm Changes"
    loadingLabel="Saving..."
  />
)}
    </form>
  );
}