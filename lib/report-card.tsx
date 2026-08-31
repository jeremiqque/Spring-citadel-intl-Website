import { readFileSync } from "fs";
import path from "path";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";

/**
 * Phase 3 — the report card PDF.
 *
 * Deliberately generated on demand, never stored: every value below is
 * pulled fresh from TermResult/Grade/PsychomotorRating at request time, so
 * the PDF can never drift from what the portal itself shows (no file to
 * regenerate after a remark edit, no stale copy sitting in a bucket).
 *
 * Layout is a placeholder — Jayy asked to ship this now rather than wait for
 * the school's actual printed report card, on the understanding that the
 * visual layout gets adjusted once that sample exists. Nothing about the
 * DATA this pulls together is placeholder; only the arrangement on the page
 * is expected to change.
 */

const PSYCHOMOTOR_TRAITS: Array<[label: string, key: keyof PsychomotorRow]> = [
  ["Punctuality", "punctuality"],
  ["Neatness", "neatness"],
  ["Honesty", "honesty"],
  ["Leadership", "leadership"],
  ["Cooperation", "cooperation"],
  ["Handwriting", "handwriting"],
  ["Sports", "sports"],
];

type PsychomotorRow = {
  punctuality: number;
  neatness: number;
  honesty: number;
  leadership: number;
  cooperation: number;
  handwriting: number;
  sports: number;
  remark: string | null;
};

const TERM_LABEL: Record<string, string> = {
  TERM_1: "First Term",
  TERM_2: "Second Term",
  TERM_3: "Third Term",
};

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  headerRow: { flexDirection: "row", alignItems: "center", borderBottom: 2, borderBottomColor: "#274ac2", paddingBottom: 10 },
  crest: { width: 44, height: 44, marginRight: 12 },
  schoolName: { fontSize: 15, fontFamily: "Helvetica-Bold", color: "#274ac2" },
  schoolSub: { fontSize: 9, color: "#555", marginTop: 2 },
  docTitle: { marginTop: 14, textAlign: "center", fontSize: 12, fontFamily: "Helvetica-Bold" },
  docSub: { marginTop: 2, textAlign: "center", fontSize: 9.5, color: "#444" },
  bioSection: { marginTop: 16, flexDirection: "row", flexWrap: "wrap" },
  bioItem: { width: "50%", marginBottom: 6 },
  bioLabel: { fontSize: 8, color: "#666", textTransform: "uppercase", letterSpacing: 0.4 },
  bioValue: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 1 },
  sectionTitle: { marginTop: 16, marginBottom: 6, fontSize: 10.5, fontFamily: "Helvetica-Bold", color: "#274ac2" },
  table: { borderWidth: 1, borderColor: "#ccc" },
  tRow: { flexDirection: "row" },
  tHeadRow: { flexDirection: "row", backgroundColor: "#eef1fb" },
  tCell: { flex: 1, padding: 5, borderRightWidth: 1, borderRightColor: "#ccc", borderTopWidth: 1, borderTopColor: "#ccc" },
  tCellFirst: { flex: 2 },
  tHeadCell: { fontFamily: "Helvetica-Bold", fontSize: 8.5 },
  summaryRow: { marginTop: 14, flexDirection: "row", justifyContent: "space-between" },
  summaryBox: { width: "31%", borderWidth: 1, borderColor: "#ccc", borderRadius: 4, padding: 8 },
  summaryLabel: { fontSize: 8, color: "#666", textTransform: "uppercase" },
  summaryValue: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 3 },
  remarkBlock: { marginTop: 10 },
  remarkLabel: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#274ac2" },
  remarkText: { marginTop: 2, fontSize: 9.5 },
  signRow: { marginTop: 28, flexDirection: "row", justifyContent: "space-between" },
  signBox: { width: "40%", borderTopWidth: 1, borderTopColor: "#999", paddingTop: 4, fontSize: 8.5, color: "#555", textAlign: "center" },
  footer: { position: "absolute", bottom: 24, left: 36, right: 36, fontSize: 7.5, color: "#999", textAlign: "center" },
});

function crestSource() {
  try {
    const data = readFileSync(path.join(process.cwd(), "public", "crest.png"));
    return { data, format: "png" as const };
  } catch {
    return null;
  }
}

/**
 * Builds the PDF for one published TermResult, or null if the id doesn't
 * resolve to a PUBLISHED result — the route handler is the one place that
 * decides what to do with "no such report card yet," so this stays a pure
 * data-to-bytes function rather than throwing an HTTP-flavoured error.
 */
