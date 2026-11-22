"use client";
import auditJson from "@itil5/content/import-audit.json";
import coverageJson from "@itil5/content/translation-coverage.json";
import { categoryLabel, lb } from "@/lib/data";

type Reason = { code: string; detail: string };
const audit = auditJson as unknown as {
  confirmedCounts: Record<string, number | number[]>;
  statusCounts: Record<string, number>;
  examEligibleOccurrences: number;
  printedNumberAnomalies: { reusedLabels: Record<string, number[]>; missingNumbers: number[] };
  quarantine: { questionId: string; page: number; printedQuestionNumber: number; status: string; reasons: Reason[] }[];
  blueprint: { eligibleUniqueGroupsByCategoryAndBloom: Record<string, Record<string, number>>; fullyCompliantExamPossible: boolean; bl1AchievableRange: number[] };
  duplicateGroups: unknown[];
};
const cov = coverageJson as unknown as { approvedPerField: Record<string, { required: number; translated: number; percent: number }> };

export default function AuditPage() {
  const c = audit.confirmedCounts;
  return (
    <div className="page">
      <h1>Import Audit Report</h1>
      <p>Source: <code>{lb.bank.sourceDocument}</code> · SHA-256 <code className="wrap">{lb.bank.sourceDocumentSha256}</code></p>
      <table className="table">
        <tbody>
          {Object.entries(c).filter(([, v]) => !Array.isArray(v)).map(([k, v]) => <tr key={k}><th>{k}</th><td>{String(v)}</td></tr>)}
          {Object.entries(audit.statusCounts).map(([k, v]) => <tr key={k}><th>status: {k}</th><td>{v}</td></tr>)}
          <tr><th>exam-eligible</th><td>{audit.examEligibleOccurrences}</td></tr>
          <tr><th>reused printed labels</th><td>{Object.entries(audit.printedNumberAnomalies.reusedLabels).map(([k, v]) => `${k} (occurrences ${v.join(", ")})`).join("; ")}</td></tr>
          <tr><th>missing printed numbers</th><td>{audit.printedNumberAnomalies.missingNumbers.join(", ")}</td></tr>
        </tbody>
      </table>
      <h2>Blueprint coverage (unique exclusion groups, exam-eligible)</h2>
      <table className="table">
        <thead><tr><th>Category</th><th>Target</th><th>BL1</th><th>BL2</th></tr></thead>
        <tbody>{lb.bank.categories.map((cat) => <tr key={cat.id}><td>{categoryLabel(cat.id)}</td><td>{cat.questions}</td><td>{audit.blueprint.eligibleUniqueGroupsByCategoryAndBloom[cat.id]?.["1"]}</td><td>{audit.blueprint.eligibleUniqueGroupsByCategoryAndBloom[cat.id]?.["2"]}</td></tr>)}</tbody>
      </table>
      <p>Fully compliant exam possible: <b>{audit.blueprint.fullyCompliantExamPossible ? "yes" : "no"}</b> (BL1 achievable range {audit.blueprint.bl1AchievableRange.join("–")}, target 16).</p>
      <h2>Translation coverage (approved items)</h2>
      <ul>{Object.entries(cov.approvedPerField).map(([f, v]) => <li key={f}>{f}: {v.translated}/{v.required} ({v.percent}%)</li>)}</ul>
      <p className="muted small">Arabic translations are AI-generated drafts that have not been reviewed by a human translator.</p>
      <h2>Quarantined / excluded items ({audit.quarantine.length}) — never served in practice</h2>
      <table className="table">
        <thead><tr><th>Page</th><th>Printed #</th><th>Status</th><th>Reasons</th></tr></thead>
        <tbody>{audit.quarantine.map((x) => <tr key={x.questionId}><td>{x.page}</td><td>{x.printedQuestionNumber}</td><td>{x.status}</td><td>{x.reasons.map((r) => `${r.code}: ${r.detail}`).join(" | ")}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
