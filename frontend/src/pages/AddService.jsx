import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import FarmerSearchSelect from "../components/farmers/FarmerSearchSelect";
import FarmerForm from "../components/farmers/FarmerForm";
import { addService } from "../api/serviceApi";
import { addPayment } from "../api/paymentApi";
import { getSettings, updateSettings } from "../api/settingsApi";
import { buildServiceMessage } from "../utils/messageTemplates";
import SendMessageButtons from "../components/common/SendMessageButtons";
import { useAuth } from "../hooks/useAuth";
import axiosInstance from "../api/axiosInstance";
import { CROPS, SERVICE_TYPES } from "../constants/serviceOptions";

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#5B6B5E] uppercase tracking-wide mb-1.5">
        {label}
      </label>

      {children}

      {hint && (
        <p className="text-[11px] text-[#8A968C] mt-1.5">
          {hint}
        </p>
      )}
    </div>
  );
}

const inputClass =
  "w-full bg-[#F6F2E9] border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-sm text-[#1F2A22] placeholder-[#A3AFA5] focus:outline-none focus:ring-2 focus:ring-[#4C9A5A]/30 focus:border-[#4C9A5A]/40 transition-all";

// English-only filter for the "Other" free-text inputs. Blocks
// Devanagari (Marathi) and other non-Latin scripts, but keeps common
// punctuation used in crop/service names (numbers, hyphen, slash, etc).
const ENGLISH_TEXT_REGEX = /[^A-Za-z0-9\s.,'\-\/()]/g;

// Display-only bilingual labels for Crop Name and Service Type. The
// stored value is always the plain English string from CROPS /
// SERVICE_TYPES — these maps only change what's shown in the option text.
const CROP_LABELS = {
  Thompson: "Thompson (थॉम्पसन)",
  Sudhakar: "Sudhakar (सुधाकर)",
  Sonaka: "Sonaka (सोनाका)",
  Anuksha: "Anuksha (अनुष्का)",
  "Sharad Black": "Sharad Black (शरद ब्लॅक)",
  "Black Jumbo": "Black Jumbo (ब्लॅक जंबो)",
  Other: "Other (इतर)",
};

const SERVICE_TYPE_LABELS = {
  "1st dip": "1st dip (1 डिपिंग)",
  setting: "setting (सेटिंग)",
  "2nd dip": "2nd dip (2 डिपिंग)",
  "3rd dip": "3rd dip (3 डिपिंग)",
  Tochan: "Tochan (टोचण)",
  Ethrel: "Ethrel (इथ्रेल)",
  Other: "Other (इतर)",
};

// Path to your UPI QR code image. Put the actual image file in your
// frontend's /public folder (e.g. public/upi-qr.png) so this path resolves.
const UPI_QR_IMAGE = "/upi-qr.png";

const getTodayLocal = () => {
  const d = new Date();

  const year = d.getFullYear();

  const month = String(
    d.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    d.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export default function AddService() {
  const { user } = useAuth();

  const isAdmin =
    user?.role === "admin";

  const navigate =
    useNavigate();

  const location =
    useLocation();

  const passedFarmer =
    location.state?.farmer || null;

  const [farmer, setFarmer] =
    useState(passedFarmer);

  const [mode, setMode] =
    useState("search");

  const [village, setVillage] =
    useState("");

  const [cropName, setCropName] =
    useState("");

  const [cropOther, setCropOther] =
    useState("");

  // NEW: inline English-only validation error for the crop "Other" field
  const [cropOtherError, setCropOtherError] =
    useState("");

  const [serviceType, setServiceType] =
    useState("");

  const [
    serviceTypeOther,
    setServiceTypeOther,
  ] = useState("");

  // NEW: inline English-only validation error for the service-type
  // "Other" field
  const [
    serviceTypeOtherError,
    setServiceTypeOtherError,
  ] = useState("");

  const [plotR, setPlotR] =
    useState("");

  const [acres, setAcres] =
    useState("");

  const [
    areaInputSource,
    setAreaInputSource,
  ] = useState("R");

  const [
    serviceDate,
    setServiceDate,
  ] = useState(getTodayLocal());

  const [hasBillNo, setHasBillNo] =
    useState(true);

  const [billNo, setBillNo] =
    useState("");

  // Bill-number series prefix (e.g. "A-"). Admin sets it once; everyone then
  // types only the digits (001) and the saved bill no becomes "A-001".
  // Remembered on this device too, in case the server doesn't return it.
  const [billPrefix, setBillPrefix] =
    useState(() => {
      try {
        return localStorage.getItem("billPrefix") || "";
      } catch {
        return "";
      }
    });

  const [
    editingBillPrefix,
    setEditingBillPrefix,
  ] = useState(false);

  // Shown when the server says this bill number is already used.
  // The service is NOT saved in that case.
  const [
    duplicateBillMsg,
    setDuplicateBillMsg,
  ] = useState("");

  const billInputRef = useRef(null);

  // Set to true only when the user clicks "Continue anyway" on the
  // duplicate-bill message; tells the server to skip its duplicate check.
  const allowDuplicateRef = useRef(false);

  const duplicateBoxRef = useRef(null);

  // When the duplicate message appears, bring it into view so the user
  // always sees it right after clicking Add Service.
  useEffect(() => {
    if (duplicateBillMsg && duplicateBoxRef.current) {
      duplicateBoxRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [duplicateBillMsg]);

  const [
    newBillPrefix,
    setNewBillPrefix,
  ] = useState("");

  const [plotName, setPlotName] =
    useState("");

  const [
    ratePerAcre,
    setRatePerAcre,
  ] = useState(0);

  const [
    editingRate,
    setEditingRate,
  ] = useState(false);

  const [newRate, setNewRate] =
    useState("");

  const [
    totalBill,
    setTotalBill,
  ] = useState("");

  const [
    paymentMode,
    setPaymentMode,
  ] = useState("Cash");

  const [notes, setNotes] =
    useState("");

  const [
    billImageFile,
    setBillImageFile,
  ] = useState(null);

  const [billPaid, setBillPaid] =
    useState(false);

  const [
    amountPaid,
    setAmountPaid,
  ] = useState("");

  // NEW: Discount is No by default
  const [
    applyDiscount,
    setApplyDiscount,
  ] = useState(false);

  const [
    discountAmount,
    setDiscountAmount,
  ] = useState("");

  const [
    discountReason,
    setDiscountReason,
  ] = useState("");

  // Admin-only: who this service should be credited to. Compulsory
  // for admins (must explicitly pick someone), never shown to staff —
  // staff logins are always credited to themselves automatically.
  const [staffList, setStaffList] =
    useState([]);

  const [
    assignedStaffId,
    setAssignedStaffId,
  ] = useState("");

  const [error, setError] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [
    savedService,
    setSavedService,
  ] = useState(null);

  // ---------------------------------------
  // ENGLISH-ONLY "OTHER" FIELD HANDLERS
  // ---------------------------------------

  const handleCropOtherChange = (e) => {
    const raw = e.target.value;
    const filtered = raw.replace(
      ENGLISH_TEXT_REGEX,
      ""
    );

    setCropOther(filtered);

    setCropOtherError(
      raw !== filtered
        ? "Please use English characters only"
        : ""
    );
  };

  const handleServiceTypeOtherChange = (
    e
  ) => {
    const raw = e.target.value;
    const filtered = raw.replace(
      ENGLISH_TEXT_REGEX,
      ""
    );

    setServiceTypeOther(filtered);

    setServiceTypeOtherError(
      raw !== filtered
        ? "Please use English characters only"
        : ""
    );
  };

  // ---------------------------------------
  // LIVE PAYMENT / DISCOUNT CALCULATION
  // ---------------------------------------

  const currentBill =
    Number(totalBill) || 0;

  const enteredPayment =
    billPaid
      ? Number(amountPaid) || 0
      : 0;

  const enteredDiscount =
    billPaid && applyDiscount
      ? Number(discountAmount) || 0
      : 0;

  const adjustedPending =
    Math.max(
      currentBill -
        enteredPayment -
        enteredDiscount,
      0
    );

  const exceedsBill =
    enteredPayment +
      enteredDiscount >
    currentBill;

  // ---------------------------------------
  // SETTINGS
  // ---------------------------------------

  useEffect(() => {
    getSettings()
      .then(({ data }) => {
        setRatePerAcre(
          data.ratePerAcre
        );

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
      .catch(() =>
        setRatePerAcre(0)
      );
  }, []);

  // ---------------------------------------
  // STAFF LIST — admin only
  // ---------------------------------------

  useEffect(() => {
    if (!isAdmin) return;

    axiosInstance
      .get("/staff")
      .then(({ data }) => setStaffList(data))
      .catch(() => setStaffList([]));
  }, [isAdmin]);

  // ---------------------------------------
  // FARMER VILLAGE
  // ---------------------------------------

  useEffect(() => {
    if (farmer?.village) {
      setVillage(
        farmer.village
      );
    } else {
      setVillage("");
    }
  }, [farmer]);

  // ---------------------------------------
  // AREA CALCULATION
  // ---------------------------------------

  const handleRChange = (val) => {
    setAreaInputSource("R");

    setPlotR(val);

    if (val === "") {
      setAcres("");
      return;
    }

    const numericR =
      Number(val);

    if (
      !Number.isFinite(
        numericR
      )
    ) {
      return;
    }

    setAcres(
      (
        numericR / 40
      ).toFixed(2)
    );
  };

  const handleAcresChange = (
    val
  ) => {
    setAreaInputSource(
      "ACRES"
    );

    setAcres(val);

    if (val === "") {
      setPlotR("");
      return;
    }

    const numericAcres =
      Number(val);

    if (
      !Number.isFinite(
        numericAcres
      )
    ) {
      return;
    }

    setPlotR(
      (
        numericAcres * 40
      ).toFixed(2)
    );
  };

  // ---------------------------------------
  // TOTAL BILL AUTO CALCULATION
  // ---------------------------------------

  useEffect(() => {
    const numericRate =
      Number(ratePerAcre);

    if (
      !Number.isFinite(
        numericRate
      ) ||
      numericRate <= 0
    ) {
      setTotalBill("");
      return;
    }

    let exactAcres = 0;

    if (
      areaInputSource ===
        "R" &&
      plotR !== ""
    ) {
      const numericR =
        Number(plotR);

      if (
        Number.isFinite(
          numericR
        )
      ) {
        exactAcres =
          numericR / 40;
      }
    }

    if (
      areaInputSource ===
        "ACRES" &&
      acres !== ""
    ) {
      const numericAcres =
        Number(acres);

      if (
        Number.isFinite(
          numericAcres
        )
      ) {
        exactAcres =
          numericAcres;
      }
    }

    if (
      !Number.isFinite(
        exactAcres
      ) ||
      exactAcres <= 0
    ) {
      setTotalBill("");
      return;
    }

    const exactBill =
      exactAcres *
      numericRate;

    const finalBill =
      Math.round(
        (
          exactBill +
          Number.EPSILON
        ) *
          100
      ) / 100;

    setTotalBill(
      String(finalBill)
    );
  }, [
    plotR,
    acres,
    ratePerAcre,
    areaInputSource,
  ]);

  // ---------------------------------------
  // SAVE RATE
  // ---------------------------------------

  const handleSaveRate =
    async () => {
      if (!newRate) return;

      try {
        const { data } =
          await updateSettings({
            ratePerAcre:
              Number(newRate),
          });

        setRatePerAcre(
          data.ratePerAcre
        );

        setEditingRate(false);

        setNewRate("");
      } catch (err) {
        setError(
          "Failed to update rate"
        );
      }
    };

  // ---------------------------------------
  // SAVE BILL SERIES (admin only)
  // ---------------------------------------

  const handleSaveBillPrefix =
    async () => {
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
          ...(Number(ratePerAcre) > 0
            ? {
                ratePerAcre:
                  Number(ratePerAcre),
              }
            : {}),
          billPrefix: prefix,
        });
      } catch (err) {
        setError(
          "Bill series saved on this device only — could not save it on the server"
        );
      }
    };

  // ---------------------------------------
  // NEW FARMER
  // ---------------------------------------

  const handleNewFarmerRegistered =
    (newFarmer) => {
      setFarmer(newFarmer);

      setMode("search");
    };

  // ---------------------------------------
  // SUBMIT
  // ---------------------------------------

  const handleSubmit =
    async (e) => {
      e.preventDefault();

      setError(null);

      setDuplicateBillMsg("");

      const allowDuplicate =
        allowDuplicateRef.current;

      allowDuplicateRef.current = false;

      if (!farmer) {
        return setError(
          "Please select or register a farmer first"
        );
      }

      if (!village) {
        return setError(
          "Selected farmer has no village on file — update their profile first"
        );
      }

      if (hasBillNo && !billNo.trim()) {
        return setError(
          "Bill No. is required"
        );
      }

      if (
        !cropName ||
        (cropName === "Other" &&
          !cropOther)
      ) {
        return setError(
          "Please select or enter a crop name"
        );
      }

      if (
        !serviceType ||
        (serviceType ===
          "Other" &&
          !serviceTypeOther)
      ) {
        return setError(
          "Please select or enter a service type"
        );
      }

      if (!acres) {
        return setError(
          "Please enter plot size"
        );
      }

      if (!totalBill) {
        return setError(
          "Total bill is required"
        );
      }

      if (isAdmin && !assignedStaffId) {
        return setError(
          "Please select which staff member this service is for"
        );
      }

      if (billPaid) {
        if (
          !amountPaid ||
          Number(
            amountPaid
          ) <= 0
        ) {
          return setError(
            "Enter the amount paid"
          );
        }

        if (
          Number(
            amountPaid
          ) >
          Number(totalBill)
        ) {
          return setError(
            "Amount paid cannot exceed total bill"
          );
        }
      }

      if (
        billPaid &&
        applyDiscount
      ) {
        if (
          !discountAmount ||
          Number(
            discountAmount
          ) <= 0
        ) {
          return setError(
            "Enter a valid discount amount"
          );
        }

        if (
          Number(
            amountPaid
          ) +
            Number(
              discountAmount
            ) >
          Number(totalBill)
        ) {
          return setError(
            "Payment and discount together cannot exceed total bill"
          );
        }
      }

      setLoading(true);

      try {
        const fd =
          new FormData();

        fd.append(
          "farmer",
          farmer._id
        );

        fd.append(
          "village",
          village
        );

        // Typed digits get the series prefix in front (001 -> A-001),
        // unless the user already typed the prefix themselves.
        const typedBillNo = billNo.trim();

        const finalBillNo =
          billPrefix &&
          !typedBillNo
            .toLowerCase()
            .startsWith(
              billPrefix.toLowerCase()
            )
            ? `${billPrefix}${typedBillNo}`
            : typedBillNo;

        fd.append(
          "billNo",
          hasBillNo ? finalBillNo : ""
        );

        if (allowDuplicate) {
          fd.append(
            "allowDuplicateBill",
            "true"
          );
        }

        fd.append(
          "cropName",
          cropName === "Other"
            ? cropOther
            : cropName
        );

        fd.append(
          "serviceType",
          serviceType ===
            "Other"
            ? serviceTypeOther
            : serviceType
        );

        fd.append(
          "kshetra",
          `${plotR} R`
        );

        fd.append(
          "acres",
          acres
        );

        fd.append(
          "plotName",
          plotName
        );

        fd.append(
          "ratePerAcre",
          ratePerAcre
        );

        fd.append(
          "totalBill",
          totalBill
        );

        fd.append(
          "paymentMode",
          paymentMode
        );

        fd.append(
          "notes",
          notes
        );

        fd.append(
          "serviceDate",
          serviceDate
        );

        if (isAdmin && assignedStaffId) {
          fd.append(
            "assignedStaffId",
            assignedStaffId
          );
        }

        if (billImageFile) {
          fd.append(
            "billImage",
            billImageFile
          );
        }

        // First create service
        const { data } =
          await addService(fd);

        const newService =
          data.service;

        // Then record initial payment
        // and optional discount
        if (
          billPaid &&
          Number(
            amountPaid
          ) > 0
        ) {
          const paymentResponse =
            await addPayment({
              serviceRecordId:
                newService._id,

              amount:
                Number(
                  amountPaid
                ),

              mode:
                paymentMode,

              note:
                "Recorded at time of service entry",

              applyDiscount,

              discountAmount:
                applyDiscount
                  ? Number(
                      discountAmount
                    )
                  : 0,

              discountReason:
                applyDiscount
                  ? discountReason
                  : "",
            });

          const updatedService =
            paymentResponse
              .data
              ?.service ||
            newService;

          setSavedService(
            updatedService
          );

          return;
        }

        setSavedService(
          newService
        );
      } catch (err) {
        const serverMsg =
          err.response?.data?.message ||
          "";

        // Duplicate bill number: show the message with buttons
        // instead of the plain error line. Nothing was saved.
        const isDuplicateBill =
          err.response?.data?.code ===
            "DUPLICATE_BILL" ||
          (/bill/i.test(serverMsg) &&
            /(already|duplicate|exists)/i.test(
              serverMsg
            ));

        if (isDuplicateBill) {
          // Keep just the bill number for the short on-screen message
          const clash =
            (serverMsg.match(
              /Bill No\.\s*(.+?)\s+already exists/i
            ) || [])[1] ||
            `${billPrefix}${billNo.trim()}`;

          setDuplicateBillMsg(clash || "—");
        } else {
          setError(
            err.response
              ?.data
              ?.message ||
              "Failed to add service"
          );
        }
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="min-h-screen bg-[#F6F2E9] pb-24 font-sans selection:bg-[#4C9A5A]/20">
      {/* HEADER */}

      <div
        className="relative px-6 pt-10 pb-16 overflow-hidden rounded-b-[2.5rem] shadow-sm"
        style={{
          backgroundImage:
            "linear-gradient(180deg, #1F3D2B 0%, #234730 60%, #2B5439 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage:
              "repeating-linear-gradient(115deg, #ffffff 0px, #ffffff 1px, transparent 1px, transparent 14px)",
          }}
        />

        <div className="relative">
          <p className="text-xs text-[#B9D9BE] font-medium tracking-wide uppercase mb-1">
            New Entry
          </p>

          <h1 className="text-xl font-bold text-white tracking-tight">
            Add Spraying
            Service
          </h1>
        </div>
      </div>

      <div className="px-5 -mt-8 relative z-10 max-w-2xl mx-auto space-y-4">

        {/* FARMER */}

        <div className="bg-white rounded-[1.5rem] shadow-sm border border-black/[0.04] p-4">
          {!farmer && (
            <div className="flex gap-2 mb-3 bg-[#F6F2E9] rounded-xl p-1">
              <button
                type="button"
                onClick={() =>
                  setMode(
                    "search"
                  )
                }
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  mode ===
                  "search"
                    ? "bg-[#2B5439] text-white shadow-sm"
                    : "text-[#5B6B5E]"
                }`}
              >
                Existing Farmer
              </button>

              <button
                type="button"
                onClick={() =>
                  setMode(
                    "new"
                  )
                }
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  mode ===
                  "new"
                    ? "bg-[#2B5439] text-white shadow-sm"
                    : "text-[#5B6B5E]"
                }`}
              >
                New Farmer
              </button>
            </div>
          )}

          {mode === "search" ||
          farmer ? (
            <FarmerSearchSelect
              onSelect={
                setFarmer
              }
              selectedFarmer={
                farmer
              }
            />
          ) : (
            <FarmerForm
              onSuccess={
                handleNewFarmerRegistered
              }
              onCancel={() =>
                setMode(
                  "search"
                )
              }
            />
          )}
        </div>

        {farmer &&
          !savedService && (
            <form
              onSubmit={
                handleSubmit
              }
              autoComplete="off"
              className="space-y-4"
            >

              {/* ADMIN ONLY: WHO IS THIS SERVICE FOR */}

              {isAdmin && (
                <div className="bg-white rounded-[1.5rem] shadow-sm border border-black/[0.04] p-5 space-y-4">
                  <h2 className="text-sm font-bold text-[#1F2A22]">
                    Added By
                  </h2>

                  <Field
                    label="Staff Member / कर्मचारी"
                    hint="Required — select which staff login this service should be credited to"
                  >
                    <select
                      value={assignedStaffId}
                      onChange={(e) => setAssignedStaffId(e.target.value)}
                      required
                      className={inputClass}
                    >
                      <option value="">
                        Select staff member
                      </option>
                      {staffList.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name} {s.role === "admin" ? "(Admin)" : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}

              {/* LOCATION */}

              <div className="bg-white rounded-[1.5rem] shadow-sm border border-black/[0.04] p-5 space-y-4">
                <h2 className="text-sm font-bold text-[#1F2A22]">
                  Location & Crop
                </h2>

                <Field
                  label="Village / गाव"
                  hint="From this farmer's registered profile"
                >
                  <div
                    className={`${inputClass} font-semibold cursor-not-allowed`}
                  >
                    {village ||
                      "No village on file"}
                  </div>
                </Field>

                <Field label="Crop Name / पीक">
                  <select
                    value={
                      cropName
                    }
                    onChange={(
                      e
                    ) =>
                      setCropName(
                        e.target
                          .value
                      )
                    }
                    className={
                      inputClass
                    }
                  >
                    <option value="">
                      Select crop
                    </option>

                    {CROPS.map(
                      (c) => (
                        <option
                          key={
                            c
                          }
                          value={
                            c
                          }
                        >
                          {CROP_LABELS[c] || c}
                        </option>
                      )
                    )}
                  </select>

                  {cropName ===
                    "Other" && (
                    <>
                      <input
                        value={
                          cropOther
                        }
                        onChange={
                          handleCropOtherChange
                        }
                        placeholder="Type crop name"
                        className={`${inputClass} mt-2`}
                      />

                      {cropOtherError && (
                        <p className="text-[11px] text-[#C24949] font-semibold mt-1.5">
                          {cropOtherError}
                        </p>
                      )}
                    </>
                  )}
                </Field>

                <Field label="Plot Name (optional) / प्लॉट नाव (ऐच्छिक)">
                  <input
                    value={
                      plotName
                    }
                    onChange={(
                      e
                    ) =>
                      setPlotName(
                        e.target
                          .value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>
              </div>

              {/* PLOT */}

              <div className="bg-white rounded-[1.5rem] shadow-sm border border-black/[0.04] p-5 space-y-4">
                <h2 className="text-sm font-bold text-[#1F2A22]">
                  Plot Size &
                  Date
                </h2>

                <div className="bg-[#F6F2E9] rounded-xl p-3.5">
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <Field label="In R (Guntha) / आर (गुंठे)">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={
                          plotR
                        }
                        onChange={(
                          e
                        ) =>
                          handleRChange(
                            e
                              .target
                              .value
                          )
                        }
                        className="w-full bg-white border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-sm"
                      />
                    </Field>

                    <Field label="In Acres / एकर">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        value={
                          acres
                        }
                        onChange={(
                          e
                        ) =>
                          handleAcresChange(
                            e
                              .target
                              .value
                          )
                        }
                        className="w-full bg-white border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-sm"
                      />
                    </Field>
                  </div>

                  <p className="text-[11px] text-[#8A968C] mt-2">
                    40 R = 1 Acre
                    — enter either
                    field
                  </p>
                </div>

                <Field label="Service Date / सेवा तारीख">
                  <input
                    type="date"
                    value={
                      serviceDate
                    }
                    onChange={(
                      e
                    ) =>
                      setServiceDate(
                        e.target
                          .value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>
              </div>

              {/* SERVICE DETAILS */}

              <div className="bg-white rounded-[1.5rem] shadow-sm border border-black/[0.04] p-5 space-y-4">
                <h2 className="text-sm font-bold text-[#1F2A22]">
                  Service Details
                </h2>

                <Field label="Service Type / सेवा प्रकार">
                  <select
                    value={
                      serviceType
                    }
                    onChange={(
                      e
                    ) =>
                      setServiceType(
                        e.target
                          .value
                      )
                    }
                    className={
                      inputClass
                    }
                  >
                    <option value="">
                      Select service
                      type
                    </option>

                    {SERVICE_TYPES.map(
                      (s) => (
                        <option
                          key={
                            s
                          }
                          value={
                            s
                          }
                        >
                          {SERVICE_TYPE_LABELS[s] || s}
                        </option>
                      )
                    )}
                  </select>

                  {serviceType ===
                    "Other" && (
                    <>
                      <input
                        value={
                          serviceTypeOther
                        }
                        onChange={
                          handleServiceTypeOtherChange
                        }
                        placeholder="Type service type"
                        className={`${inputClass} mt-2`}
                      />

                      {serviceTypeOtherError && (
                        <p className="text-[11px] text-[#C24949] font-semibold mt-1.5">
                          {serviceTypeOtherError}
                        </p>
                      )}
                    </>
                  )}
                </Field>

                <div className="bg-[#F6F2E9] rounded-xl p-3.5">
                  <span className="text-xs font-semibold text-[#5B6B5E] uppercase tracking-wide">
                    Bill No. available? / बिल क्रमांक आहे का?
                  </span>

                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setHasBillNo(true);
                      }}
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

                  {hasBillNo ? (
                    <div className="mt-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-[#5B6B5E] uppercase tracking-wide">
                          Bill Series / बिल मालिका
                        </span>

                        {isAdmin &&
                          !editingBillPrefix && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBillPrefix(
                                  true
                                );

                                setNewBillPrefix(
                                  billPrefix
                                );
                              }}
                              className="text-[11px] font-bold text-[#4C9A5A] bg-[#E9F3E9] px-2.5 py-1 rounded-lg"
                            >
                              Edit series
                            </button>
                          )}
                      </div>

                      {!editingBillPrefix ? (
                        <p className="text-lg font-bold text-[#1F2A22] mb-3">
                          {billPrefix || (
                            <span className="text-sm font-medium text-[#8A968C]">
                              No series set
                            </span>
                          )}
                        </p>
                      ) : (
                        <div className="flex gap-2 mb-3">
                          <input
                            type="text"
                            value={
                              newBillPrefix
                            }
                            onChange={(
                              e
                            ) =>
                              setNewBillPrefix(
                                e.target
                                  .value
                              )
                            }
                            maxLength={12}
                            placeholder="e.g. A-"
                            className="flex-1 min-w-0 bg-white border rounded-xl px-3.5 py-2 text-sm"
                          />

                          <button
                            type="button"
                            onClick={
                              handleSaveBillPrefix
                            }
                            className="shrink-0 bg-[#2B5439] text-white rounded-xl px-3.5 text-sm font-semibold"
                          >
                            Save
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setEditingBillPrefix(
                                false
                              )
                            }
                            className="shrink-0 bg-white border rounded-xl px-3.5 text-sm font-semibold"
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      <Field label="Bill No. / बिल क्रमांक">
                        <div className="flex items-stretch w-full bg-white border border-black/[0.06] rounded-xl overflow-hidden">
                          {billPrefix && (
                            <span className="flex items-center bg-[#E9F3E9] text-[#2B5439] text-sm font-bold px-3 shrink-0">
                              {billPrefix}
                            </span>
                          )}

                          <input
                            type="text"
                            value={
                              billNo
                            }
                            ref={billInputRef}
                            onChange={(
                              e
                            ) => {
                              setBillNo(
                                e.target
                                  .value
                              );

                              setDuplicateBillMsg(
                                ""
                              );
                            }}
                            placeholder="Enter bill number"
                            required
                            className="flex-1 min-w-0 bg-transparent px-3.5 py-2.5 text-sm focus:outline-none"
                          />
                        </div>

                        {billPrefix &&
                          billNo.trim() && (
                            <p className="text-[11px] text-[#8A968C] mt-1.5">
                              Will be saved as{" "}
                              <span className="font-bold text-[#2B5439]">
                                {billNo
                                  .trim()
                                  .toLowerCase()
                                  .startsWith(
                                    billPrefix.toLowerCase()
                                  )
                                  ? billNo.trim()
                                  : `${billPrefix}${billNo.trim()}`}
                              </span>
                            </p>
                          )}
                      </Field>
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center gap-2 bg-[#FCEDED] border border-[#F3C6C6] rounded-xl px-3.5 py-2.5">
                      <span className="h-2 w-2 rounded-full bg-[#C24949] shrink-0 animate-pulse" />
                      <p className="text-[#C24949] text-xs font-semibold">
                        No bill number on file for this service
                      </p>
                    </div>
                  )}
                </div>

                {/* RATE */}

                <div className="bg-[#F6F2E9] rounded-xl p-3.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-[#5B6B5E] uppercase tracking-wide">
                      Rate / Acre / दर प्रति एकर
                    </span>

                    {isAdmin &&
                      !editingRate && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRate(
                              true
                            );

                            setNewRate(
                              ratePerAcre
                            );
                          }}
                          className="text-[11px] font-bold text-[#4C9A5A] bg-[#E9F3E9] px-2.5 py-1 rounded-lg"
                        >
                          Edit rate
                        </button>
                      )}
                  </div>

                  {!editingRate ? (
                    <p className="text-xl font-bold text-[#1F2A22] mt-1">
                      ₹
                      {
                        ratePerAcre
                      }

                      <span className="text-sm font-medium text-[#8A968C]">
                        {" "}
                        /acre
                      </span>
                    </p>
                  ) : (
                    <div className="flex gap-2 mt-2">
                      <input
                        type="number"
                        value={
                          newRate
                        }
                        onChange={(
                          e
                        ) =>
                          setNewRate(
                            e
                              .target
                              .value
                          )
                        }
                        className="flex-1 min-w-0 bg-white border rounded-xl px-3.5 py-2 text-sm"
                      />

                      <button
                        type="button"
                        onClick={
                          handleSaveRate
                        }
                        className="shrink-0 bg-[#2B5439] text-white rounded-xl px-3.5 text-sm font-semibold"
                      >
                        Save
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setEditingRate(
                            false
                          )
                        }
                        className="shrink-0 bg-white border rounded-xl px-3.5 text-sm font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                <Field
                  label="Total Bill / एकूण बिल"
                  hint="Auto-calculated from exact plot area × rate — edit if needed"
                >
                  <input
                    type="number"
                    inputMode="decimal"
                    value={
                      totalBill
                    }
                    onChange={(
                      e
                    ) =>
                      setTotalBill(
                        e.target
                          .value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>
              </div>

              {/* PAYMENT */}

              <div className="bg-white rounded-[1.5rem] shadow-sm border border-black/[0.04] p-5 space-y-4">
                <h2 className="text-sm font-bold text-[#1F2A22]">
                  Payment
                </h2>

                <div className="bg-[#F6F2E9] rounded-xl p-3.5">
                  <span className="text-xs font-semibold text-[#5B6B5E] uppercase tracking-wide">
                    Bill Paid? / बिल भरले का?
                  </span>

                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBillPaid(
                          false
                        );

                        setAmountPaid(
                          ""
                        );

                        setApplyDiscount(
                          false
                        );

                        setDiscountAmount(
                          ""
                        );

                        setDiscountReason(
                          ""
                        );
                      }}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${
                        !billPaid
                          ? "bg-[#C24949] text-white"
                          : "bg-white text-[#5B6B5E]"
                      }`}
                    >
                      No
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setBillPaid(
                          true
                        )
                      }
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${
                        billPaid
                          ? "bg-[#4C9A5A] text-white"
                          : "bg-white text-[#5B6B5E]"
                      }`}
                    >
                      Yes
                    </button>
                  </div>

                  {billPaid && (
                    <div className="mt-4 space-y-4">

                      {/* PAYMENT AMOUNT FIRST */}

                      <Field label="Amount Paid / भरलेली रक्कम">
                        <input
                          type="number"
                          inputMode="decimal"
                          value={
                            amountPaid
                          }
                          onChange={(
                            e
                          ) =>
                            setAmountPaid(
                              e
                                .target
                                .value
                            )
                          }
                          max={
                            totalBill ||
                            undefined
                          }
                          placeholder={
                            totalBill
                              ? `Up to ₹${totalBill}`
                              : ""
                          }
                          className="w-full bg-white border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-sm"
                        />
                      </Field>

                      <button
                        type="button"
                        onClick={() =>
                          setAmountPaid(
                            totalBill
                          )
                        }
                        className="text-[11px] font-bold text-[#4C9A5A]"
                      >
                        Full amount
                        (₹
                        {totalBill ||
                          0}
                        )
                      </button>

                      {/* LIVE PENDING */}

                      <div className="bg-white border border-black/[0.06] rounded-xl p-3.5 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] font-bold text-[#5B6B5E] uppercase">
                            Bill Amount / बिल रक्कम
                          </p>

                          <p className="font-bold text-[#1F2A22]">
                            ₹
                            {currentBill}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-[10px] font-bold text-[#C24949] uppercase">
                            Pending / शिल्लक
                          </p>

                          <p className="font-black text-[#C24949] text-lg">
                            ₹
                            {
                              adjustedPending
                            }
                          </p>
                        </div>
                      </div>

                      {/* PAYMENT MODE */}

                      <Field label="Payment Mode / पैसे भरण्याची पद्धत">
                        <select
                          value={
                            paymentMode
                          }
                          onChange={(
                            e
                          ) =>
                            setPaymentMode(
                              e
                                .target
                                .value
                            )
                          }
                          className="w-full bg-white border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-sm"
                        >
                          <option value="Cash">
                            Cash
                          </option>

                          <option value="UPI">
                            UPI
                          </option>

                          <option value="Bank">
                            Bank
                          </option>
                        </select>
                      </Field>

                      {/* UPI QR CODE */}
                      {paymentMode ===
                        "UPI" && (
                        <div className="bg-white border border-black/[0.06] rounded-xl p-3.5 flex flex-col items-center">
                          <p className="text-[11px] font-bold text-[#5B6B5E] uppercase tracking-wide mb-3">
                            Scan to Pay
                            via UPI
                          </p>

                          <img
                            src={
                              UPI_QR_IMAGE
                            }
                            alt="UPI QR Code"
                            className="w-120 h-120 object-contain rounded-xl border border-black/[0.06] bg-white p-2"
                          />

                          <p className="text-[11px] font-medium text-[#8A968C] mt-2 text-center">
                            Ask the
                            farmer to
                            scan this
                            code, then
                            enter the
                            amount paid
                            above.
                          </p>
                        </div>
                      )}

                      {/* DISCOUNT */}

                      <div className="border-t border-black/[0.06] pt-4">
                        <span className="text-xs font-semibold text-[#5B6B5E] uppercase tracking-wide">
                          Apply
                          Discount? / सवलत लागू करायची का?
                        </span>

                        <div className="flex gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setApplyDiscount(
                                false
                              );

                              setDiscountAmount(
                                ""
                              );

                              setDiscountReason(
                                ""
                              );
                            }}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${
                              !applyDiscount
                                ? "bg-[#1F3D2B] text-white"
                                : "bg-white text-[#5B6B5E] border"
                            }`}
                          >
                            No
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setApplyDiscount(
                                true
                              )
                            }
                            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${
                              applyDiscount
                                ? "bg-[#D97706] text-white"
                                : "bg-white text-[#5B6B5E] border"
                            }`}
                          >
                            Yes
                          </button>
                        </div>

                        {applyDiscount && (
                          <div className="space-y-3 mt-4">
                            <Field label="Discount Amount / सवलत रक्कम">
                              <input
                                type="number"
                                inputMode="decimal"
                                value={
                                  discountAmount
                                }
                                onChange={(
                                  e
                                ) =>
                                  setDiscountAmount(
                                    e
                                      .target
                                      .value
                                  )
                                }
                                placeholder="Enter discount"
                                className="w-full bg-white border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-sm"
                              />
                            </Field>

                            <Field label="Discount Reason (optional) / सवलतीचे कारण (ऐच्छिक)">
                              <input
                                value={
                                  discountReason
                                }
                                onChange={(
                                  e
                                ) =>
                                  setDiscountReason(
                                    e
                                      .target
                                      .value
                                  )
                                }
                                placeholder="e.g. Regular customer"
                                className="w-full bg-white border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-sm"
                              />
                            </Field>

                            <div className="bg-[#FEF3C7]/60 rounded-xl p-3.5 flex justify-between items-center">
                              <span className="text-xs font-bold text-[#D97706]">
                                Final
                                Pending / अंतिम शिल्लक
                              </span>

                              <span className="font-black text-[#D97706] text-lg">
                                ₹
                                {
                                  adjustedPending
                                }
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {exceedsBill && (
                        <div className="bg-[#FCEDED] rounded-xl p-3">
                          <p className="text-[#C24949] text-xs font-semibold">
                            Payment
                            and
                            discount
                            together
                            cannot
                            exceed
                            total
                            bill.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* EXTRAS */}

              <div className="bg-white rounded-[1.5rem] shadow-sm border border-black/[0.04] p-5 space-y-4">
                <h2 className="text-sm font-bold text-[#1F2A22]">
                  Optional
                </h2>

                <Field label="Bill / Receipt Photo (optional) / बिल / पावतीचा फोटो (ऐच्छिक)">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(
                      e
                    ) =>
                      setBillImageFile(
                        e.target
                          .files[0] ||
                          null
                      )
                    }
                    className="w-full bg-[#F6F2E9] border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </Field>

                <Field label="Notes / टीप">
                  <textarea
                    value={
                      notes
                    }
                    onChange={(
                      e
                    ) =>
                      setNotes(
                        e.target
                          .value
                      )
                    }
                    rows={2}
                    className={
                      inputClass
                    }
                  />
                </Field>
              </div>

              {duplicateBillMsg && (
                <div
                  ref={duplicateBoxRef}
                  className="bg-[#FCEDED] border border-[#C24949]/40 ring-2 ring-[#C24949]/10 rounded-xl px-3 py-2.5 space-y-2"
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

                        const el =
                          billInputRef.current;

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
                      onClick={() => {
                        allowDuplicateRef.current = true;

                        setDuplicateBillMsg("");

                        handleSubmit({
                          preventDefault: () => {},
                        });
                      }}
                      className="flex-1 min-w-0 bg-white border border-[#C24949]/40 text-[#C24949] rounded-lg py-2 text-[11px] leading-tight font-semibold active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      Continue anyway
                      <br />
                      तरीही पुढे जा
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-[#FCEDED] border border-[#F3C6C6] rounded-2xl px-4 py-3">
                  <p className="text-[#C24949] text-sm font-semibold">
                    {error}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={
                  loading ||
                  exceedsBill
                }
                className="w-full bg-[#2B5439] text-white rounded-2xl py-3.5 font-bold text-sm shadow-sm disabled:opacity-50"
              >
                {loading
                  ? "Saving..."
                  : "Add Service"}
              </button>
            </form>
          )}

        {/* SUCCESS */}

        {savedService && (
          <div className="bg-white rounded-[1.5rem] shadow-sm border border-black/[0.04] p-5 space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-[#E9F3E9] flex items-center justify-center">
                ✓
              </div>

              <p className="font-bold text-[#1F2A22]">
                Service added
                successfully
              </p>
            </div>

            <p className="text-sm text-[#5B6B5E]">
              Notify{" "}
              {
                farmer.fullName
              }
              ?
            </p>

            <SendMessageButtons
              mobile={
                farmer.mobile
              }
              message={buildServiceMessage(
                farmer,
                savedService
              )}
            />

           {isAdmin ? (
  <button
    onClick={() =>
      navigate(
        `/farmers/${farmer._id}`
      )
    }
    className="w-full text-sm text-[#8A968C] font-medium mt-1 py-2"
  >
    Skip, go to
    farmer profile →
  </button>
) : (
  <button
    onClick={() => {
      setSavedService(null);
      setFarmer(null);
      setMode("search");
      setVillage("");
      setCropName("");
      setCropOther("");
      setCropOtherError("");
      setServiceType("");
      setServiceTypeOther("");
      setServiceTypeOtherError("");
      setPlotR("");
      setAcres("");
      setHasBillNo(true);
      setBillNo("");
      setPlotName("");
      setTotalBill("");
      setPaymentMode("Cash");
      setNotes("");
      setBillImageFile(null);
      setBillPaid(false);
      setAmountPaid("");
      setApplyDiscount(false);
      setDiscountAmount("");
      setDiscountReason("");
    }}
    className="w-full bg-[#4C9A5A] text-white rounded-2xl py-3 font-bold text-sm mt-1"
  >
    Add Another Service
  </button>
)}
          </div>
        )}
      </div>
    </div>
  );
}