// src/server/index.ts
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
// --- Import ALL your API route setups ---
import setupMasonStatsRoute from './src/routes/dataFetchingRoutes/masonstatscheck'
import setupAuthRoutes from './src/routes/auth'; 
import setupUsersRoutes from './src/routes/users'; 
import setupCompaniesRoutes from './src/routes/companies'; 
import setupLogoutAuthRoutes from './src/routes/logout';
import setupR2Upload from './src/routes/cloudfareRoutes/cloudfare'; 
import setupBrandsAndMappingRoutes from './src/routes/dataFetchingRoutes/brandMappingFetch';
import setupCompetitionReportsRoutes from './src/routes/dataFetchingRoutes/competetionReports';
import setupDailyTasksRoutes from './src/routes/dataFetchingRoutes/dailyTasks';
import setupDealersRoutes from './src/routes/dataFetchingRoutes/dealers';
import setupPJPRoutes from './src/routes/dataFetchingRoutes/pjp';
import setupDealerReportsAndScoresRoutes from './src/routes/dataFetchingRoutes/dealerReportandScores';
import setupRatingsRoutes from './src/routes/dataFetchingRoutes/ratings';
import setupSalesmanLeaveApplicationsRoutes from './src/routes/dataFetchingRoutes/salesmanLeaveApplications';
import setupSalesOrdersRoutes from './src/routes/dataFetchingRoutes/salesOrder';
import setupDailyVisitReportsRoutes from './src/routes/dataFetchingRoutes/dvr';
import setupSalesmanAttendanceRoutes from './src/routes/dataFetchingRoutes/salesmanAttendance';
import setupTechnicalVisitReportsRoutes from './src/routes/dataFetchingRoutes/tvr';
import setupTsoMeetingsGetRoutes from './src/routes/dataFetchingRoutes/tsoMeetings';
import setupMasonsOnMeetingsGetRoutes from './src/routes/dataFetchingRoutes/masonOnMeeting';
import setupMasonsOnSchemeGetRoutes from './src/routes/dataFetchingRoutes/masonOnScheme';
import setupMasonsPcSideRoutes from './src/routes/dataFetchingRoutes/masonpcSide';
import setupSchemesOffersRoutes from './src/routes/dataFetchingRoutes/schemesOffers';
import setupBagLiftsGetRoutes from './src/routes/dataFetchingRoutes/bagsLift';
import setupPointsLedgerGetRoutes from './src/routes/dataFetchingRoutes/pointsLedger';
import setupRewardCategoriesGetRoutes from './src/routes/dataFetchingRoutes/rewardCategories';
import setupRewardsGetRoutes from './src/routes/dataFetchingRoutes/rewards';
import setupRewardsRedemptionGetRoutes from './src/routes/dataFetchingRoutes/rewardsRedemption';
import setupKycSubmissionsRoutes from './src/routes/dataFetchingRoutes/kycSubmissions';
import setupTechnicalSitesRoutes from './src/routes/dataFetchingRoutes/technicalSites';
import setupSchemeSlabsGetRoutes from './src/routes/dataFetchingRoutes/schemeSlabs';
import setupMasonSlabAchievementsGetRoutes from './src/routes/dataFetchingRoutes/masonSlabAchievements';
import setupLogisticsIORoutes from './src/routes/dataFetchingRoutes/logisticsIO';
import setupCollectionReportsRoutes from './src/routes/dataFetchingRoutes/collectionReports';
import setupOutstandingReportsGetRoutes from './src/routes/dataFetchingRoutes/outstandingReports';
import setupVerifiedDealersGetRoutes from './src/routes/dataFetchingRoutes/verifiedDealers';

