import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  buildMistakesPractice, categoryBreakdown, checkStudyAnswer, createSession, formatDuration, latestMarks, mistakeStats, randomSeed,
  studyQuestions, summarize, wrongItems, type OptionLabel, type StudyMark,
} from "@itil5/core";
import { auditJson, categoryLabel, lb, t } from "../data";
import { useStore } from "../store";
import { usePalette } from "../theme";
import { QuestionCard } from "../components/QuestionCard";
import { Explanation } from "../components/Explanation";
import { Button, Card, H1, H2, P } from "../components/Ui";
import { TrText } from "../components/TrText";
import type { RootParams, TabParams } from "../nav";

const Screen = ({ children }: { children: React.ReactNode }) => {
  const p = usePalette();
  return <ScrollView style={{ backgroundColor: p.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>{children}</ScrollView>;
};
const Ui = ({ k, bold }: { k: Parameters<typeof t.ui>[0]; bold?: boolean }) => {
  const s = t.ui(k);
  return <TrText ar={s.ar} style={bold ? { fontWeight: "700" } : undefined}>{s.en}</TrText>;
};

export function HomeScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { activeSession, attempts } = useStore();
  const a = auditJson as { statusCounts: Record<string, number>; examEligibleOccurrences: number };
  return (
    <Screen>
      <H1>ITIL Foundation (Version 5)</H1>
      <Ui k="translate.hint" />
      {activeSession && <Card><P>An exam is in progress.</P><Button kind="primary" title="Resume" onPress={() => nav.navigate("Tabs", { screen: "Exam" })} /></Card>}
      <Card><Text style={{ fontWeight: "700", fontSize: 17 }} onPress={() => nav.navigate("Tabs", { screen: "Exam" })}>Full Exam</Text><P muted>40 questions · 60 minutes · pass 26/40</P></Card>
      <Card><Text style={{ fontWeight: "700", fontSize: 17 }} onPress={() => nav.navigate("Mistakes")}>Mistakes-Only Practice</Text><P muted>Only questions you previously missed.</P></Card>
      <Card><Text style={{ fontWeight: "700", fontSize: 17 }} onPress={() => nav.navigate("Audit")}>Import Audit</Text><P muted>{lb.bank.questionCount} source occurrences · {a.statusCounts.approved} approved · {a.examEligibleOccurrences} exam-eligible</P></Card>
      <P muted small>{attempts.length} attempt(s) stored on this device. Progress is not synced to other devices.</P>
      <P muted small>{lb.bank.notice}</P>
    </Screen>
  );
}

export function ResultsScreen() {
  const route = useRoute<RouteProp<RootParams, "Results">>();
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { attempts } = useStore();
  const p = usePalette();
  const a = attempts.find((x) => x.attemptId === route.params.attemptId);
  if (!a) return <Screen><P>Loading…</P></Screen>;
  const cats = categoryBreakdown(a);
  return (
    <Screen>
      {route.params.timeout && <Card><Ui k="exam.timeUp" /></Card>}
      <Card style={{ alignItems: "center", borderColor: a.passed === null ? p.border : a.passed ? p.ok : p.bad, borderWidth: 2 }}>
        <Text style={{ fontSize: 40, fontWeight: "800", color: p.text }} testID="score">{a.score} / {a.total}</Text>
        <Text style={{ color: p.text }}>{Math.round((1000 * a.score) / a.total) / 10}%</Text>
        {a.passed !== null && <Text style={{ fontSize: 22, fontWeight: "800", color: a.passed ? p.ok : p.bad }}>{a.passed ? "PASS" : "FAIL"}</Text>}
        <P muted>Elapsed {formatDuration(a.elapsedMs)} · {a.submittedBy === "timer" ? "auto-submitted" : "submitted by you"}</P>
      </Card>
      <H2>By syllabus category</H2>
      {Object.entries(cats).map(([c, v]) => <P key={c}>{categoryLabel(Number(c))}: {v.correct}/{v.total}</P>)}
      <Button kind="primary" title={`Review wrong answers (${a.total - a.score})`} onPress={() => nav.navigate("Tabs", { screen: "Review", params: { attemptId: a.attemptId } })} />
    </Screen>
  );
}

export function ReviewScreen() {
  const route = useRoute<RouteProp<TabParams, "Review">>();
  const { attempts, marks, storage, refresh } = useStore();
  const p = usePalette();
  const [sel, setSel] = useState<string | undefined>(undefined);
  const latest = useMemo(() => latestMarks(marks), [marks]);
  const a = attempts.find((x) => x.attemptId === (sel ?? route.params?.attemptId)) ?? attempts[0];
  if (!a) return <Screen><Ui k="review.none" /></Screen>;
  const wrong = wrongItems(a);
  const mark = async (questionId: string, m: StudyMark) => { await storage.addMark({ questionId, mark: m, at: Date.now() }); await refresh(); };
  return (
    <Screen>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        {attempts.slice(0, 10).map((x) => (
          <Pressable key={x.attemptId} onPress={() => setSel(x.attemptId)} accessibilityRole="button" accessibilityState={{ selected: x.attemptId === a.attemptId }}
            style={{ padding: 10, marginRight: 6, borderRadius: 8, borderWidth: 1, borderColor: x.attemptId === a.attemptId ? p.accent : p.border, backgroundColor: p.surface }}>
            <Text style={{ color: p.text }}>{new Date(x.submittedAt).toLocaleDateString()} {x.score}/{x.total}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <P>{wrong.length} incorrect or unanswered item(s).</P>
      {wrong.map((w) => {
        const q = lb.byId.get(w.questionId);
        if (!q) return <P key={w.questionId}>Stored snapshot: {w.snapshot.englishQuestion}</P>;
        return (
          <Card key={w.questionId}>
            <QuestionCard q={q} selected={w.selected} showKey disabled />
            <View style={{ marginTop: 8 }}>
              <Ui k="review.yourAnswer" bold />
              {w.selected ? <TrText k={q.i18n.options[w.selected]}>{`${w.selected}. ${q.englishOptions.find((o) => o.label === w.selected)!.text}`}</TrText> : <Ui k="review.noAnswer" />}
              <Ui k="review.correctAnswer" bold />
              <TrText k={q.i18n.options[w.sourceAnswerKey]}>{`${w.sourceAnswerKey}. ${q.englishOptions.find((o) => o.label === w.sourceAnswerKey)!.text}`}</TrText>
            </View>
            <Explanation q={q} />
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
              {(["studied", "confusing", "mastered"] as StudyMark[]).map((m) => (
                <Button key={m} kind={latest.get(w.questionId) === m ? "flag" : "default"} title={m === "studied" ? "Studied" : m === "confusing" ? "Still confusing" : "Mastered"} onPress={() => void mark(w.questionId, m)} />
              ))}
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

export function StudyScreen() {
  const [cat, setCat] = useState<number | "all">("all");
  const [i, setI] = useState(0);
  const [sel, setSel] = useState<OptionLabel | null>(null);
  const p = usePalette();
  const list = useMemo(() => studyQuestions(lb, cat), [cat]);
  const q = list[Math.min(i, list.length - 1)];
  const res = q && sel ? checkStudyAnswer(q, sel) : null;
  const go = (n: number) => { setI(Math.max(0, Math.min(list.length - 1, n))); setSel(null); };
  return (
    <Screen>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        {(["all", 1, 2, 3, 4, 5, 6, 7] as const).map((c) => (
          <Pressable key={String(c)} onPress={() => { setCat(c); setI(0); setSel(null); }} accessibilityRole="button" accessibilityState={{ selected: cat === c }}
            style={{ paddingHorizontal: 12, paddingVertical: 8, marginRight: 6, borderRadius: 16, borderWidth: 1, borderColor: cat === c ? p.accent : p.border, backgroundColor: cat === c ? p.accent : p.surface }}>
            <Text style={{ color: cat === c ? p.accentText : p.text }}>{c === "all" ? `All (${lb.approved.length})` : `Cat ${c} (${studyQuestions(lb, c).length})`}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {cat !== "all" && <P muted small>{categoryLabel(cat)}</P>}
      {q ? (
        <>
          <P muted small>Question {Math.min(i, list.length - 1) + 1} of {list.length}</P>
          <QuestionCard key={q.questionId} q={q} selected={sel} onSelect={setSel} showKey={!!sel} />
          {res && <Text style={{ marginTop: 10, fontWeight: "700", color: res.correct ? p.ok : p.bad }}>{res.correct ? "Correct" : `Incorrect — source key is ${res.sourceAnswerKey}`}</Text>}
          {sel && <Explanation q={q} />}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <Button title="‹ Previous" onPress={() => go(i - 1)} disabled={i === 0} style={{ flex: 1 }} />
            <Button kind="primary" title="Next ›" onPress={() => go(i + 1)} disabled={i >= list.length - 1} style={{ flex: 1 }} />
          </View>
        </>
      ) : <P>No approved questions in this category.</P>}
    </Screen>
  );
}

export function MistakesScreen() {
  const { attempts, marks, storage, refresh, activeSession } = useStore();
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const stats = useMemo(() => mistakeStats(attempts, marks).filter((s) => s.timesWrong > 0).sort((a, b) => b.timesWrong - a.timesWrong), [attempts, marks]);
  const start = async () => {
    const seed = randomSeed();
    const ids = buildMistakesPractice(lb, attempts, marks, { now: Date.now(), size: 20, seed });
    if (!ids.length) return;
    await storage.setActiveSession(createSession({ lb, questionIds: ids, mode: "mistakes", now: Date.now(), timed: false, blueprintCompliant: false, seed }));
    await refresh();
    nav.navigate("Tabs", { screen: "Exam" });
  };
  return (
    <Screen>
      <P>Practice sets use only questions you previously answered incorrectly — never new questions or options — prioritised by error frequency and recency.</P>
      {stats.length === 0 ? <Ui k="mistakes.empty" /> : (
        <>
          <Button kind="primary" title="Start mistakes practice (untimed)" onPress={() => void start()} disabled={!!activeSession} />
          {stats.map((s) => {
            const q = lb.byId.get(s.questionId);
            return <Card key={s.questionId}>{q && <TrText k={q.i18n.question}>{q.englishQuestion}</TrText>}<P muted small>Wrong {s.timesWrong}× · seen {s.timesSeen}× · status {s.latestMark ?? "—"}</P></Card>;
          })}
        </>
      )}
    </Screen>
  );
}

export function ProgressScreen() {
  const { attempts } = useStore();
  const s = summarize(attempts, Date.now());
  const pc = (x: number | null) => (x == null ? "No data yet" : `${Math.round(x * 100)}%`);
  return (
    <Screen>
      <P muted>Observed results from attempts stored on this device only. No sample data.</P>
      <Card><P>Full exams: {s.examAttempts}</P><P>Pass rate: {pc(s.passRate)}</P><P>Latest: {s.latest ? `${s.latest.score}/${s.latest.total} ${s.latest.passed ? "PASS" : "FAIL"}` : "No data yet"}</P>
        <P>Last 7 days: {s.last7.attempts} exam(s), avg {s.last7.averagePercent == null ? "—" : `${Math.round(s.last7.averagePercent)}%`}</P>
        <P>Last 30 days: {s.last30.attempts} exam(s), avg {s.last30.averagePercent == null ? "—" : `${Math.round(s.last30.averagePercent)}%`}</P></Card>
      <H2>Accuracy by syllabus category</H2>
      {s.byCategory.length ? s.byCategory.map((c) => <P key={c.category}>{categoryLabel(c.category)}: {c.correct}/{c.total} ({pc(c.accuracy)})</P>) : <P muted>No data yet</P>}
      <H2>Most frequently missed</H2>
      {s.frequentlyMissed.length ? s.frequentlyMissed.map((m) => <P key={m.questionId} small>{lb.byId.get(m.questionId)?.englishQuestion} — wrong {m.timesWrong}/{m.timesSeen}</P>) : <P muted>No data yet</P>}
    </Screen>
  );
}

export function AuditScreen() {
  const a = auditJson as { confirmedCounts: Record<string, unknown>; statusCounts: Record<string, number>; quarantine: { questionId: string; page: number; printedQuestionNumber: number; status: string; reasons: { code: string }[] }[] };
  return (
    <Screen>
      <P small>Source SHA-256 {lb.bank.sourceDocumentSha256}</P>
      <Card>{Object.entries(a.confirmedCounts).filter(([, v]) => typeof v === "number").map(([k, v]) => <P key={k} small>{k}: {String(v)}</P>)}
        {Object.entries(a.statusCounts).map(([k, v]) => <P key={k} small>status {k}: {v}</P>)}</Card>
      <H2>Quarantined / excluded ({a.quarantine.length})</H2>
      {a.quarantine.map((x) => <P key={x.questionId} small>p{x.page} #{x.printedQuestionNumber} · {x.status} · {x.reasons.map((r) => r.code).join(", ")}</P>)}
    </Screen>
  );
}