export async function generateReportCardPdf(termResultId: string): Promise<Buffer | null> {
  const termResult = await prisma.termResult.findUnique({
    where: { id: termResultId },
    include: {
      student: { include: { user: { select: { name: true } }, class: true } },
      class: true,
    },
  });

  if (!termResult || termResult.status !== "PUBLISHED") return null;

  const [grades, psychomotor] = await Promise.all([
    prisma.grade.findMany({
      where: { studentId: termResult.studentId, term: termResult.term, session: termResult.session },
      include: { subject: true },
      orderBy: { subject: { name: "asc" } },
    }),
    prisma.psychomotorRating.findUnique({
      where: {
        studentId_term_session: {
          studentId: termResult.studentId,
          term: termResult.term,
          session: termResult.session,
        },
      },
    }),
  ]);

  const student = termResult.student;
  const crest = crestSource();
  const termLabel = TERM_LABEL[termResult.term] ?? termResult.term.replace("_", " ");
  const attendanceLine =
    termResult.attendanceTotal != null
      ? `${termResult.attendancePresent ?? 0} of ${termResult.attendanceTotal} school days`
      : "Not yet tracked";

  const bioRows: Array<[string, string]> = [
    ["Admission No.", student.admissionNo],
    ["Class", student.class.name],
    ["Date of birth", student.dob.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })],
    ["Gender", student.gender === "MALE" ? "Male" : "Female"],
  ];
  if (student.nationality) bioRows.push(["Nationality", student.nationality]);

  const doc = (
    <Document
      title={`${student.user.name} — ${termLabel} Report Card`}
      author="Spring Citadel International School"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          {crest && <Image src={crest} style={styles.crest} />}
          <View>
            <Text style={styles.schoolName}>Spring Citadel International School</Text>
            <Text style={styles.schoolSub}>Termly Report Card</Text>
          </View>
        </View>

        <Text style={styles.docTitle}>{student.user.name}</Text>
        <Text style={styles.docSub}>
          {termLabel} · {termResult.session}
        </Text>

        <View style={styles.bioSection}>
          {bioRows.map(([label, value]) => (
            <View key={label} style={styles.bioItem}>
              <Text style={styles.bioLabel}>{label}</Text>
              <Text style={styles.bioValue}>{value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Subject Results</Text>
        <View style={styles.table}>
          <View style={styles.tHeadRow}>
            <Text style={[styles.tCell, styles.tCellFirst, styles.tHeadCell, { borderTopWidth: 0 }]}>Subject</Text>
            <Text style={[styles.tCell, styles.tHeadCell, { borderTopWidth: 0 }]}>Assignment (20)</Text>
            <Text style={[styles.tCell, styles.tHeadCell, { borderTopWidth: 0 }]}>Midterm (30)</Text>
            <Text style={[styles.tCell, styles.tHeadCell, { borderTopWidth: 0 }]}>Exam (50)</Text>
            <Text style={[styles.tCell, styles.tHeadCell, { borderTopWidth: 0, borderRightWidth: 0 }]}>Total / Grade</Text>
          </View>
          {grades.length === 0 ? (
            <View style={styles.tRow}>
              <Text style={[styles.tCell, styles.tCellFirst, { borderRightWidth: 0 }]}>No subject grades on record for this term.</Text>
            </View>
          ) : (
            grades.map((g) => (
              <View key={g.id} style={styles.tRow}>
                <Text style={[styles.tCell, styles.tCellFirst]}>{g.subject.name}</Text>
                <Text style={styles.tCell}>{g.assignment}</Text>
                <Text style={styles.tCell}>{g.midterm}</Text>
                <Text style={styles.tCell}>{g.exam}</Text>
                <Text style={[styles.tCell, { borderRightWidth: 0 }]}>
                  {g.total} ({g.grade})
                </Text>
              </View>
            ))
          )}
        </View>

        {psychomotor && (
          <>
            <Text style={styles.sectionTitle}>Psychomotor / Affective Domain</Text>
            <View style={styles.table}>
              {[PSYCHOMOTOR_TRAITS.slice(0, 4), PSYCHOMOTOR_TRAITS.slice(4)].map((row, i) => (
                <View key={i} style={styles.tRow}>
                  {row.map(([label, key], j) => (
                    <Text
                      key={key}
                      style={[
                        styles.tCell,
                        i === 0 ? { borderTopWidth: 0 } : undefined,
                        j === row.length - 1 ? { borderRightWidth: 0 } : undefined,
                      ]}
                    >
                      {label}: {psychomotor[key]}/5
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          </>
        )}

        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Average</Text>
            <Text style={styles.summaryValue}>{termResult.average.toFixed(1)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Class Position</Text>
            <Text style={styles.summaryValue}>
              {termResult.position ? `${termResult.position} of ${termResult.classSize}` : "Not ranked"}
            </Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Attendance</Text>
            <Text style={[styles.summaryValue, { fontSize: 10 }]}>{attendanceLine}</Text>
          </View>
        </View>

        {(termResult.classTeacherRemark || psychomotor?.remark) && (
          <View style={styles.remarkBlock}>
            <Text style={styles.remarkLabel}>Class Teacher&apos;s Remark</Text>
            <Text style={styles.remarkText}>{termResult.classTeacherRemark || psychomotor?.remark}</Text>
          </View>
        )}
        {termResult.principalRemark && (
          <View style={styles.remarkBlock}>
            <Text style={styles.remarkLabel}>Principal&apos;s Remark</Text>
            <Text style={styles.remarkText}>{termResult.principalRemark}</Text>
          </View>
        )}

        <View style={styles.signRow}>
          <Text style={styles.signBox}>Class Teacher&apos;s Signature</Text>
          <Text style={styles.signBox}>Principal&apos;s Signature</Text>
        </View>

        <Text style={styles.footer}>
          Generated{" "}
          {(termResult.publishedAt ?? new Date()).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}{" "}
          · Spring Citadel International School portal — this report card is produced on demand from the student&apos;s
          published term result and is always current as of the date above.
        </Text>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