// --- Import DELETE route setups ---
import setupDealersDeleteRoutes from './src/routes/deleteRoutes/dealers';
import setupPermanentJourneyPlansDeleteRoutes from './src/routes/deleteRoutes/pjp';
import setupTechnicalVisitReportsDeleteRoutes from './src/routes/deleteRoutes/tvr';
import setupDailyVisitReportsDeleteRoutes from './src/routes/deleteRoutes/dvr';
import setupDailyTasksDeleteRoutes from './src/routes/deleteRoutes/dailytask';
import setupSalesmanLeaveApplicationsDeleteRoutes from './src/routes/deleteRoutes/salesmanleave';
import setupCompetitionReportsDeleteRoutes from './src/routes/deleteRoutes/competetionreports';
import setupBrandsDeleteRoutes from './src/routes/deleteRoutes/brands';
import setupRatingsDeleteRoutes from './src/routes/deleteRoutes/ratings';
import setupSalesOrdersDeleteRoutes from './src/routes/deleteRoutes/salesOrder';
import setupDealerReportsAndScoresDeleteRoutes from './src/routes/deleteRoutes/dealerReportsAndScores';
import setupTsoMeetingsDeleteRoutes from './src/routes/deleteRoutes/tsoMeetings';

//firebase stuff 
import './src/firebase/admin';
import setupAuthFirebaseRoutes from './src/routes/authFirebase';

// --- Import POST route setups ---
import setupDailyVisitReportsPostRoutes from './src/routes/formSubmissionRoutes/dvr';
import setupTechnicalVisitReportsPostRoutes from './src/routes/formSubmissionRoutes/tvr';
import setupPermanentJourneyPlansPostRoutes from './src/routes/formSubmissionRoutes/pjp';
import setupDealersPostRoutes from './src/routes/formSubmissionRoutes/addDealer';
import setupSalesmanLeaveApplicationsPostRoutes from './src/routes/formSubmissionRoutes/salesManleave';
import setupCompetitionReportsPostRoutes from './src/routes/formSubmissionRoutes/competitionReport';
import setupDailyTasksPostRoutes from './src/routes/formSubmissionRoutes/dailytasks';
import setupDealerReportsAndScoresPostRoutes from './src/routes/formSubmissionRoutes/dealerReportsAndScores';
import setupRatingsPostRoutes from './src/routes/formSubmissionRoutes/ratings';
import setupBrandsPostRoutes from './src/routes/formSubmissionRoutes/brand';
import setupSalesOrdersPostRoutes from './src/routes/formSubmissionRoutes/salesOrder';
import setupDealerBrandMappingPostRoutes from './src/routes/formSubmissionRoutes/brandMapping';
import setupAttendanceCheckInRoutes from './src/routes/formSubmissionRoutes/attendanceIn';
import setupAttendanceCheckOutRoutes from './src/routes/formSubmissionRoutes/attendanceOut';
import setupTsoMeetingsPostRoutes from './src/routes/formSubmissionRoutes/tsoMeetings';
import setupMasonOnMeetingPostRoutes from './src/routes/formSubmissionRoutes/masonOnMeeting';
import setupMasonOnSchemePostRoutes from './src/routes/formSubmissionRoutes/masonOnScheme';
import setupMasonPcSidePostRoutes from './src/routes/formSubmissionRoutes/masonpcSide';
import setupSchemesOffersPostRoutes from './src/routes/formSubmissionRoutes/schemesOffers';
import setupBagLiftsPostRoute from './src/routes/formSubmissionRoutes/bagsLift';
import setupRewardsRedemptionPostRoute from './src/routes/formSubmissionRoutes/rewardsRedemption';
import setupKycSubmissionsPostRoute from './src/routes/formSubmissionRoutes/kycSubmission';
import setupRewardsPostRoute from './src/routes/formSubmissionRoutes/rewards';
import setupPointsLedgerPostRoutes from './src/routes/dataFetchingRoutes/pointsLedger';
import setupTechnicalSitesPostRoutes from './src/routes/formSubmissionRoutes/technicalSites';
import setupSchemeSlabsPostRoute from './src/routes/formSubmissionRoutes/schemeSlabs';
import setupMasonSlabAchievementsPostRoute from './src/routes/formSubmissionRoutes/masonSlabAchievements';
import setupLogisticsIOSubmissionRoute from './src/routes/formSubmissionRoutes/logisticsIO';


