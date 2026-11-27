import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { latestMarks, type AttemptItem, type StudyMark } from "@itil5/core";
import { attemptTitle, categoryShort, lb, pct } from "../data";
import { useStore } from "../store";
import { usePalette } from "../theme";
import { Explanation } from "../components/Explanation";
import { TrText } from "../components/TrText";
import { Button, Card, Chips, P, Pill, Row, Screen } from "../components/Ui";
import type { TabParams } from "../nav";

type Filter = "wrong" | "unanswered" | "flagged" | "all";

export function ReviewScreen() {
  const route = useRoute<RouteProp<TabParams, "Review">>();
  const { attempts, marks, storage, refresh, bookmarks, toggleBookmark } = useStore();
  const p = usePalette();
  const [sel, setSel] = useState<string | undefined>(route.params?.attemptId);
  const [filter, setFilter] = useState<Filter | null>(null);
  useEffect(() => { if (route.params?.attemptId) { setSel(route.params.attemptId); setFilter(null); } }, [route.params?.attemptId]);
  const latest = useMemo(() => latestMarks(marks), [marks]);
  const a = attempts.find((x) => x.attemptId === sel) ?? attempts[0];
  if (!a) return <Screen><Text style={{ color: p.text, fontSize: 22, fontWeight: "800" }}>Review</Text><View style={{ height: 8 }} /><P muted>No completed exams yet. Finish an exam to review your answers here.</P></Screen>;
  const wrongItems = a.items.filter((i) => !i.correct && i.selected);
  const blank = a.items.filter((i) => !i.selected);
  const flagged = a.items.filter((i) => i.flagged);
  // default view: wrong answers, else unanswered, else everything
  const f: Filter = filter ?? (wrongItems.length ? "wrong" : blank.length ? "unanswered" : "all");
  const list: AttemptItem[] = f === "wrong" ? wrongItems : f === "unanswered" ? blank : f === "flagged" ? flagged : a.items;
  const mark = async (questionId: string, m: StudyMark) => { await storage.addMark({ questionId, mark: m, at: Date.now() }); await refresh(); };
  return (
    <Screen testID="review">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, marginBottom: 10 }}>
        {attempts.slice(0, 15).map((x) => {
          const on = x.attemptId === a.attemptId;
          return (
            <Pressable key={x.attemptId} onPress={() => { setSel(x.attemptId); setFilter(null); }} accessibilityRole="button" accessibilityState={{ selected: on }}
              style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: on ? p.accent : p.border, backgroundColor: on ? p.accentSoft : p.surface }}>
              <Text style={{ color: p.text, fontWeight: "700", fontSize: 13 }}>{attemptTitle(x)}</Text>
              <Text style={{ color: p.muted, fontSize: 11.5 }}>{new Date(x.submittedAt).toLocaleDateString()} · {x.score}/{x.total}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text accessibilityRole="header" style={{ color: p.text, fontSize: 24, fontWeight: "800" }}>Review · {attemptTitle(a)}</Text>
      <Row style={{ marginTop: 4, marginBottom: 10 }}>
        {a.passed != null && <Pill text={a.passed ? "✓ Passed" : "✗ Failed"} color={a.passed ? p.ok : p.bad} bg={a.passed ? p.okBg : p.badBg} />}
        <Text style={{ color: p.muted, fontSize: 14 }}>{a.score}/{a.total} · {pct(a.score, a.total)}%{a.passMark != null ? ` · pass ${a.passMark}` : ""}</Text>
      </Row>
      <Chips<Filter> value={f} onChange={setFilter} items={[
        { key: "wrong", label: `Wrong ${wrongItems.length}` }, { key: "unanswered", label: `Unanswered ${blank.length}` },
        { key: "flagged", label: `Flagged ${flagged.length}` }, { key: "all", label: `All ${a.items.length}` },
      ]} />
      <Text style={{ color: p.muted, fontSize: 12.5, marginTop: 8 }} testID="review-count">{list.length} item(s) · tap any sentence for Arabic</Text>
      {list.map((w) => {
        const q = lb.byId.get(w.questionId);
        const idx = a.items.indexOf(w) + 1;
        if (!q) return <Card key={w.questionId}><P small muted>Stored snapshot (question no longer in the bank):</P><P>{w.snapshot.englishQuestion}</P></Card>;
        const opt = (l: string) => q.englishOptions.find((o) => o.label === l)!;
        const keyNow = q.sourceAnswerKey;
        return (
          <Card key={w.questionId} testID="review-item">
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={{ color: p.muted, fontSize: 12.5, fontWeight: "700", flexShrink: 1 }}>Q {idx} · {categoryShort(q.audit.syllabusCategory)}{q.correction ? " · معدّل" : ""}</Text>
              <Pressable onPress={() => void toggleBookmark(q.questionId)} accessibilityRole="button" accessibilityState={{ selected: bookmarks.has(q.questionId) }} hitSlop={8}>
                <Text style={{ color: bookmarks.has(q.questionId) ? p.warn : p.muted, fontSize: 14 }}>{bookmarks.has(q.questionId) ? "★ Saved" : "☆ Save"}</Text>
              </Pressable>
            </Row>
            <View style={{ height: 8 }} />
            <TrText k={q.i18n.question} style={{ fontSize: 16.5, lineHeight: 23, fontWeight: "600" }} testID="review-stem">{q.englishQuestion}</TrText>
            {w.selected == null ? (
              <View style={{ marginTop: 12, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: p.muted, padding: 10, backgroundColor: p.surface2 }}>
                <Text style={{ color: p.muted, fontWeight: "800", fontSize: 12 }}>— NOT ANSWERED</Text>
              </View>
            ) : (
              <View style={{ marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: w.correct ? p.okBorder : p.badBorder, backgroundColor: w.correct ? p.okBg : p.badBg, padding: 10 }}>
                <Text style={{ color: w.correct ? p.ok : p.bad, fontWeight: "800", fontSize: 12, marginBottom: 3 }}>{w.correct ? "✓" : "✗"} YOUR ANSWER · {w.selected}</Text>
                <TrText k={q.i18n.options[w.selected]} tone={w.correct ? "ok" : "bad"} style={{ fontSize: 15 }}>{opt(w.selected).text}</TrText>
              </View>
            )}
            {!w.correct && (
              <View style={{ marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: p.okBorder, backgroundColor: p.okBg, padding: 10 }}>
                <Text style={{ color: p.ok, fontWeight: "800", fontSize: 12, marginBottom: 3 }}>✓ CORRECT ANSWER · {keyNow}</Text>
                <TrText k={q.i18n.options[keyNow]} tone="ok" style={{ fontSize: 15 }}>{opt(keyNow).text}</TrText>
                {w.sourceAnswerKey !== keyNow && <Text style={{ color: p.warn, fontSize: 12, marginTop: 4 }}>Key corrected since this exam (was {w.sourceAnswerKey}).</Text>}
              </View>
            )}
            <Explanation q={q} />
            <Row style={{ marginTop: 10, flexWrap: "wrap", gap: 6 }}>
              {(["studied", "confusing", "mastered"] as StudyMark[]).map((m) => (
                <Button key={m} kind={latest.get(w.questionId) === m ? "flag" : "default"} title={m === "studied" ? "✓ Studied" : m === "confusing" ? "? Confusing" : "★ Mastered"}
                  onPress={() => void mark(w.questionId, m)} style={{ flexGrow: 1, minHeight: 40, paddingVertical: 8 }} />
              ))}
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}
