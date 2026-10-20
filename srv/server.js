import cds from '@sap/cds';
import express from 'express';
import path from 'path';
import { uploadEvidencePhoto } from './common/cloudinary.js';

cds.on('bootstrap', (app) => {
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

    // Support large photo uploads up to 50MB
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
                latitude,
                longitude,
                uploadedBy
            } = req.body;

            if (!imageBase64) {
                return res.status(400).json({ error: 'Missing imageBase64 data in upload payload' });
            }

            console.log(`[API /api/upload-evidence] Received evidence photo upload for: conditionLog=${conditionLog_ID}, damage=${damage_ID}, repairBill=${repairBill_ID}`);

            // 1. Process image: upload to Cloudinary & generate tamper-proof SHA-256
            const uploadResult = await uploadEvidencePhoto({
                imageBase64,
                fileName: fileName || `evidence_${Date.now()}.jpg`,
                folder: 'sap_sprint_evidence'
            });

            // 2. Persist to DamagePhotos entity
            const db = await cds.connect.to('db');
            const photoId = cds.utils.uuid();

            const photoRecord = {
                ID: photoId,
                conditionLog_ID: conditionLog_ID || null,
                damage_ID: damage_ID || null,
                repairBill_ID: repairBill_ID || null,
                fileName: fileName || `evidence_${Date.now()}.jpg`,
                photoType: photoType || 'Return',
                mediaType: 'image/jpeg',
                mediaUrl: uploadResult.mediaUrl,
                publicId: uploadResult.publicId,
                sha256: uploadResult.sha256,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
                uploadedAt: new Date(),
                uploadedBy: uploadedBy || (req.user && req.user.id !== 'anonymous' ? req.user.id : 'Yard Staff')
            };

            await db.run(INSERT.into('RentalEquipmentTrackingApp.DamagePhotos').entries(photoRecord));

            // 3. Synchronize with Draft tables if parent entity is currently an active Draft
            const formatHanaTimestamp = (d) => (d ? new Date(d) : new Date()).toISOString().slice(0, 19).replace('T', ' ');
            try {
                if (repairBill_ID) {
                    const billDraft = await db.run(SELECT.one.from('BillingService.RepairBills_drafts').where({ ID: repairBill_ID }));
                    const draftUUID = billDraft ? (billDraft.DraftAdministrativeData_DraftUUID || billDraft.DRAFTADMINISTRATIVEDATA_DRAFTUUID) : null;
                    if (billDraft && draftUUID) {
                        const draftEntry = {
                            ID: photoId,
                            repairBill_ID: repairBill_ID,
                            conditionLog_ID: null,
                            damage_ID: null,
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
                        };
                        await db.run(INSERT.into('BillingService.DamagePhotos_drafts').entries(draftEntry))
                            .catch(e => console.warn('[Draft Sync Warning RepairBills]', e.message));

                        // Retroactively sync any active photos for this repair bill into the draft
                        const activePhotos = await db.run(
                            SELECT.from('RentalEquipmentTrackingApp.DamagePhotos')
                                .where({ repairBill_ID: repairBill_ID })
                        ) || [];

                        for (const ap of activePhotos) {
                            if (ap.ID !== photoId) {
                                await db.run(INSERT.into('BillingService.DamagePhotos_drafts').entries({
                                    ID: ap.ID,
                                    repairBill_ID: repairBill_ID,
                                    conditionLog_ID: ap.conditionLog_ID || null,
                                    damage_ID: ap.damage_ID || null,
                                    fileName: ap.fileName,
                                    photoType: ap.photoType || 'Return',
                                    mediaType: ap.mediaType || 'image/jpeg',
                                    mediaUrl: ap.mediaUrl,
                                    publicId: ap.publicId,
                                    sha256: ap.sha256,
                                    latitude: ap.latitude,
                                    longitude: ap.longitude,
                                    uploadedAt: formatHanaTimestamp(ap.uploadedAt),
                                    uploadedBy: ap.uploadedBy || 'Yard Staff',
                                    IsActiveEntity: false,
                                    HasActiveEntity: false,
                                    HasDraftEntity: false,
                                    DraftAdministrativeData_DraftUUID: draftUUID
                                })).catch(() => {});
                            }
                        }

                        console.log(`[API /api/upload-evidence] ✅ Successfully synced photo ${photoId} to BillingService.DamagePhotos_drafts`);
                    }
                }
                if (conditionLog_ID) {
                    const logDraft = await db.run(SELECT.one.from('InspectionService.ConditionLogs_drafts').where({ ID: conditionLog_ID }));
                    const logUUID = logDraft ? (logDraft.DraftAdministrativeData_DraftUUID || logDraft.DRAFTADMINISTRATIVEDATA_DRAFTUUID) : null;
                    if (logDraft && logUUID) {
                        await db.run(INSERT.into('InspectionService.DamagePhotos_drafts').entries({
                            ID: photoId,
                            conditionLog_ID: conditionLog_ID,
                            repairBill_ID: null,
                            damage_ID: null,
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
                            DraftAdministrativeData_DraftUUID: logUUID
                        })).catch(e => console.warn('[Draft Sync Warning ConditionLogs]', e.message));
                    }
                }
                if (damage_ID) {
                    const damageDraft = await db.run(SELECT.one.from('InspectionService.DamageRecords_drafts').where({ ID: damage_ID }));
                    const damageUUID = damageDraft ? (damageDraft.DraftAdministrativeData_DraftUUID || damageDraft.DRAFTADMINISTRATIVEDATA_DRAFTUUID) : null;
                    if (damageDraft && damageUUID) {
                        await db.run(INSERT.into('InspectionService.DamagePhotos_drafts').entries({
                            ID: photoId,
                            damage_ID: damage_ID,
                            conditionLog_ID: null,
                            repairBill_ID: null,
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
                            DraftAdministrativeData_DraftUUID: damageUUID
                        })).catch(e => console.warn('[Draft Sync Warning DamageRecords]', e.message));
                    }
                }
            } catch (draftErr) {
                console.warn('[API /api/upload-evidence] Draft synchronization notice:', draftErr.message);
            }

            console.log(`[API /api/upload-evidence] ✅ Successfully stored photo ${photoId} in Cloudinary! SHA-256: ${uploadResult.sha256.substring(0, 16)}...`);

            return res.json({
                success: true,
                photo: photoRecord,
                isCloudinary: uploadResult.isCloudinary,
                message: 'Evidence photo successfully uploaded to Cloudinary'
            });
        } catch (err) {
            console.error('[API /api/upload-evidence] Error uploading evidence:', err);
            return res.status(500).json({ error: err.message });
        }
    });

    // Cloudinary configuration status check endpoint
    app.get('/api/cloudinary-status', (req, res) => {
        const isConfigured = Boolean(
            process.env.CLOUDINARY_URL || 
            (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY)
        );
        res.json({
            configured: isConfigured,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME || (process.env.CLOUDINARY_URL ? 'Configured via CLOUDINARY_URL' : null)
        });
    });
});

export default cds.server;
