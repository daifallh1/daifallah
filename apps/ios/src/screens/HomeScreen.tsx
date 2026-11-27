import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { fixedExamStatus, mistakeQueue, summarize } from "@itil5/core";
import { attemptTitle, lb } from "../data";
import { APP_VERSION } from "../appInfo";
import { useStore } from "../store";
import { usePalette } from "../theme";
import { Ring } from "../components/Charts";
import { Bar, Button, Card, Pill, Row, Screen, Section } from "../components/Ui";
import type { RootParams } from "../nav";

export function HomeScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { attempts, marks, activeSession, startExam } = useStore();
  const p = usePalette();
  const sum = useMemo(() => summarize(attempts, Date.now()), [attempts]);
  // Level indicators use real exams only: mistakes exams repeat questions already answered.
  const graded = useMemo(() => attempts.filter((a) => a.mode !== "mistakes"), [attempts]);
  const fixed = useMemo(() => fixedExamStatus(lb, attempts, activeSession), [attempts, activeSession]);
  const mq = useMemo(() => mistakeQueue(lb, attempts, marks), [attempts, marks]);
  const answered = graded.flatMap((a) => a.items.filter((i) => i.selected));
  const accuracy = answered.length ? answered.filter((i) => i.correct).length / answered.length : null;
  const covered = useMemo(() => new Set(attempts.flatMap((a) => a.items.map((i) => i.questionId)).filter((id) => lb.byId.get(id)?.audit.examEligible)).size, [attempts]);
  const distinct = (lb.bank.fixedExams ?? []).reduce((n, e) => n + e.questionIds.length, 0);
  const go = async (k: Parameters<typeof startExam>[0]) => { if (await startExam(k)) nav.navigate("Exam"); };
  const latest = sum.latest;

  return (
    <Screen testID="home" safeTop>
      <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: p.muted, fontSize: 14 }}>Welcome back</Text>
          <Text accessibilityRole="header" style={{ color: p.text, fontSize: 28, fontWeight: "800", letterSpacing: -0.4 }}>ITIL 5 Foundation</Text>
        </View>
        <Pressable onPress={() => nav.navigate("Settings")} accessibilityRole="button" accessibilityLabel="Settings" hitSlop={10} testID="open-settings">
          <Ionicons name="settings-outline" size={26} color={p.muted} />
        </Pressable>
      </Row>

      {activeSession && (
        <Card style={{ borderColor: p.warn, backgroundColor: p.warnBg }} onPress={() => nav.navigate("Exam")} testID="resume-card" accessibilityLabel="Resume the exam in progress">
          <Row style={{ justifyContent: "space-between" }}>
            <View>
              <Text style={{ color: p.warn, fontWeight: "800" }}>⏸ Exam in progress</Text>
              <Text style={{ color: p.text, marginTop: 2 }}>{attemptTitle(activeSession)} · {Object.values(activeSession.answers).filter(Boolean).length}/{activeSession.questionIds.length} answered</Text>
            </View>
            <Text style={{ color: p.warn, fontWeight: "800" }}>Resume ›</Text>
          </Row>
        </Card>
      )}

      <Card>
        <Row style={{ gap: 16 }}>
          <Ring value={accuracy} label="accuracy" testID="accuracy-ring" />
          <View style={{ flex: 1, gap: 6 }}>
            <Stat label="Exams taken" value={String(sum.examAttempts)} />
            <Stat label="Passed" value={sum.examAttempts ? `${Math.round((sum.passRate ?? 0) * sum.examAttempts)} / ${sum.examAttempts}` : "—"} />
            <Stat label="Last score" value={latest ? `${latest.score}/${latest.total} · ${Math.round(latest.percent)}%` : "—"} color={latest ? (latest.passed ? p.ok : p.bad) : undefined} />
            <Stat label="Bank covered" value={`${Math.min(covered, distinct)} / ${distinct}`} />
          </View>
        </Row>
      </Card>

      <Button kind="primary" title="▶  Start random exam" subtitle="40 questions · 60 min · pass 65%" onPress={() => void go({ kind: "random" })} style={{ marginTop: 8 }} testID="start-random" />

      <Section>Fixed exams</Section>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {fixed.map((f) => {
          const a = f.latest;
          const color = f.inProgress ? p.warn : a ? (a.passed ? p.ok : p.bad) : p.muted;
          const status = f.inProgress && activeSession ? `⏸ In progress · ${Object.values(activeSession.answers).filter(Boolean).length}/${activeSession.questionIds.length}` : a ? `${a.passed ? "✓ Passed" : "✗ Failed"} · ${a.score}/${a.total}` : "Not started";
          return (
            <Card key={f.exam.examId} onPress={() => void go({ kind: "fixed", examId: f.exam.examId })} style={{ width: "48%", marginVertical: 0, padding: 12 }}
              testID={`fixed-${f.exam.examId}`} accessibilityLabel={`${f.exam.title}, ${f.exam.questionIds.length} questions, ${status}`}>
              <Row style={{ justifyContent: "space-between" }}>
                <Text style={{ color: p.text, fontWeight: "800", fontSize: 16 }}>{f.exam.title}</Text>
                <Text style={{ color: p.muted, fontSize: 12 }}>{f.exam.questionIds.length} Q</Text>
              </Row>
              <Text style={{ color, fontWeight: "700", fontSize: 12.5, marginTop: 6, marginBottom: 7 }}>{status}</Text>
              <Bar value={f.inProgress && activeSession ? Object.values(activeSession.answers).filter(Boolean).length / activeSession.questionIds.length : a ? a.score / a.total : 0} color={color} />
            </Card>
          );
        })}
      </View>

      <Card style={{ marginTop: 12, borderColor: p.badBorder, backgroundColor: p.badBg }} onPress={() => nav.navigate("Tabs", { screen: "Mistakes" })} testID="mistakes-card" accessibilityLabel={`My mistakes, ${mq.toFix.length} to fix`}>
        <Row style={{ justifyContent: "space-between" }}>
          <Text style={{ color: p.text, fontWeight: "800", fontSize: 16 }}>🎯  My mistakes</Text>
          <Pill text={`${mq.toFix.length} to fix`} color={p.bad} bg={p.surface} />
        </Row>
        <Text style={{ color: p.muted, fontSize: 13, marginTop: 6 }}>{mq.mastered.length} mastered · a question leaves the list after 2 correct answers in a row</Text>
        <Row style={{ justifyContent: "space-between", marginTop: 10 }}>
          <Text style={{ color: p.bad, fontWeight: "800" }}>{mq.toFix.length ? "Open mistakes ›" : "No mistakes yet"}</Text>
          {mq.toFix.length > 0 && <Text style={{ color: p.muted, fontSize: 12 }}>{mq.toFix.length} Q · {Math.ceil((mq.toFix.length * 90) / 60)} min</Text>}
        </Row>
      </Card>
      <Text style={{ color: p.muted, fontSize: 12, marginTop: 14, lineHeight: 17 }}>
        Tap any English sentence to see its Arabic translation. Progress is saved on this iPhone only; use Settings › Export progress to back it up.
      </Text>
      <Text style={{ color: p.muted, fontSize: 11, marginTop: 8 }} testID="home-version">Version {APP_VERSION}</Text>
    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  const p = usePalette();
  return (
    <Row style={{ justifyContent: "space-between" }}>
      <Text style={{ color: p.muted, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: color ?? p.text, fontSize: 14, fontWeight: "800" }}>{value}</Text>
    </Row>
  );
}
