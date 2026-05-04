import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  createCouponApi,
  getCouponsApi,
  getLeadsApi,
  submitLeadApi,
  validateCouponApi
} from "./api";

const CITY_OPTIONS = [
  "Delhi",
  "Mumbai",
  "Bengaluru",
  "Pune",
  "Hyderabad",
  "Chennai",
  "Coimbatore",
  "Madurai",
  "Tiruchirappalli",
  "Salem",
  "Tirunelveli",
  "Erode",
  "Vellore",
  "Thoothukudi",
  "Dindigul",
  "Thanjavur",
  "Nagercoil",
  "Kanchipuram",
  "Karur",
  "Cuddalore"
];
const REQUIREMENT_OPTIONS = ["Service", "Product", "Consultation"];
const BUDGET_OPTIONS = [
  { label: "Below 500", value: "Below 500", basePrice: 400 },
  { label: "500 - 1000", value: "500 - 1000", basePrice: 800 },
  { label: "1000 - 5000", value: "1000 - 5000", basePrice: 2500 },
  { label: "5000+", value: "5000+", basePrice: 6000 }
];

const initialForm = {
  name: "",
  phoneNumber: "",
  email: "",
  city: "",
  requirementType: "Service",
  budgetRange: BUDGET_OPTIONS[0].value,
  message: "",
  couponCode: ""
};

const initialCouponForm = {
  code: "",
  discountType: "PERCENTAGE",
  discountValue: "",
  minOrderValue: "",
  requirementType: "ALL",
  maxUsage: "100",
  expiresAt: "",
  isFirstTimeOnly: false
};
const initialLeadFilters = {
  search: "",
  requirementType: "ALL",
  city: "ALL",
  couponStatus: "ALL"
};
const initialCouponFilters = {
  search: "",
  discountType: "ALL",
  requirementType: "ALL",
  status: "ALL"
};

const phoneRegex = /^[6-9]\d{9}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const APP_PAGES = ["Dashboard", "New Lead / Lead Form", "Coupons"];
const ALLOWED_IMPORT_EXTENSIONS = [".xls", ".xlsx", ".xlsm"];

const getBasePriceByBudget = (budgetValue) => {
  const budget = BUDGET_OPTIONS.find((item) => item.value === budgetValue);
  return budget?.basePrice ?? 0;
};