// --- Import UPDATE (PATCH) route setups ---
import setupDealersPatchRoutes from './src/routes/updateRoutes/dealers';
import setupPjpPatchRoutes from './src/routes/updateRoutes/pjp';
import setupDailyTaskPatchRoutes from './src/routes/updateRoutes/dailytask';
import setupDealerBrandMappingPatchRoutes from './src/routes/updateRoutes/brandMapping';
import setupBrandsPatchRoutes from './src/routes/updateRoutes/brands';
import setupRatingsPatchRoutes from './src/routes/updateRoutes/ratings';
import setupDealerScoresPatchRoutes from './src/routes/updateRoutes/dealerReportandScores';
import setupDailyVisitReportsPatchRoutes from './src/routes/updateRoutes/dvr';
import setupTechnicalVisitReportsPatchRoutes from './src/routes/updateRoutes/tvr';
import setupTsoMeetingsPatchRoutes from './src/routes/updateRoutes/tsoMeetings';
import setupSalesOrdersPatchRoutes from './src/routes/updateRoutes/salesorder';
import setupMasonPcSidePatchRoutes from './src/routes/updateRoutes/masonpcSide';
import setupSchemesOffersPatchRoutes from './src/routes/updateRoutes/schemesOffers';
import setupKycSubmissionsPatchRoute from './src/routes/updateRoutes/kycSubmission';
import setupRewardsPatchRoute from './src/routes/updateRoutes/rewards';
import setupRewardsRedemptionPatchRoute from './src/routes/updateRoutes/rewardsRedemption';
import setupBagLiftsPatchRoute from './src/routes/updateRoutes/bagsLift';
import setupTechnicalSitesUpdateRoutes from './src/routes/updateRoutes/technicalSites';
import setupLogisticsIOUpdateRoutes from './src/routes/updateRoutes/logisticsIO';
import setupLeaveUpdateRoute from './src/routes/updateRoutes/salesmanLeaves';

// --- Import GEO TRACKING route setups ---
import setupGeoTrackingRoutes from './src/routes/geoTrackingRoutes/geoTracking';
import setupJourneyOpsRoutes from './src/routes/geoTrackingRoutes/journeyOps';

// ----- TeamView Routes -----
import setupTeamViewRoutes from './src/routes/teamView/getView';

// --- TelegramBot + AI Bot setups ---
import setupAiService from './src/bots/aiService';
//import setupTelegramService from './src/bots/telegramService';

// WEBSOCKET SYSTEM
import { attachWebSocket } from './src/websocket/socketServer';

//notunRendami
import setupAuthCredentialRoutes from './src/routes/authCredentials';
import setupAuthLogisticsRoutes from './src/routes/authLogistics';

// Microsoft Email
import setupMicrosoftEmailRoutes from './src/routes/microsoftEmail/emailRoute';

//weirdEMAILWORKERthatwillPOLLevery30s
// import { EmailSystemWorker } from './src/routes/microsoftEmail/emailsystemworker';
import { MasterEmailWorker } from "./src/services/masteremailworker";
import setupProjectionRoutes from './src/routes/dataFetchingRoutes/projectionReports';
import setupProjectionVsActualRoutes from './src/routes/dataFetchingRoutes/projectionVsActualReports';


//---------------------------------------------
//----------------MainMasterEMAILWORKER--------------------

const emailRouter = new MasterEmailWorker();
emailRouter.Start();

//----------------MainMasterEMAILWORKER--------------------
//---------------------------------------------

// const worker = new EmailSystemWorker();

// worker.Start().catch((e) => {
//   console.error("Worker crashed unexpectedly:", e);
// });

// Initialize environment variables

// ADD THIS DEBUG LINE:
console.log('DATABASE_URL loaded:', process.env.DATABASE_URL ? 'YES' : 'NO');
console.log('DATABASE_URL length:', process.env.DATABASE_URL?.length || 0);

// --- Server Setup ---
const app: Express = express();
//const PORT = process.env.PORT || 8080;
const DEFAULT_PORT = 8000;
const parsed = parseInt(process.env.PORT ?? String(DEFAULT_PORT), 10);
const PORT = Number.isNaN(parsed) ? DEFAULT_PORT : parsed;


// --- Core Middleware ---
// Enable Cross-Origin Resource Sharing for all routes
app.use(cors());

