import React, { useMemo, useState } from "react";

/**
 * Am I Coast FIRE? — Fast, clean, minimal
 * Theme inspiration: simple storefront (à la stan.store): big title, generous spacing, monochrome with a single accent.
 *
 * Decision rules:
 *  B) after-tax salary ≤ 10% of liquid net worth
 *  C) after-tax portfolio return + side income ≥ annual spending
 *  Guardrail: cash ≥ 6 months of spending
 *  "Close": within 5% of the failing threshold
 */

// ---- Tunable constants (easy tweaks) ----
const TARGET_SALARY_VS_NW = 0.10;   // 10%
const CASH_BUFFER_MONTHS  = 6;      // months
const CLOSE_BAND_FRACTION = 0.05;   // 5%

const currency = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
const pct = (n: number) => (n * 100).toLocaleString(undefined, { maximumFractionDigits: 1 }) + "%";

export default function Page() {
  // Minimal inputs with sensible defaults
  const [netWorth, setNetWorth] = useState(3000000); // $
  const [salary, setSalary] = useState(480000);      // gross
  const [salaryTaxRate, setSalaryTaxRate] = useState(0.25);
  const [investReturn, setInvestReturn] = useState(0.10); // user-chosen central assumption
  const [investTaxRate, setInvestTaxRate] = useState(0.20);
  const [spend, setSpend] = useState(180000);
  const [sideIncome, setSideIncome] = useState(0);
  const [cashOnHand, setCashOnHand] = useState(60000);
  const [state, setState] = useState("AL");
  const [filing, setFiling] = useState("MFJ");

  // Derived values (central assumption)
  const afterTaxSalary = useMemo(() => salary * (1 - salaryTaxRate), [salary, salaryTaxRate]);
  const salaryVsNW = useMemo(() => (netWorth > 0 ? afterTaxSalary / netWorth : Infinity), [afterTaxSalary, netWorth]);
  const afterTaxPortfolioReturn = useMemo(
    () => netWorth * investReturn * (1 - investTaxRate),
    [netWorth, investReturn, investTaxRate]
  );

  // Rule checks for central assumption
  const passRuleB = salaryVsNW <= TARGET_SALARY_VS_NW;
  const passRuleC = afterTaxPortfolioReturn + sideIncome >= spend;
  const passBuffer = cashOnHand >= (spend / 12) * CASH_BUFFER_MONTHS;

  const bGap = TARGET_SALARY_VS_NW - salaryVsNW; // positive good
  const cGap = (afterTaxPortfolioReturn + sideIncome - spend) / spend; // fraction of spend
  const bufferGap = (cashOnHand - (spend / 12) * CASH_BUFFER_MONTHS) / ((spend / 12) * CASH_BUFFER_MONTHS);

  const failingGaps = [passRuleB ? Infinity : bGap, passRuleC ? Infinity : cGap, passBuffer ? Infinity : bufferGap];
  const worstGap = Math.min(...failingGaps);

  const isYes = passRuleB && passRuleC && passBuffer;
  const isClose = !isYes && worstGap >= -CLOSE_BAND_FRACTION;

  // Top driver (most constraining rule)
  const driver = useMemo(() => {
    if (!passRuleB && bGap <= cGap && bGap <= bufferGap) return "Salary too large vs net worth";
    if (!passRuleC && cGap <= bGap && cGap <= bufferGap) return "Spending too high vs portfolio + side income";
    if (!passBuffer && bufferGap <= bGap && bufferGap <= cGap) return "Insufficient cash buffer";
    return isYes ? "You’re good" : "Multiple factors";
  }, [passRuleB, passRuleC, passBuffer, bGap, cGap, bufferGap, isYes]);

  // Single "next step" suggestion (smallest nudge to satisfy ALL rules)
  const nextStep = useMemo(() => {
    const neededNWforB = afterTaxSalary / TARGET_SALARY_VS_NW;
    const deltaNW_B = Math.max(0, neededNWforB - netWorth);

    const shortfallC = Math.max(0, spend - (afterTaxPortfolioReturn + sideIncome));
    const atRetPerDollar = investReturn * (1 - investTaxRate);
    const deltaNW_C = atRetPerDollar > 0 ? shortfallC / atRetPerDollar : Infinity;

    const bufferShort = Math.max(0, (spend / 12) * CASH_BUFFER_MONTHS - cashOnHand);

    const deltas: Array<{ label: string; value: number }> = [
      ...(passRuleB ? [] : [{ label: "Grow net worth (Rule B)", value: deltaNW_B }]),
      ...(passRuleC ? [] : [
        { label: "Add side income", value: shortfallC },
        { label: "Cut spending", value: shortfallC },
        { label: "Grow net worth (Rule C)", value: deltaNW_C },
      ]),
      ...(passBuffer ? [] : [{ label: "Hold more cash", value: bufferShort }]),
    ];

    if (deltas.length === 0) return "You can coast.";

    const best = deltas.reduce((a, b) => (a.value <= b.value ? a : b));
    const pretty = (v: number) => "$" + currency(Math.max(0, Math.round(v)));
    switch (best.label) {
      case "Grow net worth (Rule B)":
        return `Add about ${pretty(best.value)} to net worth to get salary ≤ ${pct(TARGET_SALARY_VS_NW)} of NW.`;
      case "Add side income":
        return `Add about ${pretty(best.value)}/yr in side income to meet spending.`;
      case "Cut spending":
        return `Trim spending by about ${pretty(best.value)} to meet coverage.`;
      case "Grow net worth (Rule C)":
        return `Add about ${pretty(best.value)} to net worth so returns cover spending.`;
      case "Hold more cash":
        return `Hold about ${pretty(best.value)} more in cash for a ${CASH_BUFFER_MONTHS}-month buffer.`;
      default:
        return "Make the smallest change above to flip this to YES.";
    }
  }, [
    passRuleB,
    passRuleC,
    passBuffer,
    afterTaxSalary,
    netWorth,
    afterTaxPortfolioReturn,
    sideIncome,
    spend,
    investReturn,
    investTaxRate,
    cashOnHand,
  ]);

  // ---- Return sensitivity (8–12%) ----
  const returnScenarios = [0.08, 0.09, 0.10, 0.11, 0.12];
  const verdictForR = (r: number) => {
    const atRet = netWorth * r * (1 - investTaxRate);
    const b = salaryVsNW <= TARGET_SALARY_VS_NW;
    const c = atRet + sideIncome >= spend;
    const buffer = passBuffer; // buffer unaffected by r

    // Gaps for "close" logic (using r for Rule C)
    const cGapR = (atRet + sideIncome - spend) / spend;
    const failing = [b ? Infinity : (TARGET_SALARY_VS_NW - salaryVsNW), c ? Infinity : cGapR, buffer ? Infinity : bufferGap];
    const worst = Math.min(...failing);

    const yes = b && c && buffer;
    const close = !yes && worst >= -CLOSE_BAND_FRACTION;
    const coverage = (atRet + sideIncome) / spend;
    return { r, yes, close, coverage };
  };
  const sensitivity = returnScenarios.map(verdictForR);

  const verdict = isYes ? "YES" : isClose ? "CLOSE" : "NOT YET";
  const verdictColor = isYes ? "bg-emerald-600" : isClose ? "bg-amber-500" : "bg-rose-600";

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* Header */}
      <header className="max-w-5xl mx-auto px-6 py-8 md:py-10 flex items-center justify-between border-b border-neutral-200">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Am I Coast FIRE?</h1>
          <p className="text-sm text-neutral-600">Are you ready to coast?</p>
        </div>
        <div className="hidden md:block text-xs text-neutral-500">State: {state} · Filing: {filing}</div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-6 py-8 grid lg:grid-cols-2 gap-8">
        {/* Verdict Card */}
        <div className={`rounded-2xl border border-neutral-200 ${verdictColor} text-white p-6 shadow-sm`}>
          <div className="text-5xl font-extrabold tracking-tight">{verdict}</div>
          <div className="mt-1 text-base opacity-90">
            {isYes ? "You can coast." : isClose ? "You’re within 5% — almost there." : "Keep stacking — not quite yet."}
          </div>
          <div className="mt-4 grid gap-2 text-sm">
            <div><strong>Top driver:</strong> {driver}</div>
            <div className="bg-white/15 rounded-xl p-3">
              Salary is <strong>{pct(salaryVsNW)}</strong> of net worth (target ≤ {pct(TARGET_SALARY_VS_NW)}).
            </div>
            <div className="bg-white/15 rounded-xl p-3">
              Portfolio + side covers <strong>{pct((afterTaxPortfolioReturn + sideIncome) / spend)}</strong> of spending.
            </div>
            <div className="bg-white/15 rounded-xl p-3">
              Cash buffer: <strong>${currency(cashOnHand)}</strong> ({CASH_BUFFER_MONTHS} months target).
            </div>
          </div>
          <div className="mt-4 text-sm bg-white/20 rounded-xl p-3"><strong>Next step:</strong> {nextStep}</div>
          <p className="text-xs mt-6 opacity-80">Definitely not financial advice.</p>
        </div>

        {/* Inputs + Sensitivity */}
        <div className="grid gap-6">
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-6 grid gap-4">
            <Field label="Liquid net worth" prefix="$"><NumberInput value={netWorth} onChange={setNetWorth} /></Field>
            <Field label="Annual salary (gross)" prefix="$"><NumberInput value={salary} onChange={setSalary} /></Field>
            <Field label="Effective salary tax rate"><PercentInput value={salaryTaxRate} onChange={setSalaryTaxRate} /></Field>
            <Field label="Annual spending" prefix="$"><NumberInput value={spend} onChange={setSpend} /></Field>
            <Field label="Side income (after tax)" prefix="$"><NumberInput value={sideIncome} onChange={setSideIncome} /></Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Expected return (pre-tax)"><PercentInput value={investReturn} onChange={setInvestReturn} /></Field>
              <Field label="Effective tax rate on returns"><PercentInput value={investTaxRate} onChange={setInvestTaxRate} /></Field>
            </div>

            <Field label="Cash on hand" prefix="$"><NumberInput value={cashOnHand} onChange={setCashOnHand} /></Field>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label className="text-xs text-neutral-500">Filing status</label>
                <select className="w-full mt-1 rounded-xl border border-neutral-200 p-2" value={filing} onChange={(e) => setFiling(e.target.value)}>
                  <option value="Single">Single</option>
                  <option value="MFJ">MFJ</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-neutral-500">State</label>
                <select className="w-full mt-1 rounded-xl border border-neutral-200 p-2" value={state} onChange={(e) => setState(e.target.value)}>
                  {["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","IA","ID","IL","IN","KS","KY","LA","MA","MD","ME","MI","MN","MO","MS","MT","NC","ND","NE","NH","NJ","NM","NV","NY","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VA","VT","WA","WI","WV","WY"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <details className="mt-2">
              <summary className="text-sm cursor-pointer select-none text-neutral-700">Assumptions</summary>
              <ul className="text-xs text-neutral-500 mt-2 list-disc pl-5 space-y-1">
                <li>Rule B: after-tax salary ≤ 10% of liquid net worth.</li>
                <li>Rule C: after-tax portfolio return + side income ≥ annual spending.</li>
                <li>Cash buffer: at least {CASH_BUFFER_MONTHS} months of spending in cash.</li>
                <li>Simple tax model using effective rates you can edit above.</li>
              </ul>
            </details>
          </div>

          {/* Sensitivity Card */}
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium">Return sensitivity (8–12%)</h3>
              <span className="text-xs text-neutral-500">Doesn’t change your main verdict</span>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {sensitivity.map((s) => (
                <div key={s.r} className={`rounded-xl border p-3 text-center ${s.yes ? 'border-emerald-500 bg-emerald-50' : s.close ? 'border-amber-500 bg-amber-50' : 'border-neutral-200 bg-neutral-50'}`}>
                  <div className="text-sm font-medium">{pct(s.r)}</div>
                  <div className={`text-xs mt-1 font-semibold ${s.yes ? 'text-emerald-700' : s.close ? 'text-amber-700' : 'text-neutral-600'}`}>
                    {s.yes ? 'YES' : s.close ? 'CLOSE' : 'NOT YET'}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-1">Coverage: {pct(s.coverage)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 pb-10 text-xs text-neutral-500 border-t border-neutral-200 pt-6">
        © {new Date().getFullYear()} amicoastfire.com · Built for speed.
      </footer>
    </div>
  );
}

function Field({ label, children, prefix }: { label: string; children: React.ReactNode; prefix?: string }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs text-neutral-500">{label}</span>
      <div className="flex items-center gap-2">
        {prefix ? <span className="text-neutral-400">{prefix}</span> : null}
        {children}
      </div>
    </label>
  );
}

function NumberInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      className="w-full rounded-xl border border-neutral-200 p-2 focus:outline-none focus:ring-2 focus:ring-black/10"
      type="number"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(Number(e.target.value || 0))}
    />
  );
}

function PercentInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        className="w-full rounded-xl border border-neutral-200 p-2 focus:outline-none focus:ring-2 focus:ring-black/10"
        type="number"
        inputMode="decimal"
        value={(value * 100).toFixed(1)}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) / 100))}
      />
      <span className="text-neutral-400">%</span>
    </div>
  );
}