export default function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [form, setForm] = useState(initialForm);
  const [couponState, setCouponState] = useState({
    applied: false,
    discountAmount: 0,
    finalPrice: getBasePriceByBudget(initialForm.budgetRange),
    message: "",
    error: ""
  });
  const [formError, setFormError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportPanelOpen, setIsImportPanelOpen] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leads, setLeads] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);
  const [couponFormMessage, setCouponFormMessage] = useState("");
  const [couponForm, setCouponForm] = useState(initialCouponForm);
  const [leadFilters, setLeadFilters] = useState(initialLeadFilters);
  const [couponFilters, setCouponFilters] = useState(initialCouponFilters);

  const basePrice = useMemo(
    () => getBasePriceByBudget(form.budgetRange),
    [form.budgetRange]
  );
  const totalLeads = leads.length;
  const totalRevenue = leads.reduce((acc, item) => acc + (item.finalPrice || 0), 0);
  const totalDiscount = leads.reduce((acc, item) => acc + (item.discountAmount || 0), 0);
  const couponUsageRate = totalLeads
    ? Math.round((leads.filter((item) => item.couponCode).length / totalLeads) * 100)
    : 0;
  const leadsByType = REQUIREMENT_OPTIONS.map((type) => ({
    type,
    count: leads.filter((lead) => lead.requirementType === type).length
  }));
  const maxTypeCount = Math.max(...leadsByType.map((item) => item.count), 1);

  const validateForm = () => {
    if (!form.name.trim()) return "Name is required.";
    if (!phoneRegex.test(form.phoneNumber.trim())) return "Phone number is invalid.";
    if (!emailRegex.test(form.email.trim().toLowerCase())) return "Email is invalid.";
    if (!form.city) return "Please select city.";
    if (!form.requirementType) return "Please select requirement type.";
    if (!form.budgetRange) return "Please select budget range.";
    if (basePrice <= 0) return "Invalid base price from budget range.";
    return "";
  };

  useEffect(() => {
    setCouponState((prev) => ({
      ...prev,
      applied: false,
      discountAmount: 0,
      finalPrice: basePrice,
      message: "",
      error: prev.error
    }));
  }, [basePrice, form.requirementType]);

  const fetchLeads = async (filters = leadFilters) => {
    setLoadingLeads(true);
    try {
      const response = await getLeadsApi({
        search: filters.search.trim(),
        requirementType:
          filters.requirementType === "ALL" ? undefined : filters.requirementType,
        city: filters.city === "ALL" ? undefined : filters.city,
        couponStatus:
          filters.couponStatus === "ALL" ? undefined : filters.couponStatus
      });
      setLeads(response.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingLeads(false);
    }
  };

  const fetchCoupons = async (filters = couponFilters) => {
    setIsLoadingCoupons(true);
    try {
      const response = await getCouponsApi({
        search: filters.search.trim(),
        discountType:
          filters.discountType === "ALL" ? undefined : filters.discountType,
        requirementType:
          filters.requirementType === "ALL" ? undefined : filters.requirementType,
        status: filters.status === "ALL" ? undefined : filters.status
      });
      setCoupons(response.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingCoupons(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchCoupons();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchLeads(leadFilters);
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [leadFilters]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchCoupons(couponFilters);
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [couponFilters]);

  const onInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFormError("");
    setSubmitSuccess("");
  };

  const handleApplyCoupon = async () => {
    setFormError("");
    setSubmitSuccess("");
    setCouponState((prev) => ({ ...prev, error: "", message: "" }));

    const validationError = validateForm();
    if (validationError) {
      setFormError(`Complete valid mandatory fields before coupon: ${validationError}`);
      return;
    }

    if (!form.couponCode.trim()) {
      setCouponState((prev) => ({ ...prev, error: "Please enter a coupon code." }));
      return;
    }

    setIsApplyingCoupon(true);
    try {
      const response = await validateCouponApi({
        couponCode: form.couponCode.trim(),
        requirementType: form.requirementType,
        basePrice,
        email: form.email.trim().toLowerCase(),
        phoneNumber: form.phoneNumber.trim()
      });

      setCouponState({
        applied: true,
        discountAmount: response.data.discountAmount,
        finalPrice: response.data.finalPrice,
        message: response.message,
        error: ""
      });
    } catch (error) {
      const message =
        error.response?.data?.message || "Could not apply coupon. Please try again.";
      setCouponState({
        applied: false,
        discountAmount: 0,
        finalPrice: basePrice,
        message: "",
        error: message
      });
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    setSubmitSuccess("");

    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await submitLeadApi({
        ...form,
        email: form.email.trim().toLowerCase(),
        phoneNumber: form.phoneNumber.trim(),
        basePrice
      });

      setSubmitSuccess(response.message);
      setForm(initialForm);
      setCouponState({
        applied: false,
        discountAmount: 0,
        finalPrice: getBasePriceByBudget(initialForm.budgetRange),
        message: "",
        error: ""
      });
      fetchLeads();
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to submit lead. Please try again.";
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportLeads = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportMessage("");
    setIsImporting(true);

    try {
      const normalizedName = file.name.toLowerCase();
      const isValidExtension = ALLOWED_IMPORT_EXTENSIONS.some((extension) =>
        normalizedName.endsWith(extension)
      );

      if (!isValidExtension) {
        setImportMessage("Invalid format. Please upload only .xls, .xlsx, or .xlsm files.");
        return;
      }

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const firstSheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

      if (!rows.length) {
        setImportMessage("No valid rows found in the selected sheet.");
        return;
      }

      let successCount = 0;
      let failedCount = 0;

      for (const row of rows) {
        const budgetRange = row.budgetRange || BUDGET_OPTIONS[0].value;
        const payload = {
          name: row.name || "",
          phoneNumber: row.phoneNumber || "",
          email: (row.email || "").toLowerCase(),
          city: row.city || "",
          requirementType: row.requirementType || "Service",
          budgetRange,
          basePrice: Number(row.basePrice) || getBasePriceByBudget(budgetRange),
          message: row.message || "",
          couponCode: row.couponCode || ""
        };

        try {
          await submitLeadApi(payload);
          successCount += 1;
        } catch (_error) {
          failedCount += 1;
        }
      }

      setImportMessage(
        `Import finished: ${successCount} added, ${failedCount} failed out of ${rows.length}.`
      );
      fetchLeads();
    } catch (_error) {
      setImportMessage("Could not read Excel file. Please check file format and retry.");
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  };

  const handleCouponFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setCouponForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
    setCouponFormMessage("");
  };

  const handleLeadFilterChange = (event) => {
    const { name, value } = event.target;
    setLeadFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleCouponFilterChange = (event) => {
    const { name, value } = event.target;
    setCouponFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetLeadFilters = () => {
    setLeadFilters(initialLeadFilters);
  };

  const resetCouponFilters = () => {
    setCouponFilters(initialCouponFilters);
  };

  const handleExportLeads = () => {
    const rows = leads.map((lead) => ({
      Name: lead.name,
      Email: lead.email,
      Phone: lead.phoneNumber,
      City: lead.city,
      RequirementType: lead.requirementType,
      BudgetRange: lead.budgetRange,
      BasePrice: lead.basePrice,
      CouponCode: lead.couponCode || "",
      DiscountAmount: lead.discountAmount || 0,
      FinalPrice: lead.finalPrice || 0,
      Message: lead.message || "",
      SubmittedAt: new Date(lead.createdAt).toLocaleString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
    XLSX.writeFile(workbook, `leads-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleCreateCoupon = async (event) => {
    event.preventDefault();
    setCouponFormMessage("");

    if (!couponForm.code.trim()) {
      setCouponFormMessage("Coupon code is required.");
      return;
    }

    if (!couponForm.discountValue || Number(couponForm.discountValue) <= 0) {
      setCouponFormMessage("Discount value should be greater than 0.");
      return;
    }

    if (!couponForm.expiresAt) {
      setCouponFormMessage("Expiry date is required.");
      return;
    }

    setIsCreatingCoupon(true);
    try {
      await createCouponApi({
        code: couponForm.code.trim().toUpperCase(),
        discountType: couponForm.discountType,
        discountValue: Number(couponForm.discountValue),
        minOrderValue: Number(couponForm.minOrderValue) || 0,
        applicableRequirementTypes:
          couponForm.requirementType === "ALL" ? [] : [couponForm.requirementType],
        maxUsage: Number(couponForm.maxUsage) || 100,
        expiresAt: couponForm.expiresAt,
        isFirstTimeOnly: couponForm.isFirstTimeOnly
      });

      setCouponFormMessage("Coupon created successfully.");
      setCouponForm(initialCouponForm);
      fetchCoupons();
    } catch (error) {
      setCouponFormMessage(
        error.response?.data?.message || "Failed to create coupon. Please try again."
      );
    } finally {
      setIsCreatingCoupon(false);
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">CB</div>
          <div>
            <p className="brand-name">CouponBoard</p>
            <p className="brand-sub">Lead Suite</p>
          </div>
        </div>
        <nav className="sidebar-nav">
          {APP_PAGES.map((page) => (
            <button
              key={page}
              type="button"
              className={`sidebar-link ${activePage === page ? "active" : ""}`}
              onClick={() => setActivePage(page)}
            >
              {page}
            </button>
          ))}
        </nav>
      </aside>

      <main className="container">
        <header className="page-header">
          <div>
            <p className="kicker">Lead Management</p>
            <h1>{activePage}</h1>
            <p className="subtext">
              Professional coupon-enabled lead handling with analytics.
            </p>
          </div>
        </header>

        {activePage === "Dashboard" && (
          <>
            <section className="metric-grid">
              <article className="metric-card">
                <p>Total Leads</p>
                <strong>{totalLeads}</strong>
              </article>
              <article className="metric-card">
                <p>Revenue</p>
                <strong>Rs. {totalRevenue.toFixed(2)}</strong>
              </article>
              <article className="metric-card">
                <p>Total Discount</p>
                <strong>Rs. {totalDiscount.toFixed(2)}</strong>
              </article>
              <article className="metric-card">
                <p>Coupon Usage</p>
                <strong>{couponUsageRate}%</strong>
              </article>
            </section>

            <section className="chart-grid">
              <article className="dashboard chart-card">
                <h2>Leads by Requirement</h2>
                <div className="bar-chart">
                  {leadsByType.map((item) => (
                    <div key={item.type} className="bar-row">
                      <span>{item.type}</span>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{ width: `${(item.count / maxTypeCount) * 100}%` }}
                        />
                      </div>
                      <strong>{item.count}</strong>
                    </div>
                  ))}
                </div>
              </article>

              <article className="dashboard chart-card">
                <h2>Coupon Performance</h2>
                <div className="donut-wrap">
                  <div
                    className="donut"
                    style={{
                      background: `conic-gradient(#f29f67 0 ${couponUsageRate}%, #eceff6 ${couponUsageRate}% 100%)`
                    }}
                  >
                    <span>{couponUsageRate}%</span>
                  </div>
                  <p className="muted">Leads submitted with coupon applied.</p>
                </div>
              </article>
            </section>

            <section className="dashboard">
              <div className="section-head">
                <h2>Submission Dashboard</h2>
                <button
                  type="button"
                  className="export-btn"
                  onClick={handleExportLeads}
                  disabled={loadingLeads || leads.length === 0}
                >
                  Download Leads (Excel)
                </button>
              </div>
              <div className="filters-row">
                <input
                  name="search"
                  value={leadFilters.search}
                  onChange={handleLeadFilterChange}
                  placeholder="Search name, email, phone, city, coupon"
                />
                <select
                  name="requirementType"
                  value={leadFilters.requirementType}
                  onChange={handleLeadFilterChange}
                >
                  <option value="ALL">All Types</option>
                  {REQUIREMENT_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <select name="city" value={leadFilters.city} onChange={handleLeadFilterChange}>
                  <option value="ALL">All Cities</option>
                  {CITY_OPTIONS.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                <select
                  name="couponStatus"
                  value={leadFilters.couponStatus}
                  onChange={handleLeadFilterChange}
                >
                  <option value="ALL">All Coupons</option>
                  <option value="withCoupon">With Coupon</option>
                  <option value="withoutCoupon">Without Coupon</option>
                </select>
                <button
                  type="button"
                  className="filter-reset-btn"
                  onClick={resetLeadFilters}
                >
                  Reset
                </button>
              </div>
              {loadingLeads ? (
                <p className="muted">Loading leads...</p>
              ) : (
                <div className="table-wrap">
                  <table className="leads-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Type</th>
                        <th>Coupon</th>
                        <th>Discount</th>
                        <th>Final Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.length === 0 ? (
                        <tr>
                          <td colSpan="7">No leads submitted yet.</td>
                        </tr>
                      ) : (
                        leads.map((lead) => (
                          <tr key={lead._id}>
                            <td>{lead.name}</td>
                            <td>{lead.email}</td>
                            <td>{lead.phoneNumber}</td>
                            <td>{lead.requirementType}</td>
                            <td>{lead.couponCode || "-"}</td>
                            <td>{lead.discountAmount}</td>
                            <td>{lead.finalPrice}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {activePage === "New Lead / Lead Form" && (
          <form className="lead-form" onSubmit={handleSubmit}>
            <h2>Create New Lead</h2>
            <section className="import-card">
              <div className="import-header">
                <div>
                  <h3>Bulk Import Leads</h3>
                  <p className="muted">
                    Upload ad-captured leads using Excel format only.
                  </p>
                </div>
                <button
                  type="button"
                  className="import-toggle-btn"
                  onClick={() => setIsImportPanelOpen((prev) => !prev)}
                >
                  {isImportPanelOpen ? "Hide Import Options" : "Import Leads"}
                </button>
              </div>

              {isImportPanelOpen && (
                <div className="import-options">
                  <p className="muted">
                    Supported columns: name, phoneNumber, email, city, requirementType,
                    budgetRange, basePrice (optional), message (optional), couponCode (optional)
                  </p>
                  <label className="file-label">
                    <input
                      type="file"
                      accept=".xls,.xlsx,.xlsm,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12"
                      onChange={handleImportLeads}
                      disabled={isImporting}
                    />
                  </label>
                  {isImporting && <p className="muted">Importing leads...</p>}
                  {importMessage && <p className="muted">{importMessage}</p>}
                </div>
              )}
            </section>
            <div className="grid">
              <label>
                <span className="label-title">
                  Name <span className="req-star">*</span>
                </span>
                <input name="name" value={form.name} onChange={onInputChange} />
              </label>

              <label>
                <span className="label-title">
                  Phone Number <span className="req-star">*</span>
                </span>
                <input
                  name="phoneNumber"
                  value={form.phoneNumber}
                  onChange={onInputChange}
                  placeholder="10-digit mobile"
                />
              </label>

              <label>
                <span className="label-title">
                  Email <span className="req-star">*</span>
                </span>
                <input name="email" value={form.email} onChange={onInputChange} />
              </label>

              <label>
                <span className="label-title">
                  City <span className="req-star">*</span>
                </span>
                <select name="city" value={form.city} onChange={onInputChange}>
                  <option value="">Select City</option>
                  {CITY_OPTIONS.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="label-title">
                  Requirement Type <span className="req-star">*</span>
                </span>
                <select
                  name="requirementType"
                  value={form.requirementType}
                  onChange={onInputChange}
                >
                  {REQUIREMENT_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="label-title">
                  Budget Range <span className="req-star">*</span>
                </span>
                <select name="budgetRange" value={form.budgetRange} onChange={onInputChange}>
                  {BUDGET_OPTIONS.map((budget) => (
                    <option key={budget.value} value={budget.value}>
                      {budget.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              Message (optional)
              <textarea name="message" rows="3" value={form.message} onChange={onInputChange} />
            </label>

            <div className="coupon-row">
              <input
                name="couponCode"
                value={form.couponCode}
                onChange={onInputChange}
                placeholder="Enter coupon code"
              />
              <button type="button" onClick={handleApplyCoupon} disabled={isApplyingCoupon}>
                {isApplyingCoupon ? "Applying..." : "Apply Coupon"}
              </button>
            </div>

            <div className="price-card">
              <p>
                <span>Base Price</span>
                <strong>Rs. {basePrice.toFixed(2)}</strong>
              </p>
              <p>
                <span>Discount</span>
                <strong>Rs. {couponState.discountAmount.toFixed(2)}</strong>
              </p>
              <p>
                <span>Final Price</span>
                <strong>Rs. {couponState.finalPrice.toFixed(2)}</strong>
              </p>
            </div>

            {couponState.message && <p className="success-msg">{couponState.message}</p>}
            {couponState.error && <p className="error-msg">{couponState.error}</p>}
            {formError && <p className="error-msg">{formError}</p>}
            {submitSuccess && <p className="success-msg">{submitSuccess}</p>}

            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Lead"}
            </button>
          </form>
        )}

        {activePage === "Coupons" && (
          <section className="dashboard">
            <h2>Coupon Management</h2>
            <p className="muted">
              Add dynamic coupons (flat amount or percentage) and they are applied instantly in
              lead pricing.
            </p>

            <form className="coupon-manager-form" onSubmit={handleCreateCoupon}>
              <div className="grid">
                <label>
                  <span className="label-title">
                    Coupon Code <span className="req-star">*</span>
                  </span>
                  <input
                    name="code"
                    value={couponForm.code}
                    onChange={handleCouponFormChange}
                    placeholder="SAVE20"
                  />
                </label>

                <label>
                  <span className="label-title">
                    Discount Type <span className="req-star">*</span>
                  </span>
                  <select
                    name="discountType"
                    value={couponForm.discountType}
                    onChange={handleCouponFormChange}
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FLAT">Flat Amount</option>
                  </select>
                </label>

                <label>
                  <span className="label-title">
                    Discount Value <span className="req-star">*</span>
                  </span>
                  <input
                    type="number"
                    min="1"
                    name="discountValue"
                    value={couponForm.discountValue}
                    onChange={handleCouponFormChange}
                    placeholder="10"
                  />
                </label>

                <label>
                  Min Order Value
                  <input
                    type="number"
                    min="0"
                    name="minOrderValue"
                    value={couponForm.minOrderValue}
                    onChange={handleCouponFormChange}
                    placeholder="0"
                  />
                </label>

                <label>
                  Applicable Requirement Type
                  <select
                    name="requirementType"
                    value={couponForm.requirementType}
                    onChange={handleCouponFormChange}
                  >
                    <option value="ALL">All</option>
                    {REQUIREMENT_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Max Usage
                  <input
                    type="number"
                    min="1"
                    name="maxUsage"
                    value={couponForm.maxUsage}
                    onChange={handleCouponFormChange}
                  />
                </label>

                <label>
                  <span className="label-title">
                    Expiry Date <span className="req-star">*</span>
                  </span>
                  <input
                    type="date"
                    name="expiresAt"
                    value={couponForm.expiresAt}
                    onChange={handleCouponFormChange}
                  />
                </label>

                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    name="isFirstTimeOnly"
                    checked={couponForm.isFirstTimeOnly}
                    onChange={handleCouponFormChange}
                  />
                  <span>First-time users only</span>
                </label>
              </div>

              {couponFormMessage && <p className="muted">{couponFormMessage}</p>}
              <button type="submit" className="submit-btn" disabled={isCreatingCoupon}>
                {isCreatingCoupon ? "Creating Coupon..." : "Add Coupon"}
              </button>
            </form>

            <div className="filters-row">
              <input
                name="search"
                value={couponFilters.search}
                onChange={handleCouponFilterChange}
                placeholder="Search coupon code"
              />
              <select
                name="discountType"
                value={couponFilters.discountType}
                onChange={handleCouponFilterChange}
              >
                <option value="ALL">All Discount Types</option>
                <option value="PERCENTAGE">Percentage</option>
                <option value="FLAT">Flat Amount</option>
              </select>
              <select
                name="requirementType"
                value={couponFilters.requirementType}
                onChange={handleCouponFilterChange}
              >
                <option value="ALL">All Requirement Types</option>
                {REQUIREMENT_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <select name="status" value={couponFilters.status} onChange={handleCouponFilterChange}>
                <option value="ALL">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired / Inactive</option>
              </select>
              <button
                type="button"
                className="filter-reset-btn"
                onClick={resetCouponFilters}
              >
                Reset
              </button>
            </div>

            <div className="table-wrap">
              <table className="coupons-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Type</th>
                    <th>Value</th>
                    <th>Min Order</th>
                    <th>Requirement</th>
                    <th>Usage</th>
                    <th>Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingCoupons ? (
                    <tr>
                      <td colSpan="7">Loading coupons...</td>
                    </tr>
                  ) : coupons.length === 0 ? (
                    <tr>
                      <td colSpan="7">No coupons found.</td>
                    </tr>
                  ) : (
                    coupons.map((coupon) => (
                      <tr key={coupon._id}>
                        <td>{coupon.code}</td>
                        <td>{coupon.discountType === "PERCENTAGE" ? "Percentage" : "Flat"}</td>
                        <td>
                          {coupon.discountType === "PERCENTAGE"
                            ? `${coupon.discountValue}%`
                            : `Rs. ${coupon.discountValue}`}
                        </td>
                        <td>Rs. {coupon.minOrderValue}</td>
                        <td>
                          {coupon.applicableRequirementTypes?.length
                            ? coupon.applicableRequirementTypes.join(", ")
                            : "All"}
                        </td>
                        <td>
                          {coupon.usageCount}/{coupon.maxUsage}
                        </td>
                        <td>{new Date(coupon.expiresAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
