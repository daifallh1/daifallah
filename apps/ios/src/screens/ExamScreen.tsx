import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  answer, createSession, formatDuration, generateExam, goTo, isExpired, progress, randomSeed, remainingMs, submit, toggleFlag,
  type ExamSession, type OptionLabel,
} from "@itil5/core";
import { lb, t } from "../data";
import { useStore } from "../store";
import { usePalette } from "../theme";
import { QuestionCard } from "../components/QuestionCard";
import { Button, Card, H1, P } from "../components/Ui";
import { TrText } from "../components/TrText";
import type { RootParams } from "../nav";

export function ExamScreen() {
  const { activeSession, ready, storage, refresh } = useStore();
  const [extended, setExtended] = useState(false);
  const p = usePalette();
  if (!ready) return null;
  if (activeSession) return <Runner key={activeSession.sessionId} initial={activeSession} />;
  const start = async () => {
    const seed = randomSeed();
    const e = generateExam(lb, { seed });
    await storage.setActiveSession(createSession({ lb, questionIds: e.questionIds, mode: "exam", now: Date.now(), extendedTime: extended, blueprintCompliant: e.blueprint.fullyCompliant, seed }));
    await refresh();
  };
  const closed = t.ui("exam.closedBook");
  return (
    <ScrollView style={{ backgroundColor: p.bg }} contentContainerStyle={{ padding: 16 }}>
      <H1>Full Exam</H1>
      <Card>
        <P>• 40 questions, one mark each, no negative marking</P>
        <P>• 60-minute countdown with automatic submission</P>
        <P>• Pass mark 26 of 40 (65%)</P>
        <P>• Option order exactly as in the source PDF</P>
        <TrText ar={closed.ar}>{`• ${closed.en}`}</TrText>
        <P>• Blueprint [12, 4, 4, 16, 2, 1, 1] and 16 BL1 / 24 BL2 enforced when the audited bank supports it</P>
      </Card>
      <View style={st.switchRow}>
        <Switch value={extended} onValueChange={setExtended} accessibilityLabel="Use 75-minute extended time" />
        <Text style={{ color: p.text, flex: 1 }}>Extended time (75 min) — only for candidates not sitting in their native or working language.</Text>
      </View>
      <Button kind="primary" title={`Start exam (${extended ? 75 : 60} minutes)`} onPress={() => void start()} />
    </ScrollView>
  );
}

