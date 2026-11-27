import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { answer, formatDuration, goTo, isExpired, progress, remainingMs, submit, toggleFlag, type ExamSession, type OptionLabel } from "@itil5/core";
import { attemptTitle, categoryLabel, lb } from "../data";
import { useStore } from "../store";
import { usePalette } from "../theme";
import { QuestionCard } from "../components/QuestionCard";
import { Bar, Button, Card, P, Pill, Row, Screen } from "../components/Ui";
import type { RootParams } from "../nav";
import { confirmAsync } from "../confirm";

export function ExamScreen() {
  const { activeSession, ready } = useStore();
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  if (!ready) return null;
  if (!activeSession) {
    return (
      <Screen>
        <P>No exam in progress.</P>
        <View style={{ height: 12 }} />
        <Button kind="primary" title="Back to Home" onPress={() => nav.popTo("Tabs", { screen: "Home" })} />
      </Screen>
    );
  }
  return <Runner key={activeSession.sessionId} initial={activeSession} />;
}

const WARN_AT = [10 * 60_000, 5 * 60_000];

function Runner({ initial }: { initial: ExamSession }) {
  const { storage, refresh, settings, saveSession } = useStore();
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const [s, setS] = useState(initial);
  const [now, setNow] = useState(Date.now());
  const [navOpen, setNavOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const warned = useRef(new Set<number>());
  const done = useRef(false);
  const persist = (n: ExamSession) => { setS(n); void saveSession(n); };
  const finish = useCallback(async (by: "user" | "timer") => {
    if (done.current) return;
    done.current = true;
    const a = submit(lb, s, Date.now(), by);
    await storage.saveAttempt(a);
    await storage.setActiveSession(null);
    await refresh();
    nav.replace("Results", { attemptId: a.attemptId, timeout: by === "timer" });
  }, [s, storage, refresh, nav]);
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    const sub = AppState.addEventListener("change", () => setNow(Date.now())); // timer is timestamp-based
    return () => { clearInterval(iv); sub.remove(); };
  }, []);
  useEffect(() => { if (isExpired(s, now)) void finish("timer"); }, [now, s, finish]);
  const rem = remainingMs(s, now);
  useEffect(() => {
    if (rem == null || !settings.timerWarnings || s.durationMs == null) return;
    for (const w of WARN_AT) {
      if (s.durationMs > w && rem <= w && rem > w - 60_000 && !warned.current.has(w)) {
        warned.current.add(w);
        setBanner(`${w / 60_000} minutes left`);
        setTimeout(() => setBanner(null), 8000);
      }
    }
  }, [rem, settings.timerWarnings, s.durationMs]);

  const id = s.questionIds[s.current]!;
  const q = lb.byId.get(id)!;
  const pr = progress(s);
  const last = s.current === s.questionIds.length - 1;
  const leave = () => void confirmAsync("Leave the exam?", "Your answers are saved and the timer keeps running. Resume it from Home.", "Leave", { cancel: "Stay" })
    .then((ok) => { if (ok) nav.popTo("Tabs", { screen: "Home" }); });
  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}>
      <View style={st.top}>
        <Pressable onPress={leave} accessibilityRole="button" accessibilityLabel="Leave exam" hitSlop={10} testID="exam-leave">
          <Ionicons name="close" size={26} color={p.muted} />
        </Pressable>
        <View style={{ alignItems: "center" }} accessibilityRole="summary">
          <Text style={{ color: p.text, fontWeight: "800", fontSize: 16 }} testID="exam-title">{attemptTitle(s)}</Text>
          <Text style={{ color: p.muted, fontSize: 12.5 }} testID="q-counter">Question {s.current + 1} of {s.questionIds.length}</Text>
        </View>
        <View accessibilityRole="timer" accessibilityLabel={rem == null ? "Untimed" : `Time remaining ${formatDuration(rem)}`}
          style={[st.timer, { backgroundColor: rem != null && rem < 300_000 ? p.badBg : p.accentSoft }]}>
          <Text style={{ color: rem != null && rem < 300_000 ? p.bad : p.accent, fontWeight: "800", fontVariant: ["tabular-nums"], fontSize: 15 }}>
            {rem == null ? "Untimed" : `⏱ ${formatDuration(rem)}`}
          </Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: 16 }}><Bar value={(s.current + 1) / s.questionIds.length} color={p.accent} height={6} /></View>
      {banner && (
        <View style={[st.banner, { backgroundColor: p.warnBg, borderColor: p.warn }]} accessibilityLiveRegion="polite">
          <Text style={{ color: p.warn, fontWeight: "800" }}>⏰ {banner}</Text>
        </View>
      )}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
        <Row style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <Pill text={categoryLabel(q.audit.syllabusCategory)} color={p.muted} bg={p.surface2} style={{ flexShrink: 1 }} />
          <Pressable onPress={() => persist(toggleFlag(s, id))} accessibilityRole="button" accessibilityState={{ selected: !!s.flags[id] }}
            style={[st.flag, { borderColor: s.flags[id] ? p.flag : p.border, backgroundColor: s.flags[id] ? p.warnBg : "transparent" }]} testID="flag">
            <Text style={{ color: p.flag, fontWeight: "700", fontSize: 13 }}>{s.flags[id] ? "⚑ Flagged" : "⚐ Flag"}</Text>
          </Pressable>
        </Row>
        <QuestionCard key={id} q={q} selected={s.answers[id]} onSelect={(l: OptionLabel) => persist(answer(s, id, l))} />
        <Text style={{ color: p.muted, fontSize: 12, marginTop: 14, textAlign: "center" }} testID="answered-count">
          {pr.answered} answered · {pr.flagged} flagged · tap a sentence for Arabic
        </Text>
      </ScrollView>
      <View style={[st.bottom, { paddingBottom: Math.max(insets.bottom, 10), backgroundColor: p.tabBar, borderColor: p.border }]}>
        <Button title="‹ Back" onPress={() => persist(goTo(s, s.current - 1))} disabled={s.current === 0} style={{ flex: 1 }} testID="prev" />
        <Button title="▦" onPress={() => setNavOpen(true)} style={{ width: 64 }} accessibilityHint="Opens the question navigator" testID="open-navigator" />
        {last
          ? <Button kind="danger" title="Submit" onPress={() => setConfirm(true)} style={{ flex: 1.4 }} testID="submit" />
          : <Button kind="primary" title="Next ›" onPress={() => persist(goTo(s, s.current + 1))} style={{ flex: 1.4 }} testID="next" />}
      </View>
      <Modal visible={navOpen} animationType="slide" transparent onRequestClose={() => setNavOpen(false)}>
        <View style={st.backdrop}>
          <View style={[st.sheet, { backgroundColor: p.surface, paddingBottom: insets.bottom + 16 }]}>
            <Text style={{ color: p.text, fontWeight: "800", fontSize: 17, marginBottom: 10 }}>Question navigator</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              <View style={st.grid}>
                {s.questionIds.map((qid, i) => (
                  <Pressable key={qid} onPress={() => { persist(goTo(s, i)); setNavOpen(false); }}
                    accessibilityRole="button" accessibilityLabel={`Question ${i + 1}, ${s.answers[qid] ? "answered" : "unanswered"}${s.flags[qid] ? ", flagged" : ""}`}
                    style={[st.cell, { backgroundColor: s.answers[qid] ? p.accent : p.surface2, borderColor: s.flags[qid] ? p.flag : i === s.current ? p.text : p.border, borderWidth: s.flags[qid] || i === s.current ? 3 : 1 }]}>
                    <Text style={{ color: s.answers[qid] ? p.accentText : p.text, fontWeight: "700" }}>{i + 1}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <Text style={{ color: p.muted, marginVertical: 8, fontSize: 13 }}>Filled = answered · orange border = flagged</Text>
            <Button kind="danger" title="Submit exam…" onPress={() => { setNavOpen(false); setConfirm(true); }} />
            <View style={{ height: 8 }} />
            <Button title="Close" onPress={() => setNavOpen(false)} />
          </View>
        </View>
      </Modal>
      <Modal visible={confirm} transparent animationType="fade" onRequestClose={() => setConfirm(false)}>
        <View style={[st.backdrop, { justifyContent: "center", padding: 24 }]}>
          <Card>
            <Text style={{ color: p.text, fontWeight: "800", fontSize: 18 }}>Submit exam?</Text>
            <View style={{ height: 6 }} />
            <P>Answers cannot be changed after submission.</P>
            {pr.unanswered > 0 && <P>{pr.unanswered} question(s) unanswered.</P>}
            {pr.flagged > 0 && <P>{pr.flagged} question(s) flagged for review.</P>}
            <Row style={{ marginTop: 12 }}>
              <Button title="Cancel" onPress={() => setConfirm(false)} style={{ flex: 1 }} />
              <Button kind="danger" title="Submit now" onPress={() => { setConfirm(false); void finish("user"); }} style={{ flex: 1 }} testID="submit-now" />
            </Row>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10 },
  timer: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
  flag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
  banner: { marginHorizontal: 16, marginTop: 10, borderWidth: 1, borderRadius: 12, padding: 10, alignItems: "center" },
  bottom: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, maxHeight: "85%" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  cell: { width: 48, height: 48, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
