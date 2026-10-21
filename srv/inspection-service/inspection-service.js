import cds from '@sap/cds';

export default class InspectionService extends cds.ApplicationService {
    async init() {
        const { ConditionLogs, DamageRecords, Equipment, AssetStatusHistory } = this.entities;

        // Clean up blank or abandoned inspection drafts
        this.before('READ', 'ConditionLogs', async (req) => {
            // Do not delete drafts on active entity list reads to avoid killing in-flight drafts
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

        // Provide fixed-values dropdown in entries for InspectionTypes and Inspectors
        this.on('READ', 'InspectionTypes', () => [
            { code: 'CheckOut', name: 'Check-Out (Dispatch)' },
            { code: 'CheckIn', name: 'Check-In (Return from Rent)' }
        ]);

        this.on('READ', 'Inspectors', () => [
            { code: 'Ramesh Patel', name: 'Ramesh Patel (Senior Yard Inspector)' },
            { code: 'Kavita Reddy', name: 'Kavita Reddy (Rental Dispatcher)' },
            { code: "Mike D'souza", name: "Mike D'souza (Lead Workshop Technician)" },
            { code: 'Vikram Mehta', name: 'Vikram Mehta (System Administrator)' },
            { code: 'Sanjay Verma', name: 'Sanjay Verma (Operations & Fleet Director)' },
            { code: 'Yard Worker', name: 'Yard Worker (Yard Staff)' }
        ]);

        // Return equipment items linked to rental contracts for cascading value help
        this.on('READ', 'ContractEquipment', async (req) => {
            try {
                const items = await cds.db.run(SELECT.from('RentalEquipmentTrackingApp.RentalItems')) || [];
                const equipments = await cds.db.run(SELECT.from('RentalEquipmentTrackingApp.Equipment')) || [];
                const eqMap = new Map(equipments.map(e => [e.ID, e]));

                let result = items.map(it => {
                    const eq = eqMap.get(it.equipment_ID) || {};
                    return {
                        ID: it.ID,
                        rental_ID: it.rental_ID,
                        equipment_ID: it.equipment_ID,
                        equipmentNo: eq.equipmentNo || '',
                        equipmentName: eq.equipmentName || '',
                        serialNumber: eq.serialNumber || '',
                        currentStatus: eq.currentStatus || '',
                        currentGrade: eq.currentGrade || 'A'
                    };
                });

                // Apply rental_ID filter if passed by cascading value help
                if (req.query?.SELECT?.where) {
                    const whereArr = req.query.SELECT.where;
                    for (let i = 0; i < whereArr.length; i++) {
                        const token = whereArr[i];
                        if (token === 'rental_ID' || token?.ref?.[0] === 'rental_ID') {
                            const val = whereArr[i + 2]?.val || whereArr[i + 2];
                            if (val) {
                                result = result.filter(r => r.rental_ID === val);
                            }
                        }
                    }
                }

                return result;
            } catch (err) {
                console.error('[InspectionService] Error reading ContractEquipment:', err.message);
                return [];
            }
        });

        // Helper: determine the required next inspection type (CheckOut vs CheckIn) for an asset & contract
        const getExpectedNextInspectionType = async (equipment_ID, rental_ID) => {
            if (!equipment_ID) return 'CheckOut';
            let whereClause = { equipment_ID };
            if (rental_ID) {
                whereClause = { equipment_ID, rental_ID };
            }
            const lastLog = await cds.db.run(
                SELECT.one.from(ConditionLogs)
                    .where(whereClause)
                    .orderBy('createdAt desc', 'inspectionDate desc')
            );
            if (!lastLog || lastLog.inspectionType === 'CheckIn' || lastLog.inspectionType === 'Return') {
                return 'CheckOut';
            }
            return 'CheckIn';
        };

        // Value help for equipment on rent
        this.on('READ', 'RentedEquipment', async (req) => {
            const items = await cds.db.run(
                SELECT.from(Equipment)
            );
            return items;
        });

        // Pre-populate sensible defaults on new inspection log drafts
        this.before(['CREATE', 'NEW'], 'ConditionLogs.drafts', async (req) => {
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

            if (!req.data.inspectionType) {
                req.data.inspectionType = await getExpectedNextInspectionType(req.data.equipment_ID, req.data.rental_ID);
            }
        });

        // When Rental Contract or Equipment is changed on draft, cascade selection and suggest inspection type
        this.before(['UPDATE', 'PATCH'], 'ConditionLogs.drafts', async (req) => {
            const draftId = req.data.ID || req.params?.[0]?.ID || req.params?.[0];
            let cur = {};
            if (draftId) {
                cur = await cds.db.run(SELECT.one.from('InspectionService.ConditionLogs.drafts').where({ ID: draftId })) || {};
            }

            // 1. If Rental Contract is selected or changed: filter/cascade equipment
            if (req.data.rental_ID !== undefined) {
                if (req.data.rental_ID) {
                    const rentalItems = await cds.db.run(
                        SELECT.from('RentalEquipmentTrackingApp.RentalItems').where({ rental_ID: req.data.rental_ID })
                    ) || [];
                    const assignedEquipIds = rentalItems.map(item => item.equipment_ID).filter(Boolean);

                    const currentEquipId = req.data.equipment_ID !== undefined ? req.data.equipment_ID : cur.equipment_ID;

                    if (currentEquipId && !assignedEquipIds.includes(currentEquipId)) {
                        req.data.equipment_ID = null;
                    } else if (!currentEquipId && assignedEquipIds.length === 1) {
                        req.data.equipment_ID = assignedEquipIds[0];
                    }
                } else {
                    req.data.equipment_ID = null;
                }
            }

            // 2. Suggest correct next inspection type (CheckOut vs CheckIn) based on contract history
            const eqId = req.data.equipment_ID !== undefined ? req.data.equipment_ID : cur.equipment_ID;
            const rentalId = req.data.rental_ID !== undefined ? req.data.rental_ID : cur.rental_ID;
            if (eqId) {
                const nextType = await getExpectedNextInspectionType(eqId, rentalId);
                req.data.inspectionType = nextType;
            }
        });

        // Strict lifecycle sequence validation: CheckOut -> CheckIn -> CheckOut -> CheckIn per contract
        this.before('SAVE', 'ConditionLogs', async (req) => {
            const { equipment_ID, rental_ID, inspectionType, ID } = req.data;
            if (!equipment_ID) return;

            // Fetch the latest existing inspection log for this equipment (scoped by rental if provided)
            let query = SELECT.from(ConditionLogs)
                .where({ equipment_ID });

            if (rental_ID) {
                query = SELECT.from(ConditionLogs).where({ equipment_ID, rental_ID });
            }

            if (ID) {
                query.and({ ID: { '!=': ID } });
            }

            query.orderBy('createdAt desc', 'inspectionDate desc');
            const previousLogs = await cds.db.run(query);
            const lastLog = previousLogs?.[0];

            if (inspectionType === 'CheckOut') {
                if (lastLog && (lastLog.inspectionType === 'CheckOut' || lastLog.inspectionType === 'Dispatch')) {
                    req.error(
                        400,
                        'This asset is already Checked-Out under this contract. You cannot perform Check-Out again; only Check-In is allowed next.',
                        'inspectionType'
                    );
                }
            } else if (inspectionType === 'CheckIn') {
                if (!lastLog || (lastLog.inspectionType !== 'CheckOut' && lastLog.inspectionType !== 'Dispatch')) {
                    req.error(
                        400,
                        'This asset has not been Checked-Out under this contract yet. You must complete Check-Out before Check-In is allowed.',
                        'inspectionType'
                    );
                }
            }

            // Defensive hook: prevent unique constraint violation on DamagePhotos during ConditionLogs draft activation
            if (ID) {
                try {
                    const draftPhotos = await cds.db.run(
                        SELECT.from('InspectionService.DamagePhotos_drafts').where({ conditionLog_ID: ID })
                    ) || [];
                    for (const p of draftPhotos) {
                        await cds.db.run(
                            DELETE.from('RentalEquipmentTrackingApp.DamagePhotos').where({ ID: p.ID })
                        );
                    }
                } catch (e) {
                    console.warn('[InspectionService] Pre-activation photo cleanup notice:', e.message);
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
