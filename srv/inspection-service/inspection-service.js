import cds from '@sap/cds';

export default class InspectionService extends cds.ApplicationService {
    async init() {
        const { ConditionLogs, DamageRecords, Equipment, AssetStatusHistory } = this.entities;

        // Clean up blank or abandoned inspection drafts
        this.before('READ', 'ConditionLogs', async (req) => {
            if (!req.params?.length && !req.query?.SELECT?.one) {
                try {
                    await cds.db.run(
                        DELETE.from('InspectionService.ConditionLogs.drafts').where`equipment_ID is null`
                    );
                } catch (e) {}
            }
        });

        // Ensure new damage records drafts start completely blank / unfulfilled for user input
        this.before(['CREATE', 'NEW'], 'DamageRecords.drafts', (req) => {
            req.data.damageType = null;
            req.data.area = null;
            req.data.severity = null;
            req.data.origin = null;
            req.data.billable = false;
            req.data.damageStatus = null;
        });

        // Validation & sensible fallback on save
        this.before('SAVE', 'DamageRecords', (req) => {
            if (!req.data.damageType) {
                req.error(400, 'Damage Type / Classification is mandatory and must be selected', 'damageType');
            }
            if (!req.data.severity) {
                req.error(400, 'Severity is mandatory and must be selected', 'severity');
            }
            if (!req.data.damageStatus) {
                req.data.damageStatus = 'Reported';
            }
        });

        // Ensure immutable inspection cannot be updated if locked
        this.before(['UPDATE', 'DELETE'], 'ConditionLogs', async (req) => {
            const id = req.data.ID || req.params[0]?.ID;
            if (id) {
                const existing = await SELECT.one.from(ConditionLogs).where({ ID: id });
                if (existing?.locked) {
                    return req.error(403, 'This inspection report is locked and cannot be modified.');
                }
            }
        });

        // Provide fixed-values dropdown entries for InspectionTypes and Inspectors
        this.on('READ', 'InspectionTypes', () => [
            { code: 'CheckIn', name: 'Check-In (Return from Rent)' },
            { code: 'CheckOut', name: 'Check-Out (Dispatch)' }
        ]);

        this.on('READ', 'Inspectors', () => [
            { code: 'Ramesh Patel', name: 'Ramesh Patel (Senior Yard Inspector)' },
            { code: 'Kavita Reddy', name: 'Kavita Reddy (Rental Dispatcher)' },
            { code: "Mike D'souza", name: "Mike D'souza (Lead Workshop Technician)" },
            { code: 'Vikram Mehta', name: 'Vikram Mehta (System Administrator)' },
            { code: 'Sanjay Verma', name: 'Sanjay Verma (Operations & Fleet Director)' },
            { code: 'Yard Worker', name: 'Yard Worker (Yard Staff)' }
        ]);

        // Value help for equipment on rent
        this.on('READ', 'RentedEquipment', async (req) => {
            const items = await cds.db.run(
                SELECT.from(Equipment).where({ currentStatus: { in: ['RentedOut', 'ReturnedPendingInspection'] } })
            );
            return items;
        });

        // Pre-populate sensible defaults on new inspection log drafts
        this.before(['CREATE', 'NEW'], 'ConditionLogs.drafts', async (req) => {
            if (!req.data.inspectionType) req.data.inspectionType = 'CheckIn';
            if (!req.data.conditionGrade) req.data.conditionGrade = 'A';
            if (!req.data.inspector) req.data.inspector = 'Ramesh Patel';
            if (!req.data.inspectionDate) req.data.inspectionDate = new Date().toISOString();
            if (!req.data.inspectionStatus) req.data.inspectionStatus = 'Draft';

            if (req.data.equipment_ID && !req.data.rental_ID) {
                const item = await cds.db.run(
                    SELECT.one.from('RentalEquipmentTrackingApp.RentalItems')
                        .where({ equipment_ID: req.data.equipment_ID })
                        .orderBy('createdAt desc')
                );
                if (item?.rental_ID) req.data.rental_ID = item.rental_ID;
            }
        });

        // When equipment is changed on draft, auto-link its active rental contract
        this.before(['UPDATE', 'PATCH'], 'ConditionLogs.drafts', async (req) => {
            if (req.data.equipment_ID) {
                const item = await cds.db.run(
                    SELECT.one.from('RentalEquipmentTrackingApp.RentalItems')
                        .where({ equipment_ID: req.data.equipment_ID })
                        .orderBy('createdAt desc')
                );
                if (item?.rental_ID) {
                    req.data.rental_ID = item.rental_ID;
                }
            }
        });

        // Pre-populate evidence photo type based on parent inspection type
        this.before(['CREATE', 'NEW'], 'DamagePhotos.drafts', async (req) => {
            const logId = req.data.conditionLog_ID || req.params?.find(p => p.ID)?.ID || req.params?.[0]?.ID;
            if (logId) {
                const log = await cds.db.run(
                    SELECT.one.from('InspectionService.ConditionLogs.drafts').where({ ID: logId })
                ) || await cds.db.run(
                    SELECT.one.from(ConditionLogs).where({ ID: logId })
                );
                if (log) {
                    if (log.inspectionType === 'CheckOut') {
                        req.data.photoType = req.data.photoType || 'Dispatch';
                    } else {
                        req.data.photoType = req.data.photoType || 'Return';
                    }
                }
            }
        });

        // After ConditionLogs SAVE: Update Equipment & Rental statuses based on Check-In vs Check-Out
        this.after('SAVE', 'ConditionLogs', async (log, req) => {
            if (!log.equipment_ID) return;

            const eq = await SELECT.one.from(Equipment).where({ ID: log.equipment_ID });
            const damages = await cds.db.run(
                SELECT.from(DamageRecords).where({ conditionLog_ID: log.ID })
            ) || [];

            let newEqStatus = eq?.currentStatus || 'Available';
            const isReturn = log.inspectionType === 'CheckIn' || log.inspectionType === 'Return';
            const isDispatch = log.inspectionType === 'CheckOut';

            if (isReturn) {
                // If damages reported or grade is poor, mark Damaged or Quarantined
                const hasCritical = damages.some(d => d.severity === 'Critical');
                const hasHigh = damages.some(d => d.severity === 'High');

                if (hasCritical || log.conditionGrade === 'D') {
                    newEqStatus = 'Quarantined';
                } else if (hasHigh || damages.length > 0 || log.conditionGrade === 'C') {
                    newEqStatus = 'Damaged';
                } else {
                    // Clean return from rent without damages -> Available
                    newEqStatus = 'Available';
                }

                // If associated with a rental contract, mark returned
                if (log.rental_ID) {
                    await cds.db.run(
                        UPDATE('RentalEquipmentTrackingApp.Rentals').set({
                            rentalStatus: 'Returned',
                            actualReturnDate: new Date().toISOString().split('T')[0]
                        }).where({ ID: log.rental_ID })
                    );
                    await cds.db.run(
                        UPDATE('RentalEquipmentTrackingApp.RentalItems').set({
                            itemStatus: 'Returned'
                        }).where({ rental_ID: log.rental_ID, equipment_ID: log.equipment_ID })
                    );
                }
            } else if (isDispatch) {
                // Check-Out / Dispatch inspection -> Asset is now RentedOut
                newEqStatus = 'RentedOut';

                if (log.rental_ID) {
                    await cds.db.run(
                        UPDATE('RentalEquipmentTrackingApp.Rentals').set({
                            rentalStatus: 'Active'
                        }).where({ ID: log.rental_ID })
                    );
                    await cds.db.run(
                        UPDATE('RentalEquipmentTrackingApp.RentalItems').set({
                            itemStatus: 'OutOnRent'
                        }).where({ rental_ID: log.rental_ID, equipment_ID: log.equipment_ID })
                    );
                }
            }

            // Update equipment operational status, condition grade, and meter reading
            await cds.db.run(
                UPDATE(Equipment).set({
                    currentGrade: log.conditionGrade || eq?.currentGrade,
                    currentStatus: newEqStatus,
                    currentMeterReading: log.meterReading ?? eq?.currentMeterReading
                }).where({ ID: log.equipment_ID })
            );

            // Record status change in AssetStatusHistory
            await cds.db.run(
                INSERT.into(AssetStatusHistory).entries({
                    equipment_ID: log.equipment_ID,
                    oldStatus: eq?.currentStatus,
                    newStatus: newEqStatus,
                    reason: `${log.inspectionType} inspection completed (Grade: ${log.conditionGrade || 'A'}, Status: ${newEqStatus})`
                })
            );
        });

        // Action: Submit Inspection
        this.on('submitInspection', async (req) => {
            const { conditionLogId } = req.data;
            const log = await SELECT.one.from(ConditionLogs).where({ ID: conditionLogId });
            if (!log) return req.error(404, `Condition log ${conditionLogId} not found`);

            const damages = await SELECT.from(DamageRecords).where({ conditionLog_ID: conditionLogId });

            // Update inspection status
            await UPDATE(ConditionLogs).set({
                inspectionStatus: 'Submitted'
            }).where({ ID: conditionLogId });

            // Determine equipment status based on damages and grade
            if (log.equipment_ID) {
                const eq = await SELECT.one.from(Equipment).where({ ID: log.equipment_ID });
                let newEqStatus = 'Available';

                const hasCritical = damages.some(d => d.severity === 'Critical');
                const hasHigh = damages.some(d => d.severity === 'High');

                if (hasCritical || log.conditionGrade === 'D') {
                    newEqStatus = 'Quarantined';
                } else if (hasHigh || damages.length > 0 || log.conditionGrade === 'C') {
                    newEqStatus = 'Damaged';
                }

                await UPDATE(Equipment).set({
                    currentGrade: log.conditionGrade,
                    currentStatus: newEqStatus,
                    currentMeterReading: log.meterReading ?? eq?.currentMeterReading
                }).where({ ID: log.equipment_ID });

                await INSERT.into(AssetStatusHistory).entries({
                    equipment_ID: log.equipment_ID,
                    oldStatus: eq?.currentStatus,
                    newStatus: newEqStatus,
                    reason: `Inspection completed (Grade: ${log.conditionGrade}, Status: ${newEqStatus})`
                });
            }

            return await SELECT.one.from(ConditionLogs).where({ ID: conditionLogId });
        });

        // Action: Lock Inspection (Audit / Legal protection)
        this.on('lockInspection', async (req) => {
            const { conditionLogId } = req.data;
            await UPDATE(ConditionLogs).set({ locked: true }).where({ ID: conditionLogId });
            return await SELECT.one.from(ConditionLogs).where({ ID: conditionLogId });
        });

        // Action: Customer / Yard Acknowledgment
        this.on('acknowledgeInspection', async (req) => {
            const { conditionLogId, signatureUrl } = req.data;
            await UPDATE(ConditionLogs).set({
                customerAck: true,
                signatureUrl: signatureUrl || null
            }).where({ ID: conditionLogId });
            return await SELECT.one.from(ConditionLogs).where({ ID: conditionLogId });
        });

        await super.init();
    }
}
