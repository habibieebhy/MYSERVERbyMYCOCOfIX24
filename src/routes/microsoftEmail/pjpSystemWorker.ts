import { randomUUID } from "crypto";
// ✅ Importing the dedicated Payload Builder we just perfected
import { PjpPayloadBuilder } from "./pjpPayloadbuilder";
import { db } from "../../db/db";
import { dailyTasks, users, dealers } from "../../db/schema";
import { EmailSystem } from "../../services/emailSystem";

enum WorkerState {
    IDLE = "IDLE",
    RUNNING = "RUNNING",
    SLEEPING = "SLEEPING",
    STOPPED = "STOPPED",
}

interface FuzzyUser {
    id: number;
    strictName: string;
    tokens: string[];
}

export class PjpTaskWorker {
    private excelBuilder = new PjpPayloadBuilder();
    private emailSystem = new EmailSystem();
    private processedFolderId = process.env.PROCESSED_FOLDER_ID!;

    private state: WorkerState = WorkerState.IDLE;
    private shouldStop = false;
    private sleepTimer: NodeJS.Timeout | null = null;

    // Caches
    private dealerMapCache: Map<string, string> | null = null;
    private userMapCache: Map<string, number> | null = null;
    private userFuzzyCache: FuzzyUser[] | null = null; // New cache for deep matching
    
    private lastMapUpdate = 0;
    private readonly MAP_TTL_MS = 5 * 60 * 1000;
    private readonly CHUNK_SIZE = 1000;

    /* =========================================================
       HELPER: NORMALIZE STRINGS
    ========================================================= */
    private normalizeName(name: string): string {
        if (!name) return "";
        return name
            .toUpperCase()
            .replace(/^M\/S\.?\s*/, "")
            .replace(/[^A-Z0-9]/g, "");
    }