// Enable the express.json middleware to parse JSON request bodies
app.use(express.json());

app.use(express.static(path.join(process.cwd(), 'public')));

// Simple logging middleware to see incoming requests
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// --- API Routes ---

// A simple health-check or welcome route
app.get('/api', (req: Request, res: Response) => {
  res.status(200).json({ 
    message: 'Welcome to the Field Force Management API!',
    timestamp: new Date().toISOString()
  });
});

// --- Modular Route Setup ---
console.log('🔌 Registering API routes...');

//colection reprts from MAIL NIGGA
setupCollectionReportsRoutes(app);
setupOutstandingReportsGetRoutes(app);
setupVerifiedDealersGetRoutes(app);

//YEAHEHE
setupProjectionVsActualRoutes(app);
setupProjectionRoutes(app);

// Authentication and Users (FIRST)
setupAuthRoutes(app);                    // /api/auth/login, /api/user/:id
setupUsersRoutes(app);                   // /api/users/*
setupCompaniesRoutes(app);                // /api/companies
setupLogoutAuthRoutes(app);               // /api/auth/logout
//firebase
setupAuthFirebaseRoutes(app);
setupAuthLogisticsRoutes(app);

// Core Data Endpoints (GET)
setupBrandsAndMappingRoutes(app);        // /api/brands/*, /api/dealer-brand-mapping/*
setupDealersRoutes(app);                 // /api/dealers/*
setupDailyTasksRoutes(app);              // /api/daily-tasks/*
setupPJPRoutes(app);                     // /api/pjp/*

// Reports Endpoints (GET)
setupCompetitionReportsRoutes(app);      // /api/competition-reports/*
setupDailyVisitReportsRoutes(app);       // /api/daily-visit-reports/*
setupTechnicalVisitReportsRoutes(app);   // /api/technical-visit-reports/*
setupTsoMeetingsGetRoutes(app);

// Additional Data Endpoints (GET)
setupDealerReportsAndScoresRoutes(app);  // /api/dealer-reports-scores/*
setupRatingsRoutes(app);                 // /api/ratings/*
setupSalesmanLeaveApplicationsRoutes(app); // /api/leave-applications/*
setupSalesOrdersRoutes(app);             // /api/sales-orders/*
setupSalesmanAttendanceRoutes(app);      // /api/salesman-attendance/*

// mason pc side
setupMasonStatsRoute(app);
setupMasonsOnMeetingsGetRoutes(app);
setupMasonsOnSchemeGetRoutes(app);
setupMasonsPcSideRoutes(app);
setupSchemesOffersRoutes(app);
setupBagLiftsGetRoutes(app);
setupPointsLedgerGetRoutes(app);
setupRewardsGetRoutes(app);
setupRewardsRedemptionGetRoutes(app);
setupKycSubmissionsRoutes(app);
setupTechnicalSitesRoutes(app);
setupSchemeSlabsGetRoutes(app);
setupMasonSlabAchievementsGetRoutes(app);

//logistics
setupLogisticsIORoutes(app);


// POST Endpoints
setupTechnicalVisitReportsPostRoutes(app); // POST /api/technical-visit-reports/*
setupPermanentJourneyPlansPostRoutes(app); // POST /api/permanent-journey-plans/*
setupDealersPostRoutes(app);             // POST /api/dealers/*
setupSalesmanLeaveApplicationsPostRoutes(app); // POST /api/leave-applications/*
setupCompetitionReportsPostRoutes(app);  // POST /api/competition-reports/*
setupDailyTasksPostRoutes(app);          // POST /api/daily-tasks/*
setupDealerReportsAndScoresPostRoutes(app); // POST /api/dealer-reports-scores/*
setupRatingsPostRoutes(app);             // POST /api/ratings/*
setupBrandsPostRoutes(app);              // POST /api/brands/*
setupSalesOrdersPostRoutes(app);         // POST /api/sales-orders/*
setupDealerBrandMappingPostRoutes(app);  // POST /api/dealer-brand-mapping/*
setupDailyVisitReportsPostRoutes(app);   // POST /api/daily-visit-reports/*
setupAttendanceCheckInRoutes(app);       // POST /api/attendance/check-in/*
setupAttendanceCheckOutRoutes(app);      // POST /api/attendance/check-out/*
setupTsoMeetingsPostRoutes(app);         // TSO meeting r ENDPOINT r initiations kaam kore