function Runner({ initial }: { initial: ExamSession }) {
  const { storage, refresh } = useStore();
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const [s, setS] = useState(initial);
  const [now, setNow] = useState(Date.now());
  const [navOpen, setNavOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const done = useRef(false);
  const persist = (n: ExamSession) => { setS(n); void storage.setActiveSession(n); };
  const finish = useCallback(async (by: "user" | "timer") => {
    if (done.current) return;
    done.current = true;
    const a = submit(lb, s, Date.now(), by);
    await storage.saveAttempt(a);
    await storage.setActiveSession(null);
    await refresh();
    nav.navigate("Results", { attemptId: a.attemptId, timeout: by === "timer" });
  }, [s, storage, refresh, nav]);
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    const sub = AppState.addEventListener("change", () => setNow(Date.now())); // timer is timestamp-based
    return () => { clearInterval(iv); sub.remove(); };
  }, []);
  useEffect(() => { if (isExpired(s, now)) void finish("timer"); }, [now, s, finish]);

  const id = s.questionIds[s.current]!;
  const q = lb.byId.get(id)!;
  const pr = progress(s);
  const rem = remainingMs(s, now);
  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <View style={[st.bar, { backgroundColor: p.surface, borderColor: p.border }]} accessibilityRole="summary">
        <Text style={{ color: p.text, fontWeight: "700" }}>Q {s.current + 1} / {s.questionIds.length}</Text>
        <Text style={{ color: p.muted, fontSize: 13 }}>{pr.answered} answered · {pr.flagged} flagged</Text>
        <Text accessibilityRole="timer" accessibilityLabel={rem == null ? "Untimed" : `Time remaining ${formatDuration(rem)}`}
          style={{ color: rem != null && rem < 300000 ? p.bad : p.text, fontWeight: "800", fontVariant: ["tabular-nums"], fontSize: 17 }}>
          {rem == null ? "Untimed" : `⏱ ${formatDuration(rem)}`}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <QuestionCard key={id} q={q} selected={s.answers[id]} onSelect={(l: OptionLabel) => persist(answer(s, id, l))} />
      </ScrollView>
      <View style={[st.bottom, { paddingBottom: Math.max(insets.bottom, 10), backgroundColor: p.surface, borderColor: p.border }]}>
        <Button title="‹ Prev" onPress={() => persist(goTo(s, s.current - 1))} disabled={s.current === 0} style={st.flex} />
        <Button title={s.flags[id] ? "⚑ Flagged" : "⚐ Flag"} kind={s.flags[id] ? "flag" : "default"} onPress={() => persist(toggleFlag(s, id))} style={st.flex} />
        <Button title="☰ All" onPress={() => setNavOpen(true)} style={st.flex} accessibilityHint="Opens the question navigator" />
        {s.current < s.questionIds.length - 1
          ? <Button kind="primary" title="Next ›" onPress={() => persist(goTo(s, s.current + 1))} style={st.flex} />
          : <Button kind="danger" title="Submit" onPress={() => setConfirm(true)} style={st.flex} />}
      </View>
      <Modal visible={navOpen} animationType="slide" transparent onRequestClose={() => setNavOpen(false)}>
        <View style={st.backdrop}>
          <View style={[st.sheet, { backgroundColor: p.surface, paddingBottom: insets.bottom + 16 }]}>
            <Text style={{ color: p.text, fontWeight: "700", fontSize: 17, marginBottom: 10 }}>Question navigator</Text>
            <View style={st.grid}>
              {s.questionIds.map((qid, i) => (
                <Pressable key={qid} onPress={() => { persist(goTo(s, i)); setNavOpen(false); }}
                  accessibilityRole="button" accessibilityLabel={`Question ${i + 1}, ${s.answers[qid] ? "answered" : "unanswered"}${s.flags[qid] ? ", flagged" : ""}`}
                  style={[st.cell, { backgroundColor: s.answers[qid] ? p.accent : p.surface, borderColor: s.flags[qid] ? p.flag : i === s.current ? p.text : p.border, borderWidth: s.flags[qid] || i === s.current ? 3 : 1 }]}>
                  <Text style={{ color: s.answers[qid] ? p.accentText : p.text, fontWeight: "600" }}>{i + 1}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={{ color: p.muted, marginVertical: 8 }}>Filled = answered · orange border = flagged</Text>
            <Button kind="danger" title="Submit exam…" onPress={() => { setNavOpen(false); setConfirm(true); }} />
            <View style={{ height: 8 }} />
            <Button title="Close" onPress={() => setNavOpen(false)} />
          </View>
        </View>
      </Modal>
      <Modal visible={confirm} transparent animationType="fade" onRequestClose={() => setConfirm(false)}>
        <View style={[st.backdrop, { justifyContent: "center", padding: 24 }]}>
          <Card>
            <Text style={{ color: p.text, fontWeight: "700", fontSize: 18 }}>Submit exam?</Text>
            <P>Answers cannot be changed after submission.</P>
            {pr.unanswered > 0 && <P>{pr.unanswered} question(s) unanswered.</P>}
            {pr.flagged > 0 && <P>{pr.flagged} question(s) flagged for review.</P>}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <Button title="Cancel" onPress={() => setConfirm(false)} style={st.flex} />
              <Button kind="danger" title="Submit now" onPress={() => { setConfirm(false); void finish("user"); }} style={st.flex} />
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  switchRow: { flexDirection: "row", gap: 12, alignItems: "center", marginVertical: 14 },
  bar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, gap: 8, flexWrap: "wrap" },
  bottom: { flexDirection: "row", gap: 6, paddingHorizontal: 10, paddingTop: 10, borderTopWidth: 1 },
  flex: { flex: 1, paddingHorizontal: 4 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: "85%" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  cell: { width: 48, height: 48, borderRadius: 8, alignItems: "center", justifyContent: "center" },
});
