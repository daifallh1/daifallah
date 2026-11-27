import { Text, View } from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";
import { usePalette } from "../theme";

/** Progress ring with a centred percentage. */
export function Ring({ value, size = 104, stroke = 10, color, label, testID }: {
  value: number | null; size?: number; stroke?: number; color?: string; label: string; testID?: string;
}) {
  const p = usePalette();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = value == null ? 0 : Math.max(0, Math.min(1, value));
  return (
    <View style={{ width: size, height: size }} accessibilityLabel={`${label} ${value == null ? "no data" : `${Math.round(v * 100)} percent`}`} testID={testID}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={p.track} strokeWidth={stroke} fill="none" />
        {value != null && (
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={color ?? p.accent} strokeWidth={stroke} fill="none" strokeLinecap="round"
            strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - v)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        )}
      </Svg>
      <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }} pointerEvents="none">
        <Text style={{ color: p.text, fontSize: size / 4.3, fontWeight: "800" }}>{value == null ? "—" : `${Math.round(v * 100)}%`}</Text>
        <Text style={{ color: p.muted, fontSize: 11 }}>{label}</Text>
      </View>
    </View>
  );
}

/** Line chart of exam percentages with the 65% pass line. Points are observed attempts only. */
export function TrendChart({ points, width, height = 150 }: { points: { percent: number; label: string; passed: boolean | null }[]; width: number; height?: number }) {
  const p = usePalette();
  const left = 34, right = 10, top = 12, bottom = 26;
  const w = Math.max(60, width - left - right), h = height - top - bottom;
  const y = (pct: number) => top + h * (1 - pct / 100);
  const n = points.length;
  const x = (i: number) => left + (n <= 1 ? w / 2 : (w * i) / (n - 1));
  const shown = points.length > 12 ? points.slice(-12) : points;
  return (
    <Svg width={width} height={height} accessibilityLabel={`Score trend over ${shown.length} exams`}>
      {[100, 50, 0].map((v) => (
        <SvgText key={v} x={0} y={y(v) + 4} fill={p.muted} fontSize={10} fontFamily="Helvetica">{`${v}%`}</SvgText>
      ))}
      {[100, 50, 0].map((v) => <Line key={`l${v}`} x1={left} x2={left + w} y1={y(v)} y2={y(v)} stroke={p.track} strokeWidth={1} />)}
      <Line x1={left} x2={left + w} y1={y(65)} y2={y(65)} stroke={p.ok} strokeWidth={1.5} strokeDasharray="5 4" />
      <SvgText x={left + 4} y={y(65) - 5} fill={p.ok} fontSize={10} fontFamily="Helvetica">pass 65%</SvgText>
      {shown.length > 1 && <Polyline points={shown.map((pt, i) => `${x(i)},${y(pt.percent)}`).join(" ")} fill="none" stroke={p.accent} strokeWidth={3} />}
      {shown.map((pt, i) => (
        <Circle key={i} cx={x(i)} cy={y(pt.percent)} r={5} fill={pt.passed ? p.ok : p.accent} />
      ))}
      {shown.map((pt, i) => (
        <SvgText key={`t${i}`} x={x(i)} y={y(pt.percent) + (pt.percent > 80 ? 18 : -9)} fill={p.text} fontSize={11} fontFamily="Helvetica" fontWeight="bold" textAnchor="middle">{`${Math.round(pt.percent)}%`}</SvgText>
      ))}
      {shown.length <= 6 && shown.map((pt, i) => (
        <SvgText key={`x${i}`} x={x(i)} y={height - 6} fill={p.muted} fontSize={10} textAnchor="middle">{pt.label}</SvgText>
      ))}
    </Svg>
  );
}