// mason pc side
setupMasonOnMeetingPostRoutes(app);
setupMasonOnSchemePostRoutes(app);
setupMasonPcSidePostRoutes(app);
setupSchemesOffersPostRoutes(app);
setupRewardCategoriesGetRoutes(app);
setupKycSubmissionsPostRoute(app);
setupRewardsPostRoute(app);
setupPointsLedgerPostRoutes(app);
setupTechnicalSitesPostRoutes(app);
setupSchemeSlabsPostRoute(app);
setupMasonSlabAchievementsPostRoute(app);

// logistics
setupLogisticsIOSubmissionRoute(app);

// DELETE Endpoints
setupDealersDeleteRoutes(app);           // DELETE /api/dealers/*
setupPermanentJourneyPlansDeleteRoutes(app); // DELETE /api/permanent-journey-plans/*
setupTechnicalVisitReportsDeleteRoutes(app); // DELETE /api/technical-visit-reports/*
setupDailyVisitReportsDeleteRoutes(app); // DELETE /api/daily-visit-reports/*
setupDailyTasksDeleteRoutes(app);        // DELETE /api/daily-tasks/*
setupSalesmanLeaveApplicationsDeleteRoutes(app); // DELETE /api/leave-applications/*
setupCompetitionReportsDeleteRoutes(app); // DELETE /api/competition-reports/*
setupBrandsDeleteRoutes(app);            // DELETE /api/brands/*
setupRatingsDeleteRoutes(app);           // DELETE /api/ratings/*
setupSalesOrdersDeleteRoutes(app);       // DELETE /api/sales-orders/*
setupDealerReportsAndScoresDeleteRoutes(app); // DELETE /api/dealer-reports-scores/*
setupTsoMeetingsDeleteRoutes(app);

// UPDATE (PATCH) endpoints
setupDealersPatchRoutes(app);
setupDealerScoresPatchRoutes(app);
setupRatingsPatchRoutes(app);
setupDailyTaskPatchRoutes(app);
setupDealerBrandMappingPatchRoutes(app);
setupBrandsPatchRoutes(app);
setupPjpPatchRoutes(app);
setupDailyVisitReportsPatchRoutes(app);
setupTechnicalVisitReportsPatchRoutes(app);
setupTsoMeetingsPatchRoutes(app);
setupSalesOrdersPatchRoutes(app);
setupLeaveUpdateRoute(app);

// mason pc side
setupMasonPcSidePatchRoutes(app);
setupSchemesOffersPatchRoutes(app);
setupBagLiftsPostRoute(app);
setupRewardsRedemptionPostRoute(app);
setupKycSubmissionsPatchRoute(app);
setupRewardsPatchRoute(app);
setupRewardsRedemptionPatchRoute(app);
setupBagLiftsPatchRoute(app);
setupTechnicalSitesUpdateRoutes(app);

//notunrendami
setupAuthCredentialRoutes(app);

// logistics
setupLogisticsIOUpdateRoutes(app);

// ---------- GEO TRACKING SETUP--------
setupGeoTrackingRoutes(app);
setupJourneyOpsRoutes(app);

// ------- Team View --------
setupTeamViewRoutes(app);

//------------ CLOUDFARE ----------------
setupR2Upload(app);
console.log('✅ All routes registered successfully.');

//------------ TelegramBot + AI setup ----------------
setupAiService(app);
//setupTelegramService(app);

// -------- Microsoft Email -------------
setupMicrosoftEmailRoutes(app);


// Handle 404 - Not Found for any routes not matched above
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Resource not found' });
});

// Handle 500 - Generic Internal Server Error
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack); // Log the error stack for debugging
  res.status(500).json({ 
    success: false, 
    error: 'Internal Server Error',
    details: err.message 
  });
});

// --- Start the Server ---
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server is running and listening on http://0.0.0.0:${PORT}`);
});

// WEBSOCKET START
attachWebSocket(server);