import assert from "node:assert/strict";
import { MongoClient } from "mongodb";
import { ensureSeeded } from "../src/lib/seed";
import {
  BookingError,
  cancelRegistrationById,
  createRegistration,
  getBatchAvailability,
  getSettingsAndBatches,
} from "../src/lib/booking-engine";
import {
  addDaysToDateStr,
  getNowInTimezone,
  isCutoffPassed,
  validatePublicDate,
} from "../src/lib/timezone";
import type { SeasonSettings } from "../src/lib/types";

const TEST_URI =
  process.env.TEST_MONGODB_URI || "mongodb://127.0.0.1:27017/ayyappa_annadanam_test";

async function main() {
  const client = new MongoClient(TEST_URI);
  await client.connect();
  const db = client.db();

  try {
    await db.dropDatabase();
    await ensureSeeded(db);

    const { settings, batches } = await getSettingsAndBatches(db);
    assert.equal(batches.length, 3, "Should have 3 default batches");
    assert.equal(batches[0].capacity, 30, "Batch capacity should be 30");

    // 1. Timezone & Cutoff tests (Asia/Kolkata)
    // 2026-11-27 08:59 IST => 03:29 UTC
    const beforeCutoff = new Date("2026-11-27T03:29:00Z");
    const atCutoff = new Date("2026-11-27T03:30:00Z");
    assert.equal(
      isCutoffPassed("2026-11-27", "09:00", "Asia/Kolkata", beforeCutoff),
      false,
      "08:59 IST should be before 09:00 cutoff"
    );
    assert.equal(
      isCutoffPassed("2026-11-27", "09:00", "Asia/Kolkata", atCutoff),
      true,
      "09:00 IST should be at/after cutoff"
    );

    const testSettings: SeasonSettings = {
      ...settings,
      startDate: "2026-11-01",
      endDate: "2027-01-31",
    };
    assert.equal(
      validatePublicDate("2026-11-27", testSettings, beforeCutoff).valid,
      true
    );
    assert.equal(
      validatePublicDate("2026-11-27", testSettings, atCutoff).reason,
      "cutoff_passed"
    );
    assert.equal(
      validatePublicDate("2026-11-29", testSettings, atCutoff).valid,
      true,
      "Day after tomorrow should be valid"
    );
    assert.equal(
      validatePublicDate("2026-11-30", testSettings, atCutoff).reason,
      "outside_window",
      "4th day should be outside 3-day rolling window"
    );

    // Use tomorrow IST for live booking tests so it's always before cutoff
    const { dateStr: todayIST } = getNowInTimezone("Asia/Kolkata");
    const tomorrowIST = addDaysToDateStr(todayIST, 1);

    // 2. Individual + Idempotency test
    const ind1 = await createRegistration(db, {
      type: "individual",
      annadanamDate: tomorrowIST,
      batchId: "batch-1",
      members: [{ fullName: "Ramaiah Swami", phone: "9876543210", village: "Guntur", role: "member" }],
      source: "public_qr",
      idempotencyKey: "retry-key-1",
    });
    const ind1Retry = await createRegistration(db, {
      type: "individual",
      annadanamDate: tomorrowIST,
      batchId: "batch-1",
      members: [{ fullName: "Ramaiah Swami", phone: "9876543210", village: "Guntur", role: "member" }],
      source: "public_qr",
      idempotencyKey: "retry-key-1",
    });
    assert.equal(ind1Retry.deduplicated, true, "Retry with same idempotencyKey should deduplicate");
    assert.equal(ind1.registration.code, ind1Retry.registration.code);

    // 3. Same-name without phone should NOT auto-merge profiles
    await createRegistration(db, {
      type: "individual",
      annadanamDate: tomorrowIST,
      batchId: "batch-2",
      members: [{ fullName: "Subba Rao", phone: null, village: "Tenali", role: "member" }],
      source: "public_qr",
    });
    await createRegistration(db, {
      type: "individual",
      annadanamDate: tomorrowIST,
      batchId: "batch-3",
      members: [{ fullName: "Subba Rao", phone: null, village: "Ongole", role: "member" }],
      source: "public_qr",
    });
    const subbaCount = await db
      .collection("swami_profiles")
      .countDocuments({ normalizedName: "subba rao" });
    assert.equal(subbaCount, 2, "Same-name devotees without phone must remain separate profiles");

    // 4. Concurrency race test on batch-1 (currently 1 booked, 29 remaining)
    // Fire 10 simultaneous group bookings of 5 seats each (= 50 requested for 29 seats)
    const concurrentResults = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) =>
        createRegistration(db, {
          type: "group",
          annadanamDate: tomorrowIST,
          batchId: "batch-1",
          leaderName: `Leader ${i}`,
          members: Array.from({ length: 5 }, (_, j) => ({
            fullName: `Swami ${i}-${j}`,
            role: j === 0 ? "leader" : "member",
          })),
          source: "public_qr",
        })
      )
    );

    const succeeded = concurrentResults.filter((r) => r.status === "fulfilled");
    const failed = concurrentResults.filter((r) => r.status === "rejected");
    assert.equal(succeeded.length, 5, "Exactly 5 groups of 5 (25 seats) should fit in 29 remaining seats");
    assert.equal(failed.length, 5, "Remaining 5 groups should be rejected atomically");

    const [b1Avail] = await getBatchAvailability(db, tomorrowIST, [batches[0]]);
    assert.equal(b1Avail.bookedCount, 26, "1 + 25 = 26 seats booked");
    assert.equal(b1Avail.remaining, 4, "4 seats remaining");

    // 5. Group of 5 exceeds 4 remaining seats => rejected atomically
    await assert.rejects(
      () =>
        createRegistration(db, {
          type: "group",
          annadanamDate: tomorrowIST,
          batchId: "batch-1",
          leaderName: "Too Big",
          members: Array.from({ length: 5 }, (_, j) => ({
            fullName: `Extra ${j}`,
            role: "member",
          })),
          source: "public_qr",
        }),
      (err: unknown) => err instanceof BookingError && err.code === "CAPACITY_EXCEEDED"
    );

    // 6. Cancellation releases capacity
    await cancelRegistrationById(db, ind1.registration._id!, { type: "visitor" });
    const [b1AfterCancel] = await getBatchAvailability(db, tomorrowIST, [batches[0]]);
    assert.equal(b1AfterCancel.bookedCount, 25, "Cancellation should release 1 seat");

    console.log("ALL BUSINESS RULE & CONCURRENCY TESTS PASSED!");
  } finally {
    await db.dropDatabase();
    await client.close();
  }
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
