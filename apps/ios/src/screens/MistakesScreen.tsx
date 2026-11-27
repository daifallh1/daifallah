import { useMemo } from "react";
import { Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MISTAKES_SECONDS_PER_QUESTION, mistakeQueue, passMarkFor } from "@itil5/core";
import { categoryShort, lb } from "../data";
import { useStore } from "../store";
import { usePalette } from "../theme";
import { TrText } from "../components/TrText";
import { Button, Card, Divider, P, Row, Screen, Section } from "../components/Ui";
import type { RootParams } from "../nav";

export function MistakesScreen() {
  const { attempts, marks, startExam } = useStore();
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const p = usePalette();
  const q = useMemo(() => mistakeQueue(lb, attempts, marks), [attempts, marks]);
  const n = q.toFix.length;
  const active = n - q.oneCorrect.length;
  const byCat = useMemo(() => {
    const m = new Map<number, number>();
    for (const e of q.toFix) m.set(e.category ?? 0, (m.get(e.category ?? 0) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [q]);
  const go = async () => { if (await startExam({ kind: "mistakes" })) nav.navigate("Exam"); };
  const total = n + q.mastered.length || 1;
  return (
    <Screen testID="mistakes" safeTop>
      <Text accessibilityRole="header" style={{ color: p.text, fontSize: 28, fontWeight: "800" }}>My mistakes</Text>
      <Card>
        <Row style={{ justifyContent: "space-around" }}>
          {[[active, "To fix", p.bad], [q.oneCorrect.length, "1 of 2 correct", p.warn], [q.mastered.length, "Mastered", p.ok]].map(([v, l, c]) => (
            <View key={String(l)} style={{ alignItems: "center" }}>
              <Text style={{ color: c as string, fontSize: 30, fontWeight: "800" }} testID={`mistakes-${String(l).split(" ")[0]!.toLowerCase()}`}>{String(v)}</Text>
              <Text style={{ color: p.muted, fontSize: 12 }}>{String(l)}</Text>
            </View>
          ))}
        </Row>
        <View style={{ flexDirection: "row", height: 10, borderRadius: 9, overflow: "hidden", marginTop: 14, backgroundColor: p.track }}>
          <View style={{ flex: active / total, backgroundColor: p.bad }} />
          <View style={{ flex: q.oneCorrect.length / total, backgroundColor: p.warn }} />
          <View style={{ flex: q.mastered.length / total, backgroundColor: p.ok }} />
        </View>
        <Text style={{ color: p.muted, fontSize: 12.5, marginTop: 10, lineHeight: 18 }}>
          Every question you answered wrong in any exam. A question leaves the list after 2 correct answers in a row; questions you mark “Mastered” are excluded.
        </Text>
      </Card>
      <Button kind="primary" title="Start mistakes exam" onPress={() => void go()} disabled={n === 0}
        subtitle={n ? `All ${n} question${n === 1 ? "" : "s"} · ${Math.ceil((n * MISTAKES_SECONDS_PER_QUESTION) / 60)} min (90 s each) · pass ${passMarkFor(n)}/${n} (65%)` : q.mastered.length ? "All your mistakes are fixed 🎉" : "No mistakes yet: finish an exam first"}
        style={{ marginTop: 8 }} testID="start-mistakes" />
      {byCat.length > 0 && (
        <>
          <Section>By category</Section>
          <Card>
            {byCat.map(([c, v]) => (
              <Row key={c} style={{ justifyContent: "space-between", paddingVertical: 4 }}>
                <Text style={{ color: p.text, fontSize: 14 }}>{categoryShort(c || null)}</Text>
                <Text style={{ color: p.text, fontWeight: "800" }}>{v}</Text>
              </Row>
            ))}
          </Card>
        </>
      )}
      {n > 0 && <Section>Questions ({n})</Section>}
      {n > 0 && (
        <Card style={{ paddingVertical: 4 }}>
          {q.toFix.slice(0, 60).map((e, i) => {
            const qq = lb.byId.get(e.questionId)!;
            return (
              <View key={e.questionId}>
                {i > 0 && <Divider />}
                <Row style={{ paddingVertical: 10, alignItems: "flex-start" }}>
                  <View style={{ flex: 1 }}><TrText k={qq.i18n.question} style={{ fontSize: 14.5, lineHeight: 20 }}>{qq.englishQuestion}</TrText></View>
                  <Text style={{ color: e.streak ? p.warn : p.muted, letterSpacing: 2 }} accessibilityLabel={`${e.streak} of 2 correct, wrong ${e.timesWrong} times`}>{e.streak ? "●○" : "○○"}</Text>
                </Row>
              </View>
            );
          })}
          {n > 60 && <P small muted>…and {n - 60} more</P>}
        </Card>
      )}
    </Screen>
  );
}
