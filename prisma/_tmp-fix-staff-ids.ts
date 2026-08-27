import { prisma } from "./lib/prisma";
import { nextStaffId } from "./lib/ids";

async function main() {
  const teachers = await prisma.teacher.findMany({ include: { user: true } });
  const bad = teachers.filter((t) => t.staffId.split("/").filter(Boolean).length !== 3);

  if (bad.length === 0) {
    console.log("No malformed staff IDs found.");
    return;
  }

  console.log(`Found ${bad.length} teacher(s) with a malformed Staff ID:`);
  for (const t of bad) {
    console.log(`  ${t.user.name}: ${t.staffId}`);
  }

  const changes: { name: string; oldId: string; newId: string }[] = [];
  for (const t of bad) {
    const newId = await prisma.$transaction(async (tx) => {
      return nextStaffId("2026", tx);
    });
    await prisma.teacher.update({ where: { id: t.id }, data: { staffId: newId } });
    changes.push({ name: t.user.name, oldId: t.staffId, newId });
  }

  console.log("\n--- Fixed ---");
  for (const c of changes) {
    console.log(`${c.name}: ${c.oldId}  ->  ${c.newId}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
