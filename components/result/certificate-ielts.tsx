import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

export type IeltsCertificateData = {
  participantName: string;
  registrationId: string;
  testDate: string | Date;

  countryOfOrigin: string;
  nationality: string;
  firstLanguage: string;

  listeningScore: number;
  readingScore: number;
  writingScore: number;
  speakingScore: number;

  overallBand: number;
  cefrLevel: string;
  generalComment: string;

  // optional
  orgs?: { name?: string | null } | null;

  // ✅ REQUIRED (partner logo)
  orgLogo: string;
};

const ATLazLogo =
  "https://atlaz-content.s3.ap-southeast-1.amazonaws.com/ielts/logo+(1)+(1).png";

const StampUrl =
  "https://atlaz-content.s3.ap-southeast-1.amazonaws.com/ielts/Stamp-Mr-Kevin.png";

const pdfStyles = StyleSheet.create({
  page: {
    backgroundColor: "#eff5fb",
    paddingHorizontal: 20,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#333",
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    position: "relative",
    paddingTop: 15,
  },
  logoContainer: {
    position: "absolute",
    left: 5,
    top: 5,
    flexDirection: "row",
    alignItems: "center",
  },
  logoImage: {
    width: 60,
    height: "auto",
    objectFit: "contain",
  },
  logoSeparator: {
    width: 1,
    height: 35,
    backgroundColor: "#9CA3AF",
    marginHorizontal: 10,
  },
  headerTextContainer: {
    textAlign: "center",
    alignItems: "center",
    flexDirection: "column",
    width: "100%",
    paddingHorizontal: 70,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4981B2",
    textTransform: "uppercase",
    textAlign: "center",
  },
  subTitle: {
    fontSize: 8,
    color: "#6D7F90",
    textTransform: "uppercase",
    fontWeight: "bold",
    marginTop: 2,
    maxWidth: 310,
    textAlign: "center",
    alignSelf: "center",
  },
  collabTitle: {
    fontSize: 8,
    color: "#6D7F90",
    textTransform: "uppercase",
    fontWeight: "bold",
    maxWidth: 260,
    textAlign: "center",
    alignSelf: "center",
    marginTop: 2,
  },
  grid: { flexDirection: "row", marginBottom: 20 },
  infoBox: {
    flex: 1,
    border: "1pt solid #e5e7eb",
    backgroundColor: "#ffffff",
    borderRadius: 6,
    padding: 12,
    margin: 4,
  },
  infoItem: {
    paddingBottom: 8,
    borderBottom: "1pt solid #e5e7eb",
    marginBottom: 8,
  },
  lastInfoItem: { borderBottom: 0, paddingBottom: 0, marginBottom: 0 },
  label: {
    fontSize: 7,
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 2,
    fontWeight: "bold",
  },
  value: { fontSize: 10, color: "#1f2937" },
  resultsSection: { marginBottom: 20 },
  resultsTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4981B2",
    textTransform: "uppercase",
  },
  resultsSubTitle: {
    fontSize: 7,
    color: "#6D7F90",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  scoresContainer: { flexDirection: "row" },
  individualScoresBox: {
    flex: 2,
    backgroundColor: "#ffffff",
    border: "1pt solid #e5e7eb",
    borderRadius: 6,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  scoreItem: { alignItems: "center" },
  scoreLabel: {
    fontSize: 8,
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 4,
    fontWeight: "bold",
  },
  scoreValue: { fontSize: 48, fontWeight: "bold", color: "#4981B2" },
  scoreBand: { fontSize: 7, color: "#6b7280", textTransform: "uppercase" },
  overallScoresBox: {
    flex: 1,
    backgroundColor: "#4CA1E2",
    color: "white",
    borderRadius: 6,
    marginLeft: 10,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    padding: 16,
  },
  overallItem: { alignItems: "center", flex: 1 },
  overallLabel: {
    fontSize: 8,
    textTransform: "uppercase",
    marginBottom: 4,
    color: "white",
  },
  overallValue: { fontSize: 48, fontWeight: "bold", color: "white" },
  footer: { flexDirection: "row" },
  commentBox: {
    flex: 2,
    border: "1pt solid #e5e7eb",
    backgroundColor: "#ffffff",
    borderRadius: 6,
    padding: 16,
    marginRight: 10,
  },
  commentTitle: {
    fontSize: 7,
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 8,
    textAlign: "center",
    fontWeight: "bold",
  },
  commentText: { fontSize: 9, color: "#374151", lineHeight: 1.5 },
  signatureBox: {
    flex: 1,
    border: "1pt solid #e5e7eb",
    backgroundColor: "#ffffff",
    borderRadius: 6,
    padding: 16,
    alignItems: "center",
    justifyContent: "space-between",
  },
  stamp: { width: 220, height: 120 },
});

const asNumber = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const formatDateEn = (d: string | Date) => {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const CertificatePDF = ({
  data,
}: {
  data: IeltsCertificateData;
}) => {
  // ✅ hard requirement
  if (!data?.orgLogo) {
    throw new Error("Partner logo (orgLogo) is required for IELTS certificate.");
  }

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          {/* ✅ always show Atlaz + Org logo */}
          <View style={pdfStyles.logoContainer}>
            <Image style={pdfStyles.logoImage} src={ATLazLogo} />
            <View style={pdfStyles.logoSeparator} />
            <Image style={pdfStyles.logoImage} src={data.orgLogo} />
          </View>

          <View style={pdfStyles.headerTextContainer}>
            <Text style={pdfStyles.mainTitle}>
              IELTS PREDICTION TEST CERTIFICATE
            </Text>
            <Text style={pdfStyles.subTitle}>
              THIS IS TO CERTIFY THAT THE PARTICIPANT HAS SUCCESSFULLY COMPLETED
              IELTS PREDICTION TEST BY ATLAZ TEST CENTER
            </Text>

            {!!data?.orgs?.name && (
              <Text style={pdfStyles.collabTitle}>
                conducted by {data.orgs.name}
              </Text>
            )}
          </View>
        </View>

        <View style={pdfStyles.grid}>
          <View style={pdfStyles.infoBox}>
            <View style={pdfStyles.infoItem}>
              <Text style={pdfStyles.label}>NAME OF PARTICIPANT</Text>
              <Text style={pdfStyles.value}>{data.participantName || "-"}</Text>
            </View>
            <View style={pdfStyles.infoItem}>
              <Text style={pdfStyles.label}>REGISTRATION ID</Text>
              <Text style={pdfStyles.value}>{data.registrationId || "-"}</Text>
            </View>
            <View style={[pdfStyles.infoItem, pdfStyles.lastInfoItem]}>
              <Text style={pdfStyles.label}>TEST DATE</Text>
              <Text style={pdfStyles.value}>
                {data.testDate ? formatDateEn(data.testDate) : "-"}
              </Text>
            </View>
          </View>

          <View style={pdfStyles.infoBox}>
            <View style={pdfStyles.infoItem}>
              <Text style={pdfStyles.label}>COUNTRY OF ORIGIN</Text>
              <Text style={pdfStyles.value}>{data.countryOfOrigin || "-"}</Text>
            </View>
            <View style={pdfStyles.infoItem}>
              <Text style={pdfStyles.label}>NATIONALITY</Text>
              <Text style={pdfStyles.value}>{data.nationality || "-"}</Text>
            </View>
            <View style={[pdfStyles.infoItem, pdfStyles.lastInfoItem]}>
              <Text style={pdfStyles.label}>FIRST LANGUAGE</Text>
              <Text style={pdfStyles.value}>{data.firstLanguage || "-"}</Text>
            </View>
          </View>
        </View>

        <View style={pdfStyles.resultsSection}>
          <Text style={pdfStyles.resultsTitle}>IELTS PREDICTION TEST</Text>
          <Text style={pdfStyles.resultsSubTitle}>RESULTS</Text>

          <View style={pdfStyles.scoresContainer}>
            <View style={pdfStyles.individualScoresBox}>
              <View style={pdfStyles.scoreItem}>
                <Text style={pdfStyles.scoreLabel}>LISTENING</Text>
                <Text style={pdfStyles.scoreValue}>
                  {asNumber(data.listeningScore).toFixed(1)}
                </Text>
                <Text style={pdfStyles.scoreBand}>BAND</Text>
              </View>

              <View style={pdfStyles.scoreItem}>
                <Text style={pdfStyles.scoreLabel}>READING</Text>
                <Text style={pdfStyles.scoreValue}>
                  {asNumber(data.readingScore).toFixed(1)}
                </Text>
                <Text style={pdfStyles.scoreBand}>BAND</Text>
              </View>

              <View style={pdfStyles.scoreItem}>
                <Text style={pdfStyles.scoreLabel}>WRITING</Text>
                <Text style={pdfStyles.scoreValue}>
                  {asNumber(data.writingScore).toFixed(1)}
                </Text>
                <Text style={pdfStyles.scoreBand}>BAND</Text>
              </View>

              <View style={pdfStyles.scoreItem}>
                <Text style={pdfStyles.scoreLabel}>SPEAKING</Text>
                <Text style={pdfStyles.scoreValue}>
                  {asNumber(data.speakingScore).toFixed(1)}
                </Text>
                <Text style={pdfStyles.scoreBand}>BAND</Text>
              </View>
            </View>

            <View style={pdfStyles.overallScoresBox}>
              <View style={pdfStyles.overallItem}>
                <Text style={pdfStyles.overallLabel}>OVERALL BAND</Text>
                <Text style={pdfStyles.overallValue}>
                  {asNumber(data.overallBand).toFixed(1)}
                </Text>
              </View>
              <View style={pdfStyles.overallItem}>
                <Text style={pdfStyles.overallLabel}>CEFR LEVEL</Text>
                <Text style={pdfStyles.overallValue}>
                  {(data.cefrLevel || "-") as any}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={pdfStyles.footer}>
          <View style={pdfStyles.commentBox}>
            <Text style={pdfStyles.commentTitle}>GENERAL COMMENT</Text>
            <Text style={pdfStyles.commentText}>
              {data.generalComment || "-"}
            </Text>
          </View>

          <View style={pdfStyles.signatureBox}>
            <Image
              style={pdfStyles.stamp}
              src={{
                uri: StampUrl,
                method: "GET",
                headers: { "Cache-Control": "no-cache" },
              }}
            />
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default CertificatePDF;
