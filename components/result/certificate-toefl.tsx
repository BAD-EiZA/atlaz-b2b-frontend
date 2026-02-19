import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

/* =============== TYPES =============== */
type Skill = {
  title: string;
  cefrLevel: string;
  scaledScore: number;
  comment: string;
};

type Props = {
  studentName: string;
  registrationId: string;
  testDate: string;

  totalScore: number;
  totalComment: string;

  listening: Skill;
  structure: Skill;
  reading: Skill;

  // ✅ REQUIRED partner logo
  orgLogo: string;

  // optional
  orgs?: { name?: string | null } | null;
};

/* =============== CONST URLS =============== */
const ATLazLogo =
  "https://atlaz-content.s3.ap-southeast-1.amazonaws.com/ielts/logo+(1)+(1).png";

// ⚠️ GANTI ini dengan URL stamp TOEFL kamu (wajib URL publik)
const TOEFL_STAMP_URL = "https://YOUR_PUBLIC_URL/toefl/certificate/stamp.png";

/* =============== THEME =============== */
const C = {
  bg: "#F2F6FB",
  card: "#FFFFFF",
  border: "#E6ECF4",
  text: "#24324A",
  sub: "#7A8CA8",
  blue: "#4A90E2",
  blueSoft: "#EBF5FF",
  pillBorder: "#B7D2F6",
  axis: "#8EA4C3",
  barBg: "#E7EDF6",
  barFill: "#4A90E2",
};

const PX = {
  pageW: 595.28,
  gutter: 18,
  colGap: 12,
  half: (595.28 - 18 * 2 - 12) / 2,
};

/* =============== STYLES =============== */
const s = StyleSheet.create({
  page: { backgroundColor: C.bg, padding: PX.gutter, fontFamily: "Helvetica" },

  header: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  logo: { width: 72, height: 42 },
  titleWrap: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 12, color: "#2B69C5", fontWeight: 700 },

  row: { flexDirection: "row", marginBottom: 10 },
  left: { width: PX.half },
  right: { width: PX.half, marginLeft: PX.colGap },

  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
  },

  kv: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },
  kvLast: { borderBottomWidth: 0 },
  kvKey: {
    fontSize: 8,
    color: C.sub,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  kvVal: { fontSize: 9, color: C.text, fontWeight: 700 },

  totalHeader: {
    backgroundColor: C.blue,
    color: "#fff",
    textAlign: "center",
    borderRadius: 10,
    paddingVertical: 6,
    fontSize: 8,
    fontWeight: 700,
    marginBottom: 10,
  },
  bigBarBg: {
    height: 28,
    backgroundColor: C.barBg,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  bigBarFill: { height: "100%", backgroundColor: C.barFill },
  bigAxis: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  axisText: { fontSize: 7, color: C.axis },
  bubble: {
    position: "absolute",
    top: -12,
    backgroundColor: "#3B86DF",
    color: "#fff",
    fontSize: 10,
    fontWeight: 700,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  totalText: {
    marginTop: 8,
    fontSize: 7.5,
    lineHeight: 1.45,
    color: "#5C6D86",
  },

  sectionContainer: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    marginTop: 8,
    gap: 40,
  },
  sectionTitle: {
    fontSize: 9.2,
    color: C.text,
    fontWeight: 700,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  hr: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 6,
    borderRadius: 999,
  },
  secRow: { flexDirection: "row" },
  secLeft: {
    width: 260,
    paddingRight: 10,
    alignItems: "center",
    gap: 20,
    flex: 1,
  },
  secRight: { flex: 2 },

  pill: {
    alignSelf: "center",
    backgroundColor: C.blueSoft,
    borderColor: C.pillBorder,
    borderWidth: 1,
    color: "#2F76CF",
    fontSize: 8,
    fontWeight: 700,
    borderRadius: 999,
    paddingHorizontal: 50,
    paddingVertical: 3,
    marginBottom: 6,
  },

  gaugeBg: {
    height: 26,
    backgroundColor: "#E4EAF3",
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  gaugeFill: { height: "100%", backgroundColor: C.blue },
  gaugeAxis: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  chip: {
    position: "absolute",
    top: -10,
    backgroundColor: C.blueSoft,
    borderColor: C.pillBorder,
    borderWidth: 1,
    color: "#2F76CF",
    fontSize: 8,
    fontWeight: 700,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  comment: { fontSize: 8, color: "#5C6D86", lineHeight: 1.55 },

  footer: { marginTop: 16, alignItems: "flex-end" },
  stamp: { width: 170, height: 86, marginBottom: 4 },
});

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);
const pct = (v: number, min: number, max: number) =>
  ((clamp(v, min, max) - min) / (max - min)) * 100;

const asNumber = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const Gauge = ({
  score,
  width,
  min = 20,
  max = 68,
}: {
  score: number;
  width: number;
  min?: number;
  max?: number;
}) => {
  const w = (pct(score, min, max) / 100) * width;
  const chipLeft = Math.max(8, Math.min(width - 34, w - 17));

  return (
    <View>
      <View style={{ width, position: "relative" }}>
        <View style={[s.gaugeBg, { width }]}>
          <View style={[s.gaugeFill, { width: w }]} />
        </View>
        <View style={[s.chip, { top: -20, left: chipLeft }]}>
          <Text>{Math.round(score)}</Text>
        </View>
      </View>
      <View style={s.gaugeAxis}>
        <Text style={s.axisText}>{min}</Text>
        <Text style={s.axisText}>{max}</Text>
      </View>
    </View>
  );
};

const Section = ({
  skill,
  min,
  max,
}: {
  skill: Skill;
  min: number;
  max: number;
}) => (
  <View>
    <Text style={s.sectionTitle}>{skill.title}</Text>
    <View style={s.hr} />
    <View style={s.secRow}>
      <View style={s.secLeft}>
        <Text style={s.pill}>CEFR LEVEL: {skill.cefrLevel}</Text>
        <Gauge score={asNumber(skill.scaledScore)} min={min} max={max} width={170} />
      </View>
      <View style={s.secRight}>
        <Text style={s.comment}>{skill.comment}</Text>
      </View>
    </View>
  </View>
);

const ToeflCertificatePDF: React.FC<Props> = ({
  studentName,
  registrationId,
  testDate,
  totalScore,
  totalComment,
  listening,
  structure,
  reading,
  orgLogo,
}) => {
  // ✅ hard requirement
  if (!orgLogo) {
    throw new Error("Partner logo (orgLogo) is required for TOEFL certificate.");
  }

  const totalMin = 216;
  const totalMax = 677;
  const totalWidth = PX.half - 24;

  const totalW = (pct(asNumber(totalScore), totalMin, totalMax) / 100) * totalWidth;
  const totalChipLeft = Math.max(8, Math.min(totalWidth - 34, totalW - 17));

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ✅ Header: Atlaz + Partner logo */}
        <View style={s.header}>
          <View style={{ flexDirection: "row", alignItems: "center", width: 190 }}>
            <Image style={s.logo} source={ATLazLogo} />
            <View
              style={{
                width: 1,
                height: 35,
                backgroundColor: "#9CA3AF",
                marginHorizontal: 10,
              }}
            />
            <Image style={{ width: 72, height: 42 }} source={orgLogo} />
          </View>

          <View style={s.titleWrap}>
            <Text style={s.title}>TOEFL PREDICTION TEST CERTIFICATE</Text>
          </View>

          <View style={{ width: 190 }} />
        </View>

        <View style={s.row}>
          <View style={[s.card, s.left]}>
            <View style={s.kv}>
              <Text style={s.kvKey}>Student Name</Text>
              <Text style={s.kvVal}>{studentName}</Text>
            </View>
            <View style={s.kv}>
              <Text style={s.kvKey}>Registration ID</Text>
              <Text style={s.kvVal}>{registrationId}</Text>
            </View>
            <View style={[s.kv, s.kvLast]}>
              <Text style={s.kvKey}>Test Date</Text>
              <Text style={s.kvVal}>{testDate}</Text>
            </View>
          </View>

          <View style={[s.card, s.right]}>
            <Text style={s.totalHeader}>YOUR TOTAL SCORE</Text>
            <View style={{ position: "relative", width: totalWidth, paddingTop: 16 }}>
              <View style={[s.bigBarBg, { width: totalWidth }]}>
                <View style={[s.bigBarFill, { width: totalW }]} />
              </View>
              <View style={[s.bubble, { top: -4, left: totalChipLeft }]}>
                <Text>{Math.round(asNumber(totalScore))}</Text>
              </View>
            </View>

            <View style={s.bigAxis}>
              <Text style={s.axisText}>{totalMin}</Text>
              <Text style={s.axisText}>{totalMax}</Text>
            </View>

            <Text style={s.totalText}>{totalComment}</Text>
          </View>
        </View>

        <View style={s.sectionContainer}>
          <Section skill={listening} min={24} max={68} />
          <Section skill={structure} min={20} max={68} />
          <Section skill={reading} min={21} max={67} />

          <View style={s.footer}>
            <Image style={s.stamp} source={TOEFL_STAMP_URL} />
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default ToeflCertificatePDF;
