import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { summarize } from "@itil5/core";
import { categoryShort, fixedTitle, lb } from "../data";
import { useStore } from "../store";
import { scoreColor, usePalette } from "../theme";
import { TrendChart } from "../components/Charts";
import { Bar, Card, P, Row, Screen, Section } from "../components/Ui";
import type { TabParams } from "../nav";

export function ProgressScreen() {
  const { attempts } = useStore();
  const nav = useNavigation<BottomTabNavigationProp<TabParams>>();
  const p = usePalette();
  const [w, setW] = useState(320);
  const s = useMemo(() => summarize(attempts, Date.now()), [attempts]);
  const exams = s.trend;
  const avg = exams.length ? exams.reduce((n, x) => n + x.percent, 0) / exams.length : null;
  const best = exams.length ? Math.max(...exams.map((x) => x.percent)) : null;
  const cats = lb.bank.categories.map((c) => ({ id: c.id, v: s.byCategory.find((b) => b.category === c.id) }));
  const weakest = s.byCategory.filter((c) => c.total >= 3).sort((a, b) => a.accuracy - b.accuracy)[0];
  const tile = (value: string, label: string, color?: string) => (
    <Card style={{ flex: 1, alignItems: "center", paddingVertical: 10, paddingHorizontal: 4, marginVertical: 0 }}>
      <Text style={{ color: color ?? p.text, fontSize: 20, fontWeight: "800" }}>{value}</Text>
      <Text style={{ color: p.muted, fontSize: 11 }}>{label}</Text>
    </Card>
  );
  return (
    <Screen testID="progress">
      <Text accessibilityRole="header" style={{ color: p.text, fontSize: 28, fontWeight: "800" }}>Progress</Text>
      <Row style={{ gap: 8, marginTop: 10 }}>
        {tile(String(s.examAttempts), "Exams")}
        {tile(s.passRate == null ? "—" : `${Math.round(s.passRate * 100)}%`, "Pass rate")}
        {tile(avg == null ? "—" : `${Math.round(avg)}%`, "Average")}
        {tile(best == null ? "—" : `${Math.round(best)}%`, "Best", best != null ? scoreColor(p, best) : undefined)}
      </Row>
      <Section>Score trend</Section>
      <Card style={{ paddingHorizontal: 10 }}>
        <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
          {exams.length ? (
            <TrendChart width={w} points={exams.map((x) => ({ percent: x.percent, passed: x.passed, label: x.mode === "fixed" ? fixedTitle(x.examId) : "Random" }))} />
          ) : <P muted>No exams yet. Your results will appear here.</P>}
        </View>
      </Card>
      <Section>By category</Section>
      <Card>
        {cats.map(({ id, v }) => {
          const pc = v ? Math.round(v.accuracy * 100) : null;
          const color = pc == null ? p.muted : scoreColor(p, pc);
          return (
            <View key={id} style={{ marginBottom: 9 }}>
              <Row style={{ justifyContent: "space-between" }}>
                <Text style={{ color: p.text, fontSize: 14 }}>{categoryShort(id)}</Text>
                <Text style={{ color, fontWeight: "800" }}>{pc == null ? "—" : `${pc}%`}</Text>
              </Row>
              <View style={{ height: 4 }} />
              <Bar value={v ? v.accuracy : 0} color={color} />
            </View>
          );
        })}
        <Text style={{ color: p.muted, fontSize: 11.5 }}>All answers in every exam, including mistakes exams.</Text>
      </Card>
      {weakest && (
        <Card style={{ borderColor: p.badBorder, backgroundColor: p.badBg }} onPress={() => nav.navigate("Study", { category: weakest.category })} accessibilityLabel={`Practise weakest area ${categoryShort(weakest.category)}`} testID="practise-weakest">
          <Row style={{ justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: p.muted, fontSize: 12 }}>Weakest area</Text>
              <Text style={{ color: p.text, fontWeight: "800", fontSize: 15 }}>{categoryShort(weakest.category)} · {Math.round(weakest.accuracy * 100)}%</Text>
            </View>
            <View style={{ backgroundColor: p.bad, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}><Text style={{ color: "#fff", fontWeight: "800" }}>Practise ›</Text></View>
          </Row>
        </Card>
      )}
    </Screen>
  );
}
