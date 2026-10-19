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
            if (!req.data.technician) req.data.technician = "Mike D'souza";
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
