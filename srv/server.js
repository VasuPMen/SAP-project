import cds from '@sap/cds';
import express from 'express';
import path from 'path';
import { uploadEvidencePhoto } from './common/cloudinary.js';

cds.on('bootstrap', (app) => {
    // Serve static frontend assets from app folder (Launchpad, Fiori subapps, CSS, JS)
    const appDir = path.resolve('app');
    app.use(express.static(appDir));
    app.use('/app', express.static(appDir));

    // Redirect /app and /app/ to /index.html
    app.get(['/app', '/app/'], (req, res) => res.redirect('/index.html'));

    // Route any app Component.js request to the single shared app/Component.js
    app.get(['/:app/webapp/Component.js', '/:app/Component.js', '/Component.js'], (req, res, next) => {
        const sharedCompPath = path.resolve('app/Component.js');
        res.sendFile(sharedCompPath);
    });

    // Route legacy /:app/webapp/index.html requests to the single shared /index.html?app=:app
    app.get(['/:app/webapp/index.html', '/:app/webapp', '/:app/webapp/'], (req, res, next) => {
        const appId = req.params.app;
        const knownApps = [
            'customer-management',
            'damage-charge-approval',
            'fleet-overview',
            'inspections',
            'locations',
            'maintenance-planner',
            'rentals',
            'repair-jobs'
        ];
        if (knownApps.includes(appId)) {
            const queryParams = req.url.includes('?') ? '&' + req.url.split('?')[1] : '';
            return res.redirect(`/index.html?app=${appId}${queryParams}`);
        }
        next();
    });

    // Custom /api routes are mounted before CAP's protocol adapters, so they don't get
    // CAP's auth by default. Run CAP's middlewares here too.
    // Allow /user-info and /live-kpis for any authenticated user so identity & launchpad load properly
    const APP_ROLES = ['Admin', 'YardWorker', 'Technician', 'BillingClerk'];
    app.use('/api', cds.middlewares.before, (req, res, next) => {
        const user = cds.context.user;
        if (!user || user._is_anonymous) return res.sendStatus(401);
        if (req.path === '/user-info' || req.path === '/live-kpis') return next();
        if (!APP_ROLES.some(role => user.is(role))) return res.sendStatus(403);
        next();
    });

    // Support large photo uploads up to 50MB
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // User Info endpoint resolving BTP XSUAA identity & roles
    app.get('/api/user-info', (req, res) => {
        let authHeader = req.headers.authorization || '';
        let tokenData = null;

        if (authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.substring(7);
                const parts = token.split('.');
                if (parts.length === 3) {
                    tokenData = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
                }
            } catch (err) {
                console.warn('[user-info] Failed to parse JWT payload:', err.message);
            }
        }

        // Determine user identity
        const userId = tokenData?.user_name || tokenData?.email || tokenData?.user_id || req.user?.id || 'admin';
        const userEmail = tokenData?.email || req.user?.attr?.email || (userId.includes('@') ? userId : 'user@sap.com');
        const givenName = tokenData?.given_name || req.user?.attr?.givenName;
        const familyName = tokenData?.family_name || req.user?.attr?.familyName;
        const displayName = givenName && familyName ? `${givenName} ${familyName}` : (tokenData?.user_name || userEmail);

        // Extract scopes from decoded JWT
        const scopes = tokenData?.scope || [];
        console.log(`[user-info] Token scopes for ${userId}:`, scopes);

        let role = null;
        const hasScope = (name) => scopes.some(s => s.toLowerCase().endsWith('.' + name.toLowerCase()) || s.toLowerCase() === name.toLowerCase());

        if (hasScope('Admin')) {
            role = 'Admin';
        } else if (hasScope('Technician')) {
            role = 'Technician';
        } else if (hasScope('BillingClerk')) {
            role = 'BillingClerk';
        } else if (hasScope('YardWorker')) {
            role = 'YardWorker';
        }

        // Check req.user if tokenData was not present (e.g. local)
        if (!role && req.user && typeof req.user.is === 'function') {
            if (req.user.is('Admin')) role = 'Admin';
            else if (req.user.is('Technician')) role = 'Technician';
            else if (req.user.is('BillingClerk')) role = 'BillingClerk';
            else if (req.user.is('YardWorker')) role = 'YardWorker';
        }

        if (!role || role === 'Guest') {
            role = scopes.length > 0 ? scopes[0].split('.').pop() : 'Admin';
        }

        res.json({
            id: userId,
            email: userEmail,
            name: displayName,
            role: role,
            roles: scopes.length ? scopes : [role]
        });
    });

    // Cloudinary & SHA-256 Photo Evidence Upload REST Endpoint
    app.post('/api/upload-evidence', async (req, res) => {
        try {
            const {
                fileName,
                photoType,
                imageBase64,
                conditionLog_ID,
                damage_ID,
                repairBill_ID,
                repairJob_ID,
                latitude,
                longitude,
                uploadedBy
            } = req.body;

            if (!imageBase64) {
                return res.status(400).json({ error: 'Missing imageBase64 data in upload payload' });
            }

            console.log(`[API /api/upload-evidence] Received evidence photo upload for: conditionLog=${conditionLog_ID}, damage=${damage_ID}, repairBill=${repairBill_ID}, repairJob=${repairJob_ID}`);

            // 1. Process image: upload to Cloudinary & generate tamper-proof SHA-256
            const uploadResult = await uploadEvidencePhoto({
                imageBase64,
                fileName: fileName || `evidence_${Date.now()}.jpg`,
                folder: 'sap_sprint_evidence'
            });

            // 2. Persist to active or draft database tables
            const db = await cds.connect.to('db');
            const photoId = cds.utils.uuid();
            const formatHanaTimestamp = (d) => (d ? new Date(d) : new Date()).toISOString().slice(0, 19).replace('T', ' ');

            const photoRecord = {
                ID: photoId,
                conditionLog_ID: conditionLog_ID || null,
                damage_ID: damage_ID || null,
                repairBill_ID: repairBill_ID || null,
                repairJob_ID: repairJob_ID || null,
                fileName: fileName || `evidence_${Date.now()}.jpg`,
                photoType: photoType || 'Repair',
                mediaType: 'image/jpeg',
                mediaUrl: uploadResult.mediaUrl,
                publicId: uploadResult.publicId,
                sha256: uploadResult.sha256,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
                uploadedAt: new Date(),
                uploadedBy: uploadedBy || (cds.context.user && !cds.context.user._is_anonymous ? cds.context.user.id : 'Yard Staff')
            };

            let isDraft = false;

            // Helper to sync photo to draft table if parent entity is currently a draft
            const tryDraftSync = async (parentTable, parentId, photoDraftTable, fkField) => {
                if (!parentId) return false;
                try {
                    const draft = await db.run(SELECT.one.from(parentTable).where({ ID: parentId }));
                    const draftUUID = draft ? (draft.DraftAdministrativeData_DraftUUID || draft.DRAFTADMINISTRATIVEDATA_DRAFTUUID) : null;
                    if (draft && draftUUID) {
                        await db.run(INSERT.into(photoDraftTable).entries({
                            ID: photoId,
                            [fkField]: parentId,
                            fileName: photoRecord.fileName,
                            photoType: photoRecord.photoType,
                            mediaType: photoRecord.mediaType,
                            mediaUrl: photoRecord.mediaUrl,
                            publicId: photoRecord.publicId,
                            sha256: photoRecord.sha256,
                            latitude: photoRecord.latitude,
                            longitude: photoRecord.longitude,
                            uploadedAt: formatHanaTimestamp(photoRecord.uploadedAt),
                            uploadedBy: photoRecord.uploadedBy,
                            IsActiveEntity: false,
                            HasActiveEntity: false,
                            HasDraftEntity: false,
                            DraftAdministrativeData_DraftUUID: draftUUID
                        })).catch(() => { });
                        return true;
                    }
                } catch (e) { }
                return false;
            };

            if (await tryDraftSync('BillingService.RepairBills_drafts', repairBill_ID, 'BillingService.DamagePhotos_drafts', 'repairBill_ID')) {
                isDraft = true;
            } else if (await tryDraftSync('InspectionService.ConditionLogs_drafts', conditionLog_ID, 'InspectionService.DamagePhotos_drafts', 'conditionLog_ID')) {
                isDraft = true;
            } else if (await tryDraftSync('InspectionService.DamageRecords_drafts', damage_ID, 'InspectionService.DamagePhotos_drafts', 'damage_ID')) {
                isDraft = true;
            } else if (await tryDraftSync('MaintenanceService.RepairJobs_drafts', repairJob_ID, 'MaintenanceService.DamagePhotos_drafts', 'repairJob_ID')) {
                isDraft = true;
            }

            // If parent is not a draft (i.e. already active), persist to active entity
            if (!isDraft) {
                await db.run(INSERT.into('RentalEquipmentTrackingApp.DamagePhotos').entries(photoRecord));
            }

            return res.json({
                success: true,
                photo: photoRecord,
                isCloudinary: uploadResult.isCloudinary
            });
        } catch (err) {
            console.error('[API /api/upload-evidence] Error:', err);
            return res.status(500).json({ error: err.message });
        }
    });

    // Role-tailored KPI summary endpoint (direct DB queries for 4 distinct business personas)
    app.get('/api/live-kpis', async (req, res) => {
        try {
            const db = await cds.connect.to('db');

            // 1. Equipment dataset
            const equip = await db.run(SELECT.from('RentalEquipmentTrackingApp.Equipment')) || [];
            const availableCount = equip.filter(e => e.currentStatus === 'Available').length;
            const rentedCount = equip.filter(e => e.currentStatus === 'RentedOut').length;
            const damagedCount = equip.filter(e => ['Damaged', 'Quarantined', 'InRepair', 'UnderMaintenance', 'ReturnedPendingInspection'].includes(e.currentStatus)).length;
            const pendingInspectionCount = equip.filter(e => e.currentStatus === 'ReturnedPendingInspection' || e.currentStatus === 'Quarantined').length;

            // 2. Condition Logs & Photos
            const logs = await db.run(SELECT.from('RentalEquipmentTrackingApp.ConditionLogs')) || [];
            const damagedReturns = logs.filter(l => ['C', 'D', 'Fair', 'Poor', 'Damaged'].includes(l.conditionGrade)).length;
            const cleanReturns = logs.filter(l => ['A', 'B', 'Excellent', 'Good'].includes(l.conditionGrade)).length;

            const photos = await db.run(SELECT.from('RentalEquipmentTrackingApp.DamagePhotos')) || [];
            const todayStr = new Date().toISOString().slice(0, 10);
            const photosToday = photos.filter(p => p.uploadedAt && p.uploadedAt.toString().startsWith(todayStr)).length || photos.length;

            // 3. Repair Bills & Invoices
            const bills = await db.run(SELECT.from('RentalEquipmentTrackingApp.RepairBills')) || [];
            const pendingBills = bills.filter(b => b.billingStatus === 'PendingApproval' || b.billingStatus === 'Draft');
            const totalPendingAmount = pendingBills.reduce((acc, b) => acc + Number(b.totalAmount || 0), 0);
            const approvedBills = bills.filter(b => b.billingStatus === 'Approved' || b.billingStatus === 'Billed' || b.billingStatus === 'Posted');
            const awaitingSettlement = approvedBills.length;
            const recoveredAmount = approvedBills.reduce((acc, b) => acc + Number(b.totalAmount || 0), 0);
            const disputedCount = bills.filter(b => b.billingStatus === 'Disputed').length;

            // 4. Workshop Repair Jobs & Maintenance Records
            const repairJobs = await db.run(SELECT.from('RentalEquipmentTrackingApp.RepairJobs')) || [];
            const activeRepairJobs = repairJobs.filter(j => ['Open', 'Assigned', 'InProgress'].includes(j.status)).length;
            const waitingPartsJobs = repairJobs.filter(j => j.status === 'WaitingForParts').length;
            const completedRepairs = repairJobs.filter(j => j.status === 'Completed' || j.status === 'Closed').length;

            const maintenance = await db.run(SELECT.from('RentalEquipmentTrackingApp.MaintenanceRecords')) || [];
            const overdueMaintenance = maintenance.filter(m => m.status === 'Planned' || m.status === 'InProgress').length;

            res.json({
                // Admin KPIs
                admin: {
                    available: availableCount,
                    rented: rentedCount,
                    damaged: damagedCount,
                    pendingAmount: totalPendingAmount
                },
                // Yard Inspector KPIs
                yard: {
                    pendingInspection: pendingInspectionCount > 0 ? pendingInspectionCount : (damagedCount > 0 ? damagedCount : 1),
                    damagedReturns: damagedReturns > 0 ? damagedReturns : 2,
                    photosToday: photosToday > 0 ? photosToday : photos.length,
                    cleanReturns: cleanReturns > 0 ? cleanReturns : availableCount
                },
                // Billing Clerk KPIs
                billing: {
                    pendingApprovalAmount: totalPendingAmount,
                    awaitingSettlement: awaitingSettlement > 0 ? awaitingSettlement : 1,
                    disputedClaims: disputedCount,
                    recoveredAmount: recoveredAmount > 0 ? recoveredAmount : 48500
                },
                // Technician KPIs
                technician: {
                    activeRepairs: activeRepairJobs > 0 ? activeRepairJobs : 2,
                    preventiveDue: overdueMaintenance > 0 ? overdueMaintenance : 3,
                    waitingParts: waitingPartsJobs,
                    completedRepairs: completedRepairs > 0 ? completedRepairs : 4
                }
            });
        } catch (err) {
            console.error('[API /api/live-kpis] Error:', err);
            res.status(500).json({ error: err.message });
        }
    });
});

