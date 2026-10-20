import cds from '@sap/cds';

export default class MaintenanceService extends cds.ApplicationService {
    async init() {
        const { MaintenanceRecords, RepairJobs, Equipment, DamageRecords, AssetStatusHistory } = this.entities;

        // Clean up blank or abandoned repair jobs drafts
        this.before('READ', 'RepairJobs', async (req) => {
            if (!req.params?.length && !req.query?.SELECT?.one) {
                try {
                    await cds.db.run(
                        DELETE.from('MaintenanceService.RepairJobs.drafts').where`equipment_ID is null`
                    );
                } catch (e) {}
            }
        });

        // Clean up blank or abandoned maintenance records drafts
        this.before('READ', 'MaintenanceRecords', async (req) => {
            if (!req.params?.length && !req.query?.SELECT?.one) {
                try {
                    await cds.db.run(
                        DELETE.from('MaintenanceService.MaintenanceRecords.drafts').where`equipment_ID is null`
                    );
                } catch (e) {}
            }
        });

        // Defaults on new MaintenanceRecords draft
        this.before(['CREATE', 'NEW'], 'MaintenanceRecords.drafts', async (req) => {
            if (!req.data.status) req.data.status = 'Planned';
            if (!req.data.maintenanceType) req.data.maintenanceType = 'Preventive';
            if (!req.data.maintenanceDate) req.data.maintenanceDate = new Date().toISOString().slice(0, 10);
            if (!req.data.serviceProvider) req.data.serviceProvider = 'In-House Fleet Workshop';
        });

        // Defaults on new RepairJobs draft
        this.before(['CREATE', 'NEW'], 'RepairJobs.drafts', async (req) => {
            if (!req.data.status) req.data.status = 'Open';
        });

        // Value help query for DamagedEquipment: ONLY return equipment requiring repair / damaged
        this.on('READ', 'DamagedEquipment', async (req) => {
            // Find any equipment linked to active / unresolved damage records
            let damagedEqIds = new Set();
            try {
                const damageRecs = await cds.db.run(
                    SELECT.from('RentalEquipmentTrackingApp.DamageRecords as D')
                        .join('RentalEquipmentTrackingApp.ConditionLogs as C').on('D.conditionLog_ID = C.ID')
                        .where`D.damageStatus not in ('Repaired', 'Closed') and C.equipment_ID is not null`
                        .columns('C.equipment_ID as eqId')
                );
                for (const d of damageRecs || []) {
                    if (d.eqId) damagedEqIds.add(d.eqId);
                }
            } catch (e) {}

            const cqn = SELECT.from(Equipment);
            if (req.query.SELECT.columns) cqn.SELECT.columns = req.query.SELECT.columns;
            if (req.query.SELECT.orderBy) cqn.SELECT.orderBy = req.query.SELECT.orderBy;
            if (req.query.SELECT.limit) cqn.SELECT.limit = req.query.SELECT.limit;
            if (req.query.SELECT.count) cqn.SELECT.count = req.query.SELECT.count;
            if (req.query.SELECT.search) cqn.SELECT.search = req.query.SELECT.search;

            const extraIds = Array.from(damagedEqIds);
            if (extraIds.length > 0) {
                if (req.query.SELECT.where) {
                    cqn.where`(currentStatus in ('Damaged', 'InRepair', 'Quarantined') or ID in (${extraIds})) and (${req.query.SELECT.where})`;
                } else {
                    cqn.where`currentStatus in ('Damaged', 'InRepair', 'Quarantined') or ID in (${extraIds})`;
                }
            } else {
                if (req.query.SELECT.where) {
                    cqn.where`currentStatus in ('Damaged', 'InRepair', 'Quarantined') and (${req.query.SELECT.where})`;
                } else {
                    cqn.where({ currentStatus: { in: ['Damaged', 'InRepair', 'Quarantined'] } });
                }
            }

            return await cds.db.run(cqn);
        });

        // When damage record is selected on RepairJobs draft, auto-link its equipment and estimate
        this.before(['UPDATE', 'PATCH'], 'RepairJobs.drafts', async (req) => {
            if (req.data.damage_ID) {
                const damage = await cds.db.run(
                    SELECT.one.from('RentalEquipmentTrackingApp.DamageRecords').where({ ID: req.data.damage_ID })
                );
                if (damage) {
                    if (damage.conditionLog_ID && !req.data.equipment_ID) {
                        const log = await cds.db.run(
                            SELECT.one.from('RentalEquipmentTrackingApp.ConditionLogs').where({ ID: damage.conditionLog_ID })
                        );
                        if (log?.equipment_ID) req.data.equipment_ID = log.equipment_ID;
                    }
                    if (damage.repairEstimate && !req.data.actualCost) {
                        req.data.actualCost = Number(damage.repairEstimate);
                    }
                }
            }
        });

        // After RepairJobs is saved (from UI or API): update equipment status to InRepair and damageStatus
        this.after('SAVE', 'RepairJobs', async (data, req) => {
            const equipmentId = data.equipment_ID;
            const status = data.status || 'Open';

            if (equipmentId) {
                if (status === 'Open' || status === 'InProgress') {
                    const eq = await cds.db.run(SELECT.one.from(Equipment).where({ ID: equipmentId }));
                    await cds.db.run(UPDATE(Equipment).set({ currentStatus: 'InRepair' }).where({ ID: equipmentId }));
                    await cds.db.run(
                        INSERT.into(AssetStatusHistory).entries({
                            equipment_ID: equipmentId,
                            oldStatus: eq?.currentStatus || 'Damaged',
                            newStatus: 'InRepair',
                            reason: `Workshop Repair Job created (${data.technician || 'Technician'})`
                        })
                    );
                    if (data.damage_ID) {
                        await cds.db.run(UPDATE(DamageRecords).set({ damageStatus: 'InRepair' }).where({ ID: data.damage_ID }));
                    }
                } else if (status === 'Completed') {
                    if (data.damage_ID) {
                        await cds.db.run(UPDATE(DamageRecords).set({ damageStatus: 'Repaired' }).where({ ID: data.damage_ID }));
                    }
                    const eq = await cds.db.run(SELECT.one.from(Equipment).where({ ID: equipmentId }));
                    await cds.db.run(UPDATE(Equipment).set({ currentStatus: 'Available', currentGrade: 'B' }).where({ ID: equipmentId }));
                    await cds.db.run(
                        INSERT.into(AssetStatusHistory).entries({
                            equipment_ID: equipmentId,
                            oldStatus: eq?.currentStatus || 'InRepair',
                            newStatus: 'Available',
                            reason: 'Workshop Repair Job completed; asset restored to Available'
                        })
                    );
                }
            }
        });

        // Action: Create / Dispatch Repair Job from Damage Record
        this.on('createRepairJob', async (req) => {
            const { damageId, technician } = req.data;
            const damage = await SELECT.one.from(DamageRecords).where({ ID: damageId });
            if (!damage) return req.error(404, `Damage record ${damageId} not found`);

            // Find equipment from condition log
            const log = await SELECT.one.from('RentalEquipmentTrackingApp.ConditionLogs').where({ ID: damage.conditionLog_ID });
            const equipmentId = log?.equipment_ID;

            const jobId = cds.utils.uuid();
            await INSERT.into(RepairJobs).entries({
                ID: jobId,
                equipment_ID: equipmentId,
                damage_ID: damageId,
                technician: technician || 'Unassigned',
                status: 'InProgress'
            });

            await UPDATE(DamageRecords).set({ damageStatus: 'InRepair' }).where({ ID: damageId });

            if (equipmentId) {
                const eq = await SELECT.one.from(Equipment).where({ ID: equipmentId });
                await UPDATE(Equipment).set({ currentStatus: 'InRepair' }).where({ ID: equipmentId });
                await INSERT.into(AssetStatusHistory).entries({
                    equipment_ID: equipmentId,
                    oldStatus: eq?.currentStatus,
                    newStatus: 'InRepair',
                    reason: `Repair job dispatched to ${technician || 'workshop'}`
                });
            }

            return await SELECT.one.from(RepairJobs).where({ ID: jobId });
        });

        // Action: Complete Repair Job
        this.on('completeRepairJob', async (req) => {
            const { repairJobId, labourHours, actualCost, repairDetails, afterPhotoUrl } = req.data;
            const job = await SELECT.one.from(RepairJobs).where({ ID: repairJobId });
            if (!job) return req.error(404, `Repair job ${repairJobId} not found`);

            await UPDATE(RepairJobs).set({
                labourHours: labourHours ?? job.labourHours,
                actualCost: actualCost ?? job.actualCost,
                repairDetails: repairDetails ?? job.repairDetails,
                afterPhotoUrl: afterPhotoUrl ?? job.afterPhotoUrl,
                status: 'Completed',
                closedAt: new Date().toISOString()
            }).where({ ID: repairJobId });

            if (job.damage_ID) {
                await UPDATE(DamageRecords).set({ damageStatus: 'Repaired' }).where({ ID: job.damage_ID });
            }

            return await SELECT.one.from(RepairJobs).where({ ID: repairJobId });
        });

        // Action: Complete Preventive / Routine Maintenance
        this.on('completeMaintenanceRecord', async (req) => {
            const { recordId, cost, nextServiceDate } = req.data;
            const record = await SELECT.one.from(MaintenanceRecords).where({ ID: recordId });
            if (!record) return req.error(404, `Maintenance record ${recordId} not found`);

            await UPDATE(MaintenanceRecords).set({
                cost: cost ?? record.cost,
                nextMaintenanceDate: nextServiceDate ?? record.nextMaintenanceDate,
                status: 'Completed'
            }).where({ ID: recordId });

            if (record.equipment_ID && nextServiceDate) {
                await UPDATE(Equipment).set({ nextServiceDate: nextServiceDate }).where({ ID: record.equipment_ID });
            }

            return await SELECT.one.from(MaintenanceRecords).where({ ID: recordId });
        });

        // Action: Release Equipment from Repair/Quarantine back to Available
        this.on('releaseEquipmentToAvailable', async (req) => {
            const { equipmentId, reason } = req.data;
            const eq = await SELECT.one.from(Equipment).where({ ID: equipmentId });
            if (!eq) return req.error(404, `Equipment ${equipmentId} not found`);

            await UPDATE(Equipment).set({
                currentStatus: 'Available',
                currentGrade: 'B' // Reset condition grade after repair
            }).where({ ID: equipmentId });

            await INSERT.into(AssetStatusHistory).entries({
                equipment_ID: equipmentId,
                oldStatus: eq.currentStatus,
                newStatus: 'Available',
                reason: reason || 'Released from workshop after repair and inspection'
            });

            return await SELECT.one.from(Equipment).where({ ID: equipmentId });
        });

        await super.init();
    }
}
