"use client";
import React, { useMemo, useState } from "react";

const currency = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
const pct = (n: number) => (n * 100).toLocaleString(undefined, { maximumFractionDigits: 1 }) + "%";

export default function Page() {
  const [netWorth, setNetWorth] = useState(3000000);
  const [salary, setSalary] = useState(480000);
  const [salaryTaxRate, setSalaryTaxRate] = useState(0.25);
  const [investReturn, setInvestReturn] = useState(0.10);
  const [investTaxRate, setInvestTaxRate] = useState(0.20);
  const [spend, setSpend] = useState(180000);
  const [sideIncome, setSideIncome] = useState(0);
  const [cashOnHand, setCashOnHand] = useState(60000);
  const [state, setState] = useState("AL");
  const [filing, setFiling] = useState("MFJ");

  const afterTaxSalary = useMemo(() => salary * (1 - salaryTaxRate), [salary, salaryTaxRate]);
  const salaryVsNW = useMemo(() => (netWorth > 0 ? afterTaxSalary / netWorth : Infinity), [afterTaxSalary, netWorth]);
  const afterTaxPortfolioReturn = useMemo(() => netWorth * investReturn * (1 - investTaxRate), [netWorth, investReturn, investTaxRate]);

  const passRuleB = salaryVsNW <= 0.10;
  const passRuleC = afterTaxPortfolioReturn + sideIncome >= spend;
  const passBuffer = cashOnHand >= spend / 2;

  const bGap = 0.10 - salaryVsNW;
  const cGap = (afterTaxPortfolioReturn + sideIncome - spend) / spend;
  const bufferGap = (cashOnHand - spend / 2) / (spend / 2);
  const failingGaps = [passRuleB ? Infinity : bGap, passRuleC ? Infinity : cGap, passBuffer ? Infinity : bufferGap];
  const worstGap = Math.min(...failingGaps);

  const isYes = passRuleB && passRuleC && passBuffer;
  const isClose = !isYes && worstGap >= -0.05;

  const driver = React.useMemo(() => {
    if (!passRuleB && bGap <= cGap && bGap <= bufferGap) return "Salary too large vs net worth";
    if (!passRuleC && cGap <= bGap && cGap <= bufferGap) return "Spending too high vs portfolio + side income";
    if (!passBuffer && bufferGap <= bGap && bufferGap <= cGap) return "Insufficient cash buffer";
    return isYes ? "You’re good" : "Multiple factors";
  }, [passRuleB, passRuleC, passBuffer, bGap, cGap, bufferGap, isYes]);

  const nextStep = useMemo(() => {
    const neededNWforB = afterTaxSalary / 0.10;
    const deltaNW_B = Math.max(0, neededNWforB - netWorth);
    const shortfallC = Math.max(0, spend - (afterTaxPortfolioReturn + sideIncome));
    const atRetPerDollar = investReturn * (1 - investTaxRate);
    const deltaNW_C = atRetPerDollar > 0 ? shortfallC / atRetPerDollar : Infinity;
    const bufferShort = Math.max(0, spend / 2 - cashOnHand);

    const deltas: Array<{ label: string; value: number }> = [
      ...(passRuleB ? [] : [{ label: "Grow net worth (Rule B)", value: deltaNW_B }]),
      ...(passRuleC ? [] : [
        { label: "Add side income", value: shortfallC },
        { label: "Cut spending", value: shortfallC },
        { label: "Grow net worth (Rule C)", value: deltaNW_C },
      ]),
      ...(passBuffer ? [] : [{ label: "Hold more cash", value: bufferShort }]),
    ];

    if (deltas.length === 0) return "Take a nap. You’re coasting.";

    const best = deltas.reduce((a, b) => (a.value <= b.value ? a : b));
    const pretty = (v: number) => "$" + currency(Math.max(0, Math.round(v)));

    switch (best.label) {
      case "Grow net worth (Rule B)":
        return `Add about ${pretty(best.value)} to net worth to get salary ≤10% of NW.`;
      case "Add side income":
        return `Add about ${pretty(best.value)}/yr in side income to meet spending.`;
      case "Cut spending":
        return `Trim spending by about ${pretty(best.value)} to meet coverage.`;
      case "Grow net worth (Rule C)":
        return `Add about ${pretty(best.value)} to net worth to cover spending with returns.`;
      case "Hold more cash":
        return `Hold about ${pretty(best.value)} more in cash for a 6‑month buffer.`;
      default:
        return "Nudge the smallest lever above to flip this to YES.";
    }
  }, [passRuleB, passRuleC, passBuffer, afterTaxSalary, netWorth, afterTaxPortfolioReturn, sideIncome, spend, investReturn, investTaxRate, cashOnHand]);

  const verdict = isYes ? "YES" : isClose ? "CLOSE" : "NOT YET";
  const color = isYes ? "bg-emerald-500" : isClose ? "bg-amber-500" : "bg-rose-500";
  const subline = isYes ? "You can coast." : isClose ? "You’re within 5% — almost there." : "Keep stacking — not quite yet.";

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 p-6 md:p-10">
      <header className="max-w-4xl mx-auto mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">AMI Coast FIRE</h1>
          <p className="text-sm text-neutral-600">World's Greatest Calculator (sarcasm)</p>
        </div>
        <div className="text-xs text-neutral-500">State: {state} · Filing: {filing}</div>
      </header>

      <main className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
        <div className={`rounded-2xl shadow-sm ${color} text-white p-6 flex flex-col gap-3`}>
          <div className="text-5xl font-extrabold tracking-tight">{verdict}</div>
          <div className="text-lg opacity-90">{subline}</div>
          <div className="mt-2 text-sm opacity-90"><strong>Top driver:</strong> {driver}</div>
          <div className="mt-4 text-sm bg-white/15 rounded-xl p-3">
            <div>Salary is <strong>{pct(salaryVsNW)}</strong> of net worth (target ≤ 10%).</div>
            <div>Portfolio + side covers <strong>{pct((afterTaxPortfolioReturn + sideIncome) / spend)}</strong> of spending.</div>
          </div>
          <div className="mt-4 text-sm bg-white/20 rounded-xl p-3"><strong>Next step:</strong> {nextStep}</div>
          <p className="text-xs mt-6 opacity-80">Definitely not financial advice.</p>
        </div>

        <div className="rounded-2xl bg-white shadow-sm p-6 grid gap-4">
          <Field label="Liquid net worth" prefix="$"><NumberInput value={netWorth} onChange={setNetWorth} /></Field>
          <Field label="Annual salary (gross)" prefix="$"><NumberInput value={salary} onChange={setSalary} /></Field>
          <Field label="Effective salary tax rate"><PercentInput value={salaryTaxRate} onChange={setSalaryTaxRate} /></Field>
          <Field label="Annual spending" prefix="$"><NumberInput value={spend} onChange={setSpend} /></Field>
          <Field label="Side income (after tax)" prefix="$"><NumberInput value={sideIncome} onChange={setSideIncome} /></Field>
          <Field label="Expected return (pre-tax)"><PercentInput value={investReturn} onChange={setInvestReturn} /></Field>
          <Field label="Effective tax rate on returns"><PercentInput value={investTaxRate} onChange={setInvestTaxRate} /></Field>
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
            <summary className="text-sm cursor-pointer select-none text-neutral-600">Assumptions & tiny print</summary>
            <ul className="text-xs text-neutral-500 mt-2 list-disc pl-5 space-y-1">
              <li>Rule B: after-tax salary ≤ 10% of liquid net worth.</li>
              <li>Rule C: after-tax portfolio return + side income ≥ annual spending.</li>
              <li>Cash buffer: at least 6 months of spending in cash on hand.</li>
              <li>Simple tax model using effective rates (you can edit above).</li>
            </ul>
          </details>
        </div>
      </main>

      <footer className="max-w-4xl mx-auto mt-8 text-xs text-neutral-500">
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
      className="w-full rounded-xl border border-neutral-200 p-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
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
        className="w-full rounded-xl border border-neutral-200 p-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
        type="number"
        inputMode="decimal"
        value={(value * 100).toFixed(1)}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) / 100))}
      />
      <span className="text-neutral-400">%</span>
    </div>
  );
}