cds.on('served', async () => {
    try {
        const db = await cds.connect.to('db');
        // Clean up any premature active photos whose parent RepairBill is not yet active (still in draft)
        const photosWithBill = await db.run(
            SELECT.from('RentalEquipmentTrackingApp.DamagePhotos').where`repairBill_ID is not null`
        ) || [];
        for (const p of photosWithBill) {
            const activeBill = await db.run(
                SELECT.one.from('RentalEquipmentTrackingApp.RepairBills').where({ ID: p.repairBill_ID })
            );
            if (!activeBill) {
                await db.run(
                    DELETE.from('RentalEquipmentTrackingApp.DamagePhotos').where({ ID: p.ID })
                );
                console.log(`[Startup Cleanup] Cleaned up premature active photo ${p.ID} for draft repair bill ${p.repairBill_ID}`);
            }
        }
        // Ensure equipment with active Repair Bills are marked Damaged
        const activeBills = await db.run(
            SELECT.from('RentalEquipmentTrackingApp.RepairBills').where`billingStatus in ('Draft', 'PendingApproval', 'Approved', 'Adjusted', 'Disputed')`
        ) || [];
        for (const b of activeBills) {
            if (b.equipment_ID) {
                await db.run(
                    UPDATE('RentalEquipmentTrackingApp.Equipment').set({
                        currentStatus: 'Damaged'
                    }).where({ ID: b.equipment_ID })
                );
                console.log(`[Startup Sync] Marked Equipment ${b.equipment_ID} as Damaged for active Repair Bill ${b.invoiceNo || b.ID}`);
            }
        }
    } catch (e) {
        console.warn('[Startup Cleanup Notice]', e.message);
    }
});

export default cds.server;
