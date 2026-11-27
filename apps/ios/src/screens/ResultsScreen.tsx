import { Text, View } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { categoryBreakdown, formatDuration } from "@itil5/core";
import { attemptTitle, categoryShort, pct } from "../data";
import { useStore } from "../store";
import { scoreColor, usePalette } from "../theme";
import { Ring } from "../components/Charts";
import { Bar, Button, Card, P, Row, Screen, Section } from "../components/Ui";
import type { RootParams } from "../nav";

export function ResultsScreen() {
  const route = useRoute<RouteProp<RootParams, "Results">>();
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { attempts } = useStore();
  const p = usePalette();
  const a = attempts.find((x) => x.attemptId === route.params.attemptId);
  if (!a) return <Screen><P>Loading…</P></Screen>;
  const cats = categoryBreakdown(a);
  const percent = pct(a.score, a.total);
  const wrong = a.items.filter((i) => !i.correct).length;
  return (
    <Screen testID="results">
      {route.params.timeout && <Card style={{ borderColor: p.warn, backgroundColor: p.warnBg }}><Text style={{ color: p.warn, fontWeight: "800" }}>⏰ Time is up: the exam was submitted automatically.</Text></Card>}
      <Card style={{ alignItems: "center", borderWidth: 2, borderColor: a.passed == null ? p.border : a.passed ? p.ok : p.bad }}>
        <Text style={{ color: p.muted, fontWeight: "700" }}>{attemptTitle(a)}</Text>
        <View style={{ height: 8 }} />
        <Ring value={a.total ? a.score / a.total : 0} size={130} color={scoreColor(p, percent)} label="score" />
        <Text style={{ fontSize: 34, fontWeight: "800", color: p.text, marginTop: 8 }} testID="score">{a.score} / {a.total}</Text>
        {a.passed != null && <Text style={{ fontSize: 22, fontWeight: "800", color: a.passed ? p.ok : p.bad }} testID="verdict">{a.passed ? "PASS" : "FAIL"}</Text>}
        {a.passMark != null && <P muted small>Pass mark {a.passMark}/{a.total} (65%)</P>}
        <P muted small>Elapsed {formatDuration(a.elapsedMs)} · {a.submittedBy === "timer" ? "auto-submitted" : "submitted by you"}</P>
      </Card>
      <Section>By category</Section>
      <Card>
        {Object.entries(cats).map(([c, v]) => (
          <View key={c} style={{ marginBottom: 9 }}>
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={{ color: p.text, fontSize: 14 }}>{categoryShort(Number(c))}</Text>
              <Text style={{ color: scoreColor(p, pct(v.correct, v.total)), fontWeight: "800" }}>{v.correct}/{v.total}</Text>
            </Row>
            <View style={{ height: 4 }} />
            <Bar value={v.total ? v.correct / v.total : 0} color={scoreColor(p, pct(v.correct, v.total))} />
          </View>
        ))}
      </Card>
      <View style={{ height: 8 }} />
      <Button kind="primary" title={`Review answers (${wrong} wrong or unanswered)`} onPress={() => nav.popTo("Tabs", { screen: "Review", params: { attemptId: a.attemptId } })} testID="review-answers" />
      <View style={{ height: 8 }} />
      <Button title="Home" onPress={() => nav.popTo("Tabs", { screen: "Home" })} testID="results-home" />
    </Screen>
  );
}