    /* =========================================================
       HELPERS: CACHES & MATCHING
    ========================================================= */
    private async refreshCaches(): Promise<void> {
        const now = Date.now();
        if (this.dealerMapCache && this.userMapCache && this.userFuzzyCache && (now - this.lastMapUpdate < this.MAP_TTL_MS)) {
            return;
        }

        console.log("[PjpWorker] 🔄 Refreshing User & Dealer Maps...");

        // Dealers Map
        const allDealers = await db.select({ id: dealers.id, name: dealers.name }).from(dealers);
        const dMap = new Map<string, string>();
        for (const d of allDealers) {
            if (d.name) dMap.set(this.normalizeName(d.name), d.id);
        }

        // Users Map & Fuzzy Cache
        const allUsers = await db.select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName
        }).from(users);

        const uMap = new Map<string, number>();
        const uFuzzy: FuzzyUser[] = [];

        for (const u of allUsers) {
            const fullName = `${u.firstName || ""} ${u.lastName || ""}`.trim();
            if (fullName) {
                // Strict name for O(1) Exact Matching
                const strictName = this.normalizeName(fullName);
                uMap.set(strictName, u.id);

                // Tokenized name for Deep Fuzzy Matching
                const cleanSpacedName = fullName.toUpperCase().replace(/[^A-Z0-9\s]/g, "").trim();
                const tokens = cleanSpacedName.split(/\s+/).filter(Boolean);
                
                uFuzzy.push({ id: u.id, strictName, tokens });
            }
        }

        this.dealerMapCache = dMap;
        this.userMapCache = uMap;
        this.userFuzzyCache = uFuzzy;
        this.lastMapUpdate = now;
    }

    private resolveUser(rawExcelName: string): number | null {
        if (!rawExcelName || !rawExcelName.trim()) return null;

        // Clean and tokenize the Excel name
        const cleanExcelName = rawExcelName.toUpperCase().replace(/^M\/S\.?\s*/, "").replace(/[^A-Z0-9\s]/g, "").trim();
        const excelTokens = cleanExcelName.split(/\s+/).filter(Boolean);
        const strictExcel = excelTokens.join("");

        if (!strictExcel) return null;

        // 1. Exact Match (O(1) fast lookup)
        if (this.userMapCache!.has(strictExcel)) {
            return this.userMapCache!.get(strictExcel)!;
        }

        // 2. Deep Match Fallbacks (Iterative)
        for (const dbUser of this.userFuzzyCache!) {
            // Substring Match (e.g., Typo catches)
            if (dbUser.strictName.includes(strictExcel) || strictExcel.includes(dbUser.strictName)) {
                console.log(`[PjpWorker] 🪄 Substring match: "${rawExcelName}" -> DB ID: ${dbUser.id}`);
                return dbUser.id;
            }

            // Word-by-Word Match (Catches "PRANAY KUMAR PAUL" vs "PRANAY PAUL")
            // Are all DB words present in the Excel name?
            const allDbWordsInExcel = dbUser.tokens.length > 0 && dbUser.tokens.every(token => excelTokens.includes(token));
            if (allDbWordsInExcel) {
                console.log(`[PjpWorker] 🪄 Word-by-Word match: "${rawExcelName}" -> DB ID: ${dbUser.id}`);
                return dbUser.id;
            }

            // Single Name Match (Catches "Elizabeth" vs "Elizabeth Smith")
            // Is the single Excel word present in the DB name?
            if (excelTokens.length === 1 && dbUser.tokens.includes(excelTokens[0])) {
                console.log(`[PjpWorker] 🪄 Single Name match: "${rawExcelName}" -> DB ID: ${dbUser.id}`);
                return dbUser.id;
            }
        }

        return null; // Ghost employee
    }

    /* =========================================================
       SLEEP UTILS
    ========================================================= */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => {
            this.sleepTimer = setTimeout(() => {
                this.sleepTimer = null;
                resolve();
            }, ms);
        });
    }

    private wakeUp() {
        if (this.sleepTimer) {
            clearTimeout(this.sleepTimer);
            this.sleepTimer = null;
        }
    }

    /* =========================================================
       WORKER LIFECYCLE
    ========================================================= */
    async Start() {
        if (this.state === WorkerState.RUNNING) return;
        console.log("SOLISEE KELA..AROMBHO HOI GOL XET.. (PJP Task Mode)");
        this.shouldStop = false;
        this.state = WorkerState.RUNNING;

        await this.refreshCaches();

        while (!this.shouldStop) {
            try {
                const didWork = await this.processPjpInboxQueue();

                if (didWork) continue;

                this.state = WorkerState.SLEEPING;
                console.log("INBOX KHAALI surorbachaa....");
                await this.sleep(5000);
                this.state = WorkerState.RUNNING;

            } catch (e: any) {
                console.error("sudi gol.. ERROR TU dekhaabo etiya...", e);
                this.state = WorkerState.SLEEPING;
                await this.sleep(30000);
                this.state = WorkerState.RUNNING;
            }
        }

        this.state = WorkerState.STOPPED;
        console.log("SOB BONDHO...nosole kela..");
    }

    async stop() {
        this.shouldStop = true;
        this.wakeUp();
    }

    public triggerWake() {
        if (this.state === WorkerState.SLEEPING) {
            this.wakeUp();
        }
    }

    /* =========================================================
       MAIN WORKER: MAP & EXECUTE
    ========================================================= */
    async processPjpInboxQueue(): Promise<boolean> {
        let processedAnyMail = false;

        const mails = await this.emailSystem.getUnreadWithAttachments();
        const list = Array.isArray(mails?.value) ? mails.value : [];

        if (!list.length) return false;

        await this.refreshCaches();

        for (const mail of list) {
            try {
                if (!mail?.id) continue;

                if (!mail.subject || !mail.subject.toUpperCase().includes("PJP")) {
                    continue;
                }

                const attachments = await this.emailSystem.getAttachments(mail.id);
                const files = Array.isArray(attachments?.value) ? attachments.value : [];

                if (!files.length) {
                    await this.emailSystem.markAsRead(mail.id);
                    continue;
                }

                for (const file of files) {
                    if (!file?.name?.match(/\.(xlsx|xls|csv)$/i) || !file.contentBytes) continue;

                    const buffer = Buffer.from(file.contentBytes, "base64");
                    if (!buffer.length) continue;

                    const payload = await this.excelBuilder.buildFromBuffer(buffer, {
                        messageId: mail.id,
                        fileName: file.name,
                        subject: mail.subject
                    });

                    const currentBatchId = randomUUID();
                    const pjpInserts: typeof dailyTasks.$inferInsert[] = [];

                    for (const task of payload.tasks) {
                        // The resolveUser method automatically ignores blank rows
                        const resolvedUserId = this.resolveUser(task.responsiblePerson);
                        
                        const normCounterName = this.normalizeName(task.counterName);
                        const resolvedDealerId = this.dealerMapCache!.get(normCounterName) || null;

                        if (!resolvedUserId) {
                            // If they are still missing after all 4 checks, they are truly missing.
                            console.warn(`[PjpWorker] ❌ Skipped row: User "${task.responsiblePerson}" not found in DB.`);
                            continue;
                        }

                        pjpInserts.push({
                            id: randomUUID(),
                            pjpBatchId: currentBatchId,
                            userId: resolvedUserId,
                            dealerId: resolvedDealerId,
                            dealerNameSnapshot: task.counterName,
                            dealerMobile: task.mobile,
                            zone: task.zone,
                            area: task.area,
                            route: task.route,
                            objective: task.objective,
                            visitType: task.type,
                            requiredVisitCount: task.requiredVisitCount,
                            week: task.week,
                            taskDate: task.date || new Date().toISOString().split("T")[0],
                            status: "Assigned",
                        });
                    }

                    if (pjpInserts.length > 0) {
                        await db.transaction(async (tx) => {
                            for (let i = 0; i < pjpInserts.length; i += this.CHUNK_SIZE) {
                                await tx.insert(dailyTasks).values(pjpInserts.slice(i, i + this.CHUNK_SIZE));
                            }
                        });
                        console.log(`[PjpWorker] ✅ Pushed ${pjpInserts.length} tasks to DB. BatchID: ${currentBatchId}`);
                    }
                }

                await this.emailSystem.markAsRead(mail.id);
                if (this.processedFolderId) {
                    await this.emailSystem.moveMail(mail.id, this.processedFolderId);
                }
                processedAnyMail = true;
            } catch (e: any) {
                console.error(`[PjpWorker] Mail ${mail?.id} crashed.`, e.message);
            }
        }
        return processedAnyMail;
    }
}