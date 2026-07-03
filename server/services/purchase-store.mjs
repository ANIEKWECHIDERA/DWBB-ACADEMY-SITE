import fs from "node:fs/promises";
import path from "node:path";

export function createPurchaseStore({
  configuredDataDir,
  fallbackDataDir,
  downloadLinkTtlDays,
  enablePaymentDebug,
  getFirebaseAdminFirestore,
  logger,
  purchaseCollectionName,
}) {
  let dataDir = configuredDataDir;
  let purchasesFile = path.join(dataDir, "purchases.json");
  let attemptsFile = path.join(dataDir, "payment-attempts.json");
  let webhookEventsFile = path.join(dataDir, "webhook-events.json");
  const pendingJsonWrites = new Map();
  let warnedAboutFallbackDataDir = false;

  function createDownloadExpiry() {
    const ttlMs = Math.max(downloadLinkTtlDays, 1) * 24 * 60 * 60 * 1000;
    return new Date(Date.now() + ttlMs);
  }

  function getPurchaseExpiry(purchase) {
    if (purchase.expiresAt) {
      return new Date(purchase.expiresAt);
    }

    if (!purchase.paidAt) {
      return null;
    }

    const paidAt = new Date(purchase.paidAt);
    return new Date(
      paidAt.getTime() + Math.max(downloadLinkTtlDays, 1) * 24 * 60 * 60 * 1000,
    );
  }

  async function recordPaymentAttempt(attempt) {
    if (!enablePaymentDebug) {
      return;
    }

    const attempts = await readJsonFile(attemptsFile);
    attempts.push(attempt);
    await writeJsonFile(attemptsFile, attempts);
  }

  async function findPaymentAttempt(reference) {
    if (!enablePaymentDebug || !reference) {
      return null;
    }

    const attempts = await readJsonFile(attemptsFile);
    return attempts.find((attempt) => attempt.reference === reference) || null;
  }

  async function listPaymentAttempts() {
    if (!enablePaymentDebug) {
      return [];
    }

    return readJsonFile(attemptsFile);
  }

  async function recordWebhookEvent(payload) {
    if (!enablePaymentDebug) {
      return;
    }

    const events = await readJsonFile(webhookEventsFile);
    events.push({
      event: payload?.event || "unknown",
      reference: payload?.data?.reference || null,
      receivedAt: new Date().toISOString(),
      payload,
    });
    await writeJsonFile(webhookEventsFile, events);
  }

  async function listWebhookEvents() {
    if (!enablePaymentDebug) {
      return [];
    }

    return readJsonFile(webhookEventsFile);
  }

  function getPurchaseCollection() {
    const firestore = getFirebaseAdminFirestore();
    return firestore ? firestore.collection(purchaseCollectionName) : null;
  }

  async function findPurchaseByReference(reference) {
    if (!reference) {
      return null;
    }

    const purchaseCollection = getPurchaseCollection();

    if (purchaseCollection) {
      const doc = await purchaseCollection.doc(reference).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    }

    const purchases = await readJsonFile(purchasesFile);
    return purchases.find((entry) => entry.reference === reference) || null;
  }

  async function findPurchaseByDownloadToken(downloadToken) {
    if (!downloadToken) {
      return null;
    }

    const purchaseCollection = getPurchaseCollection();

    if (purchaseCollection) {
      const snapshot = await purchaseCollection
        .where("downloadToken", "==", downloadToken)
        .limit(1)
        .get();
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }

      return null;
    }

    const purchases = await readJsonFile(purchasesFile);
    return (
      purchases.find((entry) => entry.downloadToken === downloadToken) || null
    );
  }

  async function createPurchaseRecord(purchase) {
    const purchaseCollection = getPurchaseCollection();

    if (purchaseCollection) {
      await purchaseCollection.doc(purchase.reference).set(purchase, {
        merge: false,
      });
      return;
    }

    const purchases = await readJsonFile(purchasesFile);
    purchases.push(purchase);
    await writeJsonFile(purchasesFile, purchases);
  }

  async function updatePurchaseRecord(reference, updates) {
    const purchaseCollection = getPurchaseCollection();

    if (purchaseCollection) {
      await purchaseCollection.doc(reference).set(
        {
          ...updates,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      return;
    }

    const purchases = await readJsonFile(purchasesFile);
    const purchaseIndex = purchases.findIndex(
      (entry) => entry.reference === reference,
    );

    if (purchaseIndex < 0) {
      return;
    }

    purchases[purchaseIndex] = {
      ...purchases[purchaseIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await writeJsonFile(purchasesFile, purchases);
  }

  async function ensureDataFile() {
    try {
      await ensureDataDirectory(configuredDataDir);
    } catch (error) {
      if (configuredDataDir !== fallbackDataDir) {
        if (!warnedAboutFallbackDataDir) {
          logger.error("storage.data_dir_fallback", {
            configuredDataDir,
            fallbackDataDir,
            message: error?.message || String(error),
          });
          warnedAboutFallbackDataDir = true;
        }

        await ensureDataDirectory(fallbackDataDir);
        return;
      }

      throw error;
    }
  }

  async function ensureDataDirectory(targetDir) {
    await fs.mkdir(targetDir, { recursive: true });

    if (dataDir !== targetDir) {
      dataDir = targetDir;
      purchasesFile = path.join(dataDir, "purchases.json");
      attemptsFile = path.join(dataDir, "payment-attempts.json");
      webhookEventsFile = path.join(dataDir, "webhook-events.json");
    }

    await Promise.all([
      ensureJsonArrayFile(purchasesFile),
      ensureJsonArrayFile(attemptsFile),
      ensureJsonArrayFile(webhookEventsFile),
    ]);
  }

  async function ensureJsonArrayFile(filePath) {
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, "[]", "utf8");
    }
  }

  async function readJsonFile(filePath) {
    await ensureDataFile();
    await waitForPendingJsonWrite(filePath);
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content);
  }

  async function writeJsonFile(filePath, value) {
    await ensureDataFile();
    const previousWrite = pendingJsonWrites.get(filePath) || Promise.resolve();
    const nextWrite = previousWrite
      .catch(() => {})
      .then(async () => {
        const tempFilePath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
        await fs.writeFile(
          tempFilePath,
          JSON.stringify(value, null, 2),
          "utf8",
        );
        await fs.rename(tempFilePath, filePath);
      });

    pendingJsonWrites.set(filePath, nextWrite);

    try {
      await nextWrite;
    } finally {
      if (pendingJsonWrites.get(filePath) === nextWrite) {
        pendingJsonWrites.delete(filePath);
      }
    }
  }

  async function waitForPendingJsonWrite(filePath) {
    const pendingWrite = pendingJsonWrites.get(filePath);
    if (!pendingWrite) {
      return;
    }

    await pendingWrite.catch(() => {});
  }

  return {
    createDownloadExpiry,
    createPurchaseRecord,
    findPaymentAttempt,
    listPaymentAttempts,
    listWebhookEvents,
    findPurchaseByDownloadToken,
    findPurchaseByReference,
    getPurchaseExpiry,
    recordPaymentAttempt,
    recordWebhookEvent,
    updatePurchaseRecord,
  };
}
