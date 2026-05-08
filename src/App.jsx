import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

const serviceOptions = [
  "Flyttstadning",
  "Visningsstadning",
  "Fonsterputs",
  "Hemstadning",
  "Storstadning",
  "Trappstadning BRFer",
  "Byggstadning",
  "Foretagsstadning"
];

const servicesRequiringPropertyFields = [
  "Flyttstadning",
  "Hemstadning",
  "Storstadning",
  "Byggstadning",
  "Visningsstadning"
];

const servicesRequiringFrequency = ["Foretagsstadning", "Hemstadning"];

const propertyTypeOptions = [
  { value: "lagenhet", label: "Lagenhet" },
  { value: "radhus", label: "Radhus" },
  { value: "villa", label: "Villa" }
];

const windowTypeOptions = [
  "2-sidiga (In/utvandiga)",
  "4-sidiga (In/utvandiga samt emellan)",
  "Annan"
];

const yesNoOptions = ["Ja", "Nej"];

const frequencyOptions = [
  "Engångsstädning",
  "1 gång/vecka",
  "2 gånger/vecka",
  "Varje dag",
  "1 gång/månad",
  "2 gånger/månad"
];

const businessLocalTypeOptions = ["Kontor", "Butik", "Industri"];

const stairFrequencyOptions = [
  "1 gång/vecka",
  "Varannan vecka",
  "1 gång/månad"
];

const initialForm = {
  serviceType: "",
  propertyType: "",
  numRooms: "",
  squareMeters: "",
  frequency: "",
  businessLocalType: "",
  workstations: "",
  stairFrequency: "",
  windowCount: "",
  windowType: "",
  glazedBalcony: "",
  balconyWindowCount: "",
  stairwells: "",
  floors: "",
  elevators: "",
  city: "",
  phone: "",
  email: "",
  consent: false
};

function BookingPage({ bookingToken }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offer, setOffer] = useState(null);
  const [existingBooking, setExistingBooking] = useState(null);
  const [requestedDate, setRequestedDate] = useState("");
  const [acceptedOffer, setAcceptedOffer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function fetchBookingContext() {
      if (!isSupabaseConfigured || !supabase) {
        if (mounted) {
          setError("Supabase ar inte konfigurerat.");
          setLoading(false);
        }
        return;
      }

      const { data, error: invokeError } = await supabase.functions.invoke("booking-offer", {
        body: { action: "get", token: bookingToken }
      });

      if (!mounted) return;
      if (invokeError || data?.error) {
        setError(data?.error || invokeError?.message || "Kunde inte hamta offert.");
        setLoading(false);
        return;
      }

      setOffer(data?.offer ?? null);
      setExistingBooking(data?.booking ?? null);
      setRequestedDate(data?.booking?.requested_date ?? "");
      setAcceptedOffer(Boolean(data?.booking?.accepted_offer));
      setLoading(false);
    }

    fetchBookingContext();
    return () => {
      mounted = false;
    };
  }, [bookingToken]);

  async function handleBookingSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!requestedDate) {
      setError("Valj ett datum for bokning.");
      return;
    }
    if (!acceptedOffer) {
      setError("Du maste acceptera offerten for att boka.");
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      setError("Supabase ar inte konfigurerat.");
      return;
    }

    setSubmitting(true);
    const { data, error: invokeError } = await supabase.functions.invoke("booking-offer", {
      body: {
        action: "book",
        token: bookingToken,
        requestedDate,
        acceptedOffer: true
      }
    });
    setSubmitting(false);

    if (invokeError || data?.error) {
      setError(data?.error || invokeError?.message || "Kunde inte spara bokningen.");
      return;
    }

    setExistingBooking(data?.booking ?? null);
    setSuccessMessage("Tack! Din bokning ar registrerad.");
  }

  if (loading) {
    return (
      <main className="page">
        <section className="form-card">
          <h1>Hamta bokningssida...</h1>
        </section>
      </main>
    );
  }

  if (error && !offer) {
    return (
      <main className="page">
        <section className="form-card">
          <h1>Bokning</h1>
          <div className="error submit-error">{error}</div>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="form-card">
        <h1>Boka din tid</h1>
        {offer && (
          <div style={{ marginBottom: "1rem" }}>
            <p><strong>Tjanst:</strong> {offer.service_type}</p>
            <p><strong>Stad:</strong> {offer.city}</p>
            <p><strong>Offert:</strong> {Number(offer.offert).toFixed(2)} kr</p>
          </div>
        )}

        <form onSubmit={handleBookingSubmit} noValidate>
          <div className="field">
            <label htmlFor="requestedDate">Valj datum for tjansten</label>
            <input
              id="requestedDate"
              type="date"
              value={requestedDate}
              onChange={(e) => setRequestedDate(e.target.value)}
              required
            />
          </div>

          <div className="field checkbox-row">
            <input
              id="acceptedOffer"
              type="checkbox"
              checked={acceptedOffer}
              onChange={(e) => setAcceptedOffer(e.target.checked)}
              required
            />
            <label htmlFor="acceptedOffer">Jag accepterar offerten</label>
          </div>

          {error && <div className="error submit-error">{error}</div>}
          {existingBooking && (
            <div className="ok-message show">
              Tidigare bokning: {existingBooking.requested_date}
            </div>
          )}
          {successMessage && <div className="ok-message show">{successMessage}</div>}

          <button type="submit" disabled={submitting}>
            {submitting ? "Sparar..." : "Boka min tid"}
          </button>
        </form>
      </section>
    </main>
  );
}

