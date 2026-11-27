import { useState } from "react";
import { Alert, Platform, Switch, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { auditJson, lb } from "../data";
import { useStore } from "../store";
import { usePalette } from "../theme";
import { TrText } from "../components/TrText";
import { Card, Divider, ListRow, P, Row, Screen, Section } from "../components/Ui";
import type { RootParams } from "../nav";

const stamp = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function SettingsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { storage, refresh, attempts, marks, bookmarks, settings, setSettings } = useStore();
  const p = usePalette();
  const [busy, setBusy] = useState(false);

  const exportProgress = async () => {
    setBusy(true);
    try {
      const backup = await storage.exportBackup(Date.now());
      const json = JSON.stringify(backup);
      const name = `ITIL5-progress-${stamp(new Date())}.json`;
      if (Platform.OS === "web") {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
        a.download = name;
        a.click();
      } else {
        const uri = `${FileSystem.cacheDirectory}${name}`;
        await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });
        if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing is not available on this device.");
        await Sharing.shareAsync(uri, { mimeType: "application/json", UTI: "public.json", dialogTitle: "Save progress backup" });
      }
    } catch (e) {
      Alert.alert("Export failed", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const importProgress = async () => {
    const pick = await DocumentPicker.getDocumentAsync({ type: ["application/json", "public.json", "*/*"], copyToCacheDirectory: true, multiple: false });
    if (pick.canceled || !pick.assets?.[0]) return;
    const asset = pick.assets[0];
    let text: string;
    try {
      text = Platform.OS === "web" && asset.file ? await asset.file.text() : await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
    } catch (e) {
      Alert.alert("Could not read the file", e instanceof Error ? e.message : String(e));
      return;
    }
    Alert.alert("Replace progress on this iPhone?", `Your current progress (${attempts.length} exams, ${marks.length} study marks) will be replaced by the backup.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Replace", style: "destructive", onPress: async () => {
          try {
            const r = await storage.importBackup(text);
            await refresh();
            Alert.alert("Progress restored", `${r.attempts} exams, ${r.marks} study marks and ${r.bookmarks} saved questions restored.`);
          } catch (e) {
            Alert.alert("Import failed", e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  };

  return (
    <Screen testID="settings">
      <Section>Backup</Section>
      <Card style={{ padding: 0 }}>
        <ListRow title="Export progress" subtitle="Save a backup file to Files / iCloud Drive" onPress={busy ? undefined : () => void exportProgress()} testID="export-progress"
          icon={<Text style={{ fontSize: 18 }}>⬆️</Text>} />
        <Divider />
        <ListRow title="Import progress" subtitle="Restore from a backup file" onPress={() => void importProgress()} testID="import-progress"
          icon={<Text style={{ fontSize: 18 }}>⬇️</Text>} />
      </Card>
      <P small muted style={{ marginHorizontal: 4, marginTop: 4 }}>On this iPhone: {attempts.length} exams, {marks.length} study marks, {bookmarks.size} saved questions. Nothing is uploaded anywhere.</P>
      <Section>Exam</Section>
      <Card style={{ padding: 0 }}>
        <Row style={{ paddingHorizontal: 14, paddingVertical: 10, justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: p.text, fontSize: 16, fontWeight: "600" }}>Timer warnings</Text>
            <Text style={{ color: p.muted, fontSize: 12.5 }}>Show a notice at 10 and 5 minutes left</Text>
          </View>
          <Switch value={settings.timerWarnings} onValueChange={(v) => void setSettings({ ...settings, timerWarnings: v })} accessibilityLabel="Timer warnings" />
        </Row>
      </Card>
      <Section>About</Section>
      <Card style={{ padding: 0 }}>
        <ListRow title="Question bank" right={`${lb.approved.length} questions`} onPress={() => nav.navigate("About")} testID="open-about" />
        <Divider />
        <ListRow title="Corrected questions (معدّل)" right={String(lb.bank.questions.filter((q) => q.correction).length)} onPress={() => nav.navigate("Corrections")} />
        <Divider />
        <ListRow title="Import audit & sources" onPress={() => nav.navigate("Audit")} />
      </Card>
      <TrText ar="تطبيق تدريبي مستقل، وليس منتجًا رسميًا من PeopleCert أو AXELOS. النص الإنجليزي هو المرجع، والعربية للمساعدة في المذاكرة. اضغط على أي جملة إنجليزية لعرض ترجمتها." style={{ color: p.muted, fontSize: 12.5, lineHeight: 18, marginTop: 14 }}>
        Independent practice app; not an official PeopleCert or AXELOS product. The English text is authoritative; Arabic is a study aid. Tap any English sentence to see its translation.
      </TrText>
    </Screen>
  );
}

export function AboutScreen() {
  const p = usePalette();
  const b = lb.bank;
  const eligible = lb.examEligible.length;
  const distinct = (b.fixedExams ?? []).reduce((n, e) => n + e.questionIds.length, 0);
  const rows: [string, string][] = [
    ["Bank version", b.bankVersion],
    ["Questions you can practise", String(lb.approved.length)],
    ["Exam-eligible / distinct", `${eligible} / ${distinct}`],
    ["Fixed exams", (b.fixedExams ?? []).map((e) => e.questionIds.length).join(" · ")],
    ["From the second source (dump)", String(b.questions.filter((q) => q.sourceKind === "dump").length)],
    ["AI-written explanations", String(b.questions.filter((q) => q.supplementaryExplanation && q.audit.contentStatus === "approved").length)],
    ["ITIL 4 legacy (study only)", String(b.questions.filter((q) => q.audit.legacy).length)],
    ["Hidden identical duplicates", String(b.questions.filter((q) => q.audit.contentStatus === "duplicate").length)],
  ];
  return (
    <Screen>
      <Card style={{ padding: 0 }}>
        {rows.map(([k, v], i) => (
          <View key={k}>{i > 0 && <Divider />}<Row style={{ justifyContent: "space-between", padding: 13 }}><Text style={{ color: p.text, flex: 1 }}>{k}</Text><Text style={{ color: p.muted, fontWeight: "700" }}>{v}</Text></Row></View>
        ))}
      </Card>
      <Section>Sources</Section>
      <Card>
        {(b.sources ?? [{ kind: "pdf", document: b.sourceDocument, sha256: b.sourceDocumentSha256 }]).map((s) => (
          <View key={s.sha256} style={{ marginBottom: 8 }}>
            <Text style={{ color: p.text, fontWeight: "700" }}>{s.document}</Text>
            <Text style={{ color: p.muted, fontSize: 11 }} selectable>SHA-256 {s.sha256}</Text>
          </View>
        ))}
        <Text style={{ color: p.muted, fontSize: 12.5, lineHeight: 18 }}>Syllabus reference v{b.syllabus.version} ({b.syllabus.published}). Random exams follow the blueprint [12, 4, 4, 16, 2, 1, 1] with 16 BL1 / 24 BL2 questions; option order is always as in the source.</Text>
      </Card>
      <P small muted style={{ marginTop: 10 }}>{b.notice}</P>
    </Screen>
  );
}

export function CorrectionsScreen() {
  const p = usePalette();
  const list = lb.bank.questions.filter((q) => q.correction);
  return (
    <Screen>
      <P small muted>Owner-approved corrections, each checked against the ITIL Foundation Version 5 Official Book. The original source text is kept.</P>
      {list.map((q) => (
        <Card key={q.questionId}>
          <Text style={{ color: p.warn, fontWeight: "800", fontSize: 12.5 }}>
            معدّل · {q.sourceKind === "dump" ? "Dump" : "PDF"} #{q.printedQuestionNumber} · Book {q.correction!.bookReference}{q.audit.contentStatus === "duplicate" ? " · now a hidden duplicate" : ""}
          </Text>
          <View style={{ height: 6 }} />
          <TrText k={q.i18n.question} style={{ fontSize: 15, fontWeight: "600" }}>{q.englishQuestion}</TrText>
          <View style={{ height: 6 }} />
          <TrText ar={q.correction!.summaryAr} style={{ fontSize: 13.5, color: p.muted }}>{q.correction!.summary}</TrText>
        </Card>
      ))}
    </Screen>
  );
}

export function AuditScreen() {
  const p = usePalette();
  const a = auditJson as {
    confirmedCounts: Record<string, unknown>; statusCounts: Record<string, number>;
    quarantine: { questionId: string; page: number; printedQuestionNumber: number; status: string; reasons: { code: string }[] }[];
  };
  return (
    <Screen>
      <Card>
        {Object.entries(a.confirmedCounts).filter(([, v]) => typeof v === "number").map(([k, v]) => <P key={k} small>{k}: {String(v)}</P>)}
        {Object.entries(a.statusCounts).map(([k, v]) => <P key={k} small>status {k}: {v}</P>)}
      </Card>
      <Section>Not served ({a.quarantine.length})</Section>
      <Card>
        {a.quarantine.map((x) => (
          <Text key={x.questionId} style={{ color: p.muted, fontSize: 12.5, lineHeight: 18 }}>p{x.page} #{x.printedQuestionNumber} · {x.status === "out_of_scope" ? "ITIL 4 legacy (study only)" : x.status} · {x.reasons.map((r) => r.code).join(", ")}</Text>
        ))}
      </Card>
    </Screen>
  );
}
