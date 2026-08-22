import "dotenv/config";
import prisma from "../src/lib/db.js";

async function backfill() {
  const users = await prisma.user.findMany({ select: { id: true } });

  for (const user of users) {
    const count = await prisma.learningArtifact.count({
      where: { type: "PODCAST", workspace: { userId: user.id } },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { totalPodcastsCreated: count },
    });

    console.log(`User ${user.id}: set totalPodcastsCreated = ${count}`);
  }

  console.log("Backfill complete!");
  await prisma.$disconnect();
}

backfill().catch((e) => {
  console.error(e);
  process.exit(1);
});