function App() {
  const bookingToken = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("bookingToken")?.trim() ?? "";
  }, []);

  if (bookingToken) {
    return <BookingPage bookingToken={bookingToken} />;
  }

  const [form, setForm] = useState(initialForm);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitState, setSubmitState] = useState({
    loading: false,
    error: ""
  });

  const errors = useMemo(() => {
    const propertyFieldsRequired = servicesRequiringPropertyFields.includes(form.serviceType);
    const isStairService = form.serviceType === "Trappstadning BRFer";
    const isWindowService = form.serviceType === "Fonsterputs";
    const isBusinessService = form.serviceType === "Foretagsstadning";
    const businessSqm = Number(form.squareMeters);

    return {
      serviceType: form.serviceType ? "" : "Valj en tjanst.",
      propertyType: propertyFieldsRequired || isWindowService
        ? propertyTypeOptions.some((option) => option.value === form.propertyType)
          ? ""
          : "Valj boendetyp."
        : "",
      numRooms: propertyFieldsRequired
        ? /^[0-9]+$/.test(form.numRooms)
          ? ""
          : "Ange endast siffror."
        : "",
      squareMeters: isWindowService
        ? ""
        : isStairService
        ? /^[0-9]+$/.test(form.squareMeters)
          ? ""
          : "Ange endast siffror."
        : isBusinessService
          ? /^[0-9]+$/.test(form.squareMeters) && Number.isFinite(businessSqm) && businessSqm >= 50
            ? ""
            : "Ange ett nummer som är 50 eller större."
        : /^[0-9]+$/.test(form.squareMeters)
          ? ""
          : "Ange endast siffror.",
      stairwells: isStairService
        ? /^[0-9]+$/.test(form.stairwells)
          ? ""
          : "Ange endast siffror."
        : "",
      floors: isStairService
        ? /^[0-9]+$/.test(form.floors)
          ? ""
          : "Ange endast siffror."
        : "",
      elevators: isStairService
        ? /^[0-9]+$/.test(form.elevators)
          ? ""
          : "Ange endast siffror."
        : "",
      frequency:
        servicesRequiringFrequency.includes(form.serviceType)
          ? frequencyOptions.includes(form.frequency)
            ? ""
            : "Valj stadfrekvens."
          : "",
      businessLocalType:
        form.serviceType === "Foretagsstadning"
          ? businessLocalTypeOptions.includes(form.businessLocalType)
            ? ""
            : "Valj typ av lokal."
          : "",
      workstations:
        form.serviceType === "Foretagsstadning" && form.businessLocalType === "Kontor"
          ? /^[0-9]+$/.test(form.workstations)
            ? ""
            : "Ange endast siffror."
          : "",
      stairFrequency:
        isStairService
          ? stairFrequencyOptions.includes(form.stairFrequency)
            ? ""
            : "Valj stadfrekvens."
          : "",
      windowCount: isWindowService
        ? /^[0-9]+$/.test(form.windowCount)
          ? ""
          : "Ange endast siffror."
        : "",
      windowType: isWindowService
        ? windowTypeOptions.includes(form.windowType)
          ? ""
          : "Valj fonstertyp."
        : "",
      glazedBalcony: isWindowService
        ? yesNoOptions.includes(form.glazedBalcony)
          ? ""
          : "Valj Ja eller Nej."
        : "",
      balconyWindowCount:
        isWindowService && form.glazedBalcony === "Ja"
          ? /^[0-9]+$/.test(form.balconyWindowCount)
            ? ""
            : "Ange endast siffror."
          : "",
      city: /^[A-Za-z ]+$/.test(form.city.trim()) ? "" : "Ange endast bokstaver.",
      phone: /^[0-9]+$/.test(form.phone) ? "" : "Ange endast siffror.",
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
        ? ""
        : "Ange en giltig e-postadress.",
      consent: form.consent
        ? ""
        : "Du behover lamna samtycke for att ga vidare."
    };
  }, [form]);

  const hasErrors = Object.values(errors).some(Boolean);

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function markTouched(name) {
    setTouched((prev) => ({ ...prev, [name]: true }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setTouched({
      serviceType: true,
      propertyType: true,
      numRooms: true,
      squareMeters: true,
      frequency: true,
      businessLocalType: true,
      workstations: true,
      stairFrequency: true,
      windowCount: true,
      windowType: true,
      glazedBalcony: true,
      balconyWindowCount: true,
      stairwells: true,
      floors: true,
      elevators: true,
      city: true,
      phone: true,
      email: true,
      consent: true
    });
    setSubmitted(false);
    setSubmitState({ loading: false, error: "" });

    if (hasErrors) {
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setSubmitState({
        loading: false,
        error: "Supabase ar inte konfigurerat. Kontrollera dina miljo-variabler."
      });
      return;
    }

    setSubmitState({ loading: true, error: "" });

    const { data, error } = await supabase.functions.invoke("calculate-offer", {
      body: {
        serviceType: form.serviceType,
        propertyType: form.propertyType,
        numRooms: Number(form.numRooms),
        squareMeters: Number(form.squareMeters),
        frequency: form.frequency,
        businessLocalType: form.businessLocalType,
        workstations: Number(form.workstations),
        windowCount: Number(form.windowCount),
        windowType: form.windowType,
        glazedBalcony: form.glazedBalcony,
        balconyWindowCount: Number(form.balconyWindowCount),
        city: form.city.trim(),
        phone: form.phone,
        email: form.email.trim(),
        bookingPageUrl:
          typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "",
        consent: form.consent
      }
    });

    if (error) {
      const detail =
        (data && typeof data === "object" && data.error && String(data.error)) ||
        error.message ||
        "";
      setSubmitState({
        loading: false,
        error: detail
          ? "Kunde inte berakna offert: " + detail
          : "Kunde inte berakna offert. Kontrollera edge function calculate-offer samt tabellerna kund_offert/offert_förfrågan."
      });
      return;
    }

    setSubmitState({ loading: false, error: "" });
    setSubmitted(true);
    setForm(initialForm);
    setTouched({});
  }

  const showError = (name) => touched[name] && Boolean(errors[name]);

  return (
    <main className="page">
      <form className="form-card" onSubmit={handleSubmit} noValidate>
        <h1>Fa en prisuppskattning</h1>

        <div className={`field ${showError("serviceType") ? "has-error" : ""}`}>
          <label htmlFor="serviceType">Typ av tjanst</label>
          <select
            id="serviceType"
            value={form.serviceType}
            onChange={(e) => {
              const value = e.target.value;
              setField("serviceType", value);

              if (!servicesRequiringPropertyFields.includes(value)) {
                setForm((prev) => ({
                  ...prev,
                  propertyType: "",
                  numRooms: ""
                }));
                setTouched((prev) => ({
                  ...prev,
                  propertyType: false,
                  numRooms: false
                }));
              }

              if (value === "Trappstadning BRFer") {
                setForm((prev) => ({
                  ...prev,
                  squareMeters: ""
                }));
                setTouched((prev) => ({
                  ...prev,
                  squareMeters: false
                }));
              } else {
                setForm((prev) => ({
                  ...prev,
                  stairFrequency: "",
                  stairwells: "",
                  floors: "",
                  elevators: ""
                }));
                setTouched((prev) => ({
                  ...prev,
                  stairFrequency: false,
                  stairwells: false,
                  floors: false,
                  elevators: false
                }));
              }

              if (!servicesRequiringFrequency.includes(value)) {
                setForm((prev) => ({
                  ...prev,
                  frequency: ""
                }));
                setTouched((prev) => ({
                  ...prev,
                  frequency: false,
                }));
              }

              if (value !== "Foretagsstadning") {
                setForm((prev) => ({
                  ...prev,
                  businessLocalType: "",
                  workstations: ""
                }));
                setTouched((prev) => ({
                  ...prev,
                  businessLocalType: false,
                  workstations: false
                }));
              }

              if (value !== "Fonsterputs") {
                setForm((prev) => ({
                  ...prev,
                  windowCount: "",
                  windowType: "",
                  glazedBalcony: "",
                  balconyWindowCount: ""
                }));
                setTouched((prev) => ({
                  ...prev,
                  windowCount: false,
                  windowType: false,
                  glazedBalcony: false,
                  balconyWindowCount: false
                }));
              }
            }}
            onBlur={() => markTouched("serviceType")}
            required
          >
            <option value="">Valj tjanst</option>
            {serviceOptions.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
          {showError("serviceType") && <div className="error">{errors.serviceType}</div>}
        </div>

        {form.serviceType === "Foretagsstadning" && (
          <div className={`field ${showError("businessLocalType") ? "has-error" : ""}`}>
            <label htmlFor="businessLocalType">Typ av lokal</label>
            <select
              id="businessLocalType"
              value={form.businessLocalType}
              onChange={(e) => {
                const value = e.target.value;
                setField("businessLocalType", value);
                if (value !== "Kontor") {
                  setField("workstations", "");
                  setTouched((prev) => ({ ...prev, workstations: false }));
                }
              }}
              onBlur={() => markTouched("businessLocalType")}
              required
            >
              <option value="">Valj typ av lokal</option>
              {businessLocalTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {showError("businessLocalType") && <div className="error">{errors.businessLocalType}</div>}
          </div>
        )}

        {(servicesRequiringPropertyFields.includes(form.serviceType) ||
          form.serviceType === "Fonsterputs") && (
          <>
            <div className={`field ${showError("propertyType") ? "has-error" : ""}`}>
              <label htmlFor="propertyType">Boendetyp</label>
              <select
                id="propertyType"
                value={form.propertyType}
                onChange={(e) => setField("propertyType", e.target.value)}
                onBlur={() => markTouched("propertyType")}
                required
              >
                <option value="">Valj boendetyp</option>
                {propertyTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {showError("propertyType") && <div className="error">{errors.propertyType}</div>}
            </div>

            {servicesRequiringPropertyFields.includes(form.serviceType) && (
              <div className={`field ${showError("numRooms") ? "has-error" : ""}`}>
                <label htmlFor="numRooms">Antal rum</label>
                <input
                  id="numRooms"
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  value={form.numRooms}
                  onChange={(e) => setField("numRooms", e.target.value.replace(/\D/g, ""))}
                  onBlur={() => markTouched("numRooms")}
                  required
                />
                {showError("numRooms") && <div className="error">{errors.numRooms}</div>}
              </div>
            )}
          </>
        )}

        {form.serviceType === "Trappstadning BRFer" ? (
          <>
            <div className={`field ${showError("stairwells") ? "has-error" : ""}`}>
              <label htmlFor="stairwells">Antal trapphus</label>
              <input
                id="stairwells"
                type="text"
                inputMode="numeric"
                maxLength={3}
                value={form.stairwells}
                onChange={(e) => setField("stairwells", e.target.value.replace(/\D/g, ""))}
                onBlur={() => markTouched("stairwells")}
                required
              />
              {showError("stairwells") && <div className="error">{errors.stairwells}</div>}
            </div>

            <div className={`field ${showError("floors") ? "has-error" : ""}`}>
              <label htmlFor="floors">Antal våningar</label>
              <input
                id="floors"
                type="text"
                inputMode="numeric"
                maxLength={3}
                value={form.floors}
                onChange={(e) => setField("floors", e.target.value.replace(/\D/g, ""))}
                onBlur={() => markTouched("floors")}
                required
              />
              {showError("floors") && <div className="error">{errors.floors}</div>}
            </div>

            <div className={`field ${showError("elevators") ? "has-error" : ""}`}>
              <label htmlFor="elevators">Antal hissar</label>
              <input
                id="elevators"
                type="text"
                inputMode="numeric"
                maxLength={3}
                value={form.elevators}
                onChange={(e) => setField("elevators", e.target.value.replace(/\D/g, ""))}
                onBlur={() => markTouched("elevators")}
                required
              />
              {showError("elevators") && <div className="error">{errors.elevators}</div>}
            </div>

            <div className={`field ${showError("squareMeters") ? "has-error" : ""}`}>
              <label htmlFor="squareMeters">Antal kvadratmeter</label>
              <input
                id="squareMeters"
                type="text"
                inputMode="numeric"
                maxLength={5}
                value={form.squareMeters}
                onChange={(e) => setField("squareMeters", e.target.value.replace(/\D/g, ""))}
                onBlur={() => markTouched("squareMeters")}
                required
              />
              {showError("squareMeters") && <div className="error">{errors.squareMeters}</div>}
            </div>

            <div className={`field ${showError("stairFrequency") ? "has-error" : ""}`}>
              <label htmlFor="stairFrequency">Städfrekvens</label>
              <select
                id="stairFrequency"
                value={form.stairFrequency}
                onChange={(e) => setField("stairFrequency", e.target.value)}
                onBlur={() => markTouched("stairFrequency")}
                required
              >
                <option value="">Valj frekvens</option>
                {stairFrequencyOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {showError("stairFrequency") && <div className="error">{errors.stairFrequency}</div>}
            </div>
          </>
        ) : form.serviceType === "Fonsterputs" ? (
          <>
            <div className={`field ${showError("windowCount") ? "has-error" : ""}`}>
              <label htmlFor="windowCount">Antal fönster</label>
              <input
                id="windowCount"
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={form.windowCount}
                onChange={(e) => setField("windowCount", e.target.value.replace(/\D/g, ""))}
                onBlur={() => markTouched("windowCount")}
                required
              />
              {showError("windowCount") && <div className="error">{errors.windowCount}</div>}
            </div>

            <div className={`field ${showError("windowType") ? "has-error" : ""}`}>
              <label htmlFor="windowType">Fönstertyp</label>
              <select
                id="windowType"
                value={form.windowType}
                onChange={(e) => setField("windowType", e.target.value)}
                onBlur={() => markTouched("windowType")}
                required
              >
                <option value="">Valj fonstertyp</option>
                {windowTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {showError("windowType") && <div className="error">{errors.windowType}</div>}
            </div>

            <div className={`field ${showError("glazedBalcony") ? "has-error" : ""}`}>
              <label htmlFor="glazedBalcony">Finns inglasad balkong?</label>
              <select
                id="glazedBalcony"
                value={form.glazedBalcony}
                onChange={(e) => {
                  const value = e.target.value;
                  setField("glazedBalcony", value);
                  if (value !== "Ja") {
                    setField("balconyWindowCount", "");
                    setTouched((prev) => ({ ...prev, balconyWindowCount: false }));
                  }
                }}
                onBlur={() => markTouched("glazedBalcony")}
                required
              >
                <option value="">Valj Ja eller Nej</option>
                {yesNoOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {showError("glazedBalcony") && <div className="error">{errors.glazedBalcony}</div>}
            </div>

            {form.glazedBalcony === "Ja" && (
              <div className={`field ${showError("balconyWindowCount") ? "has-error" : ""}`}>
                <label htmlFor="balconyWindowCount">Antal fönster (inglasad balkong)</label>
                <input
                  id="balconyWindowCount"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={form.balconyWindowCount}
                  onChange={(e) => setField("balconyWindowCount", e.target.value.replace(/\D/g, ""))}
                  onBlur={() => markTouched("balconyWindowCount")}
                  required
                />
                {showError("balconyWindowCount") && (
                  <div className="error">{errors.balconyWindowCount}</div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div className={`field ${showError("squareMeters") ? "has-error" : ""}`}>
              <label htmlFor="squareMeters">Antal kvadratmeter</label>
              <input
                id="squareMeters"
                type="text"
                inputMode="numeric"
                maxLength={5}
                value={form.squareMeters}
                onChange={(e) => setField("squareMeters", e.target.value.replace(/\D/g, ""))}
                onBlur={() => markTouched("squareMeters")}
                required
              />
              {showError("squareMeters") && <div className="error">{errors.squareMeters}</div>}
            </div>

            {servicesRequiringFrequency.includes(form.serviceType) && (
              <>
                {form.businessLocalType === "Kontor" && (
                  <div className={`field ${showError("workstations") ? "has-error" : ""}`}>
                    <label htmlFor="workstations">Antal arbetsplatser</label>
                    <input
                      id="workstations"
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      value={form.workstations}
                      onChange={(e) => setField("workstations", e.target.value.replace(/\D/g, ""))}
                      onBlur={() => markTouched("workstations")}
                      required
                    />
                    {showError("workstations") && <div className="error">{errors.workstations}</div>}
                  </div>
                )}

                <div className={`field ${showError("frequency") ? "has-error" : ""}`}>
                  <label htmlFor="frequency">Städfrekvens</label>
                  <select
                    id="frequency"
                    value={form.frequency}
                    onChange={(e) => setField("frequency", e.target.value)}
                    onBlur={() => markTouched("frequency")}
                    required
                  >
                    <option value="">Valj frekvens</option>
                    {frequencyOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {showError("frequency") && <div className="error">{errors.frequency}</div>}
                </div>
              </>
            )}
          </>
        )}

        <div className={`field ${showError("city") ? "has-error" : ""}`}>
          <label htmlFor="city">Stad</label>
          <input
            id="city"
            type="text"
            maxLength={50}
            value={form.city}
            onChange={(e) => setField("city", e.target.value.replace(/[^A-Za-z ]/g, ""))}
            onBlur={() => markTouched("city")}
            required
          />
          {showError("city") && <div className="error">{errors.city}</div>}
        </div>

        <div className={`field ${showError("phone") ? "has-error" : ""}`}>
          <label htmlFor="phone">Telefonnummer</label>
          <input
            id="phone"
            type="text"
            inputMode="numeric"
            maxLength={15}
            value={form.phone}
            onChange={(e) => setField("phone", e.target.value.replace(/\D/g, ""))}
            onBlur={() => markTouched("phone")}
            required
          />
          {showError("phone") && <div className="error">{errors.phone}</div>}
        </div>

        <div className={`field ${showError("email") ? "has-error" : ""}`}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            onBlur={() => markTouched("email")}
            required
          />
          {showError("email") && <div className="error">{errors.email}</div>}
        </div>

        <div className="field checkbox-row">
          <input
            id="consent"
            type="checkbox"
            checked={form.consent}
            onChange={(e) => setField("consent", e.target.checked)}
            onBlur={() => markTouched("consent")}
            required
          />
          <label htmlFor="consent">
            Jag samtycker till att motta kommunikation i enlighet med integrationspolicy
          </label>
        </div>
        {showError("consent") && <div className="error consent-error">{errors.consent}</div>}

        <button type="submit" disabled={submitState.loading}>
          {submitState.loading ? "Skickar..." : "Berakna mitt pris"}
        </button>
        {submitState.error && <div className="error submit-error">{submitState.error}</div>}
        {submitted && <div className="ok-message show">Tack! Din forfragan har skickats.</div>}
      </form>
    </main>
  );
}

export default App;
