import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { checkStudyAnswer, latestMarks, studyQuestions, type OptionLabel, type StudyMark } from "@itil5/core";
import { categoryLabel, lb } from "../data";
import { useStore } from "../store";
import { usePalette } from "../theme";
import { QuestionCard } from "../components/QuestionCard";
import { Explanation } from "../components/Explanation";
import { Bar, Button, Card, Chips, P, Pill, Row, Screen } from "../components/Ui";
import type { TabParams } from "../nav";

type Filter = "notStudied" | "saved" | "confusing" | "all" | "legacy";
const POS_KEY = "itil5.study.position.v1";
const FILTERS: Filter[] = ["notStudied", "saved", "confusing", "all", "legacy"];
const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9؀-ۿ ]+/g, " ");

export function StudyScreen() {
  const route = useRoute<RouteProp<TabParams, "Study">>();
  const { marks, storage, refresh, bookmarks, toggleBookmark } = useStore();
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const [cat, setCat] = useState<number | "all">(route.params?.category ?? "all");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [picker, setPicker] = useState(false);
  const [i, setI] = useState(0);
  // The answer belongs to one question: it can never carry over to another question.
  const [picked, setPicked] = useState<{ id: string; label: OptionLabel } | null>(null);
  // Restore where the learner left off (category, filter, question) unless a category was requested.
  const restored = useRef(false);
  useEffect(() => {
    if (route.params?.category) { restored.current = true; return; }
    void AsyncStorage.getItem(POS_KEY).then((raw) => {
      try {
        const v = raw ? JSON.parse(raw) : null;
        if (v && (v.cat === "all" || lb.bank.categories.some((c) => c.id === v.cat)) && FILTERS.includes(v.filter)) {
          setCat(v.cat); setFilter(v.filter); setQuery(""); setI(Math.max(0, Number(v.i) || 0));
        }
      } catch { /* ignore a corrupt value */ }
      restored.current = true;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (restored.current) void AsyncStorage.setItem(POS_KEY, JSON.stringify({ cat, filter, i }));
  }, [cat, filter, i]);
  useEffect(() => { if (route.params?.category) { setCat(route.params.category); setFilter("all"); setI(0); setPicked(null); } }, [route.params?.category]);
  const latest = useMemo(() => latestMarks(marks), [marks]);
  const base = useMemo(() => studyQuestions(lb, filter === "legacy" ? "all" : cat, { includeLegacy: filter === "legacy" }), [cat, filter]);
  // Marks and bookmarks are read through refs so that answering, marking or saving the question on
  // screen does NOT remove it from the list (e.g. under "Not studied"). The list is rebuilt only
  // when the category, filter or search changes.
  const latestRef = useRef(latest);
  latestRef.current = latest;
  const bookmarksRef = useRef(bookmarks);
  bookmarksRef.current = bookmarks;
  const list = useMemo(() => {
    const lm = latestRef.current, bm = bookmarksRef.current;
    let l = base;
    if (filter === "legacy") l = l.filter((q) => q.audit.legacy);
    if (filter === "notStudied") l = l.filter((q) => !lm.has(q.questionId));
    if (filter === "saved") l = l.filter((q) => bm.has(q.questionId));
    if (filter === "confusing") l = l.filter((q) => lm.get(q.questionId) === "confusing");
    const qn = norm(query).trim();
    if (qn) l = l.filter((q) => norm([q.englishQuestion, ...q.englishOptions.map((o) => o.text)].join(" ")).includes(qn));
    return l;
  }, [base, filter, query]);
  const catAll = useMemo(() => studyQuestions(lb, cat), [cat]);
  const studied = catAll.filter((q) => latest.has(q.questionId)).length;
  const idx = Math.min(i, Math.max(0, list.length - 1));
  const q = list[idx];
  const sel = q && picked?.id === q.questionId ? picked.label : null;
  const res = q && sel ? checkStudyAnswer(q, sel) : null;
  const go = (n: number) => { setI(Math.max(0, Math.min(list.length - 1, n))); setPicked(null); };
  const mark = async (id: string, m: StudyMark) => { await storage.addMark({ questionId: id, mark: m, at: Date.now() }); await refresh(); };
  const choose = (l: OptionLabel) => {
    if (!q) return;
    setPicked({ id: q.questionId, label: l });
    if (!latest.has(q.questionId) && !q.audit.legacy) void mark(q.questionId, "studied");
  };
  const count = (c: number | "all") => studyQuestions(lb, c).length;
  return (
    <Screen testID="study" safeTop>
      <Text accessibilityRole="header" style={{ color: p.text, fontSize: 28, fontWeight: "800" }}>Study</Text>
      <TextInput value={query} onChangeText={(v) => { setQuery(v); setI(0); setPicked(null); }} placeholder="🔍  Search questions…" placeholderTextColor={p.muted}
        style={{ marginTop: 10, borderWidth: 1, borderColor: p.border, backgroundColor: p.surface, color: p.text, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16 }}
        accessibilityLabel="Search questions" autoCorrect={false} clearButtonMode="while-editing" testID="study-search" />
      <Pressable onPress={() => setPicker(true)} accessibilityRole="button" accessibilityLabel={`Category: ${cat === "all" ? "All categories" : categoryLabel(cat)}`} testID="study-category"
        style={{ marginTop: 8, borderWidth: 1, borderColor: p.border, backgroundColor: p.surface, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: p.text, fontSize: 15, flex: 1 }} numberOfLines={2}>{cat === "all" ? "All categories" : categoryLabel(cat)} <Text style={{ color: p.muted }}>({count(cat)})</Text></Text>
        <Text style={{ color: p.muted }}>▾</Text>
      </Pressable>
      <View style={{ marginTop: 10 }}>
        <Chips<Filter> value={filter} onChange={(f) => { setFilter(f); setI(0); setPicked(null); }} items={[
          { key: "all", label: "All" },
          { key: "notStudied", label: `Not studied ${catAll.length - studied}` },
          { key: "saved", label: `★ Saved ${[...bookmarks].filter((b) => lb.byId.get(b)).length}` },
          { key: "confusing", label: `Confusing ${catAll.filter((x) => latest.get(x.questionId) === "confusing").length}` },
          { key: "legacy", label: "ITIL 4 (old)" },
        ]} />
      </View>
      <Row style={{ justifyContent: "space-between", marginTop: 12 }}>
        <Text style={{ color: p.muted, fontSize: 12.5 }}>Studied {cat === "all" ? "overall" : "in this category"}</Text>
        <Text style={{ color: p.text, fontWeight: "800", fontSize: 12.5 }}>{studied} / {catAll.length}</Text>
      </Row>
      <View style={{ height: 5 }} />
      <Bar value={catAll.length ? studied / catAll.length : 0} color={p.accent} />
      {q ? (
        <Card style={{ marginTop: 12 }} testID="study-card">
          <Row style={{ justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ color: p.muted, fontSize: 12.5, fontWeight: "700" }}>{idx + 1} of {list.length}{q.audit.syllabusCriterion ? ` · ${q.audit.syllabusCriterion} · BL${q.audit.bloomLevel}` : ""}</Text>
            <Pressable onPress={() => void toggleBookmark(q.questionId)} accessibilityRole="button" accessibilityState={{ selected: bookmarks.has(q.questionId) }} hitSlop={8} testID="study-save">
              <Text style={{ color: bookmarks.has(q.questionId) ? p.warn : p.muted, fontSize: 14 }}>{bookmarks.has(q.questionId) ? "★ Saved" : "☆ Save"}</Text>
            </Pressable>
          </Row>
          {(q.audit.legacy || q.correction) && (
            <Row style={{ marginBottom: 8 }}>
              {q.audit.legacy && <Pill text="ITIL 4 قديم · study only, not in exams" color={p.warn} bg={p.warnBg} />}
              {q.correction && <Pill text={`معدّل · Book ${q.correction.bookReference}`} color={p.warn} bg={p.warnBg} />}
            </Row>
          )}
          <QuestionCard key={q.questionId} q={q} selected={sel} onSelect={choose} showKey={!!sel} />
          {res && <Text style={{ marginTop: 10, fontWeight: "800", color: res.correct ? p.ok : p.bad }}>{res.correct ? "Correct" : `Incorrect: the answer is ${res.sourceAnswerKey}`}</Text>}
          {sel && <Explanation q={q} />}
          {!sel && <Text style={{ color: p.muted, fontSize: 12.5, marginTop: 10 }}>Choose an answer with the round button to see the result and explanation.</Text>}
          {!q.audit.legacy && (
            <Row style={{ marginTop: 12, gap: 6 }}>
              {(["studied", "confusing", "mastered"] as StudyMark[]).map((m) => (
                <Button key={m} kind={latest.get(q.questionId) === m ? "flag" : "default"} title={m === "studied" ? "✓ Studied" : m === "confusing" ? "? Confusing" : "★ Mastered"}
                  onPress={() => void mark(q.questionId, m)} style={{ flex: 1, minHeight: 40, paddingVertical: 8, paddingHorizontal: 4 }} />
              ))}
            </Row>
          )}
        </Card>
      ) : <Card style={{ marginTop: 12 }}><P muted>No questions match this filter.</P></Card>}
      {q && (
        <Row style={{ marginTop: 10 }}>
          <Button title="‹ Previous" onPress={() => go(idx - 1)} disabled={idx === 0} style={{ flex: 1 }} />
          <Button kind="primary" title="Next ›" onPress={() => go(idx + 1)} disabled={idx >= list.length - 1} style={{ flex: 1 }} testID="study-next" />
        </Row>
      )}
      <Modal visible={picker} transparent animationType="slide" onRequestClose={() => setPicker(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: p.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, paddingBottom: insets.bottom + 16, maxHeight: "80%" }}>
            <Text style={{ color: p.text, fontWeight: "800", fontSize: 17, marginBottom: 8 }}>Category</Text>
            <ScrollView>
              {(["all", ...lb.bank.categories.map((c) => c.id)] as (number | "all")[]).map((c) => (
                <Pressable key={String(c)} onPress={() => { setCat(c); setPicker(false); setI(0); setPicked(null); }} accessibilityRole="button" accessibilityState={{ selected: cat === c }}
                  style={{ paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: p.border, flexDirection: "row", gap: 8 }}>
                  <Text style={{ color: cat === c ? p.accent : p.text, fontSize: 15, flex: 1, fontWeight: cat === c ? "800" : "500" }}>{c === "all" ? "All categories" : categoryLabel(c)}</Text>
                  <Text style={{ color: p.muted }}>{count(c)}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={{ height: 8 }} />
            <Button title="Close" onPress={() => setPicker(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
