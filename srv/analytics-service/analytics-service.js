import cds from '@sap/cds';

export default class AnalyticsService extends cds.ApplicationService {
    async init() {
        this.on('getManagementKPIs', async () => {
            const db = await cds.connect.to('db');
            const { Equipment, RepairBills, MaintenanceRecords } = db.entities('RentalEquipmentTrackingApp');

            const allEq = await db.read(Equipment);
            const totalAssets = allEq.length;
            const availableAssets = allEq.filter(e => e.currentStatus === 'Available').length;
            const rentedOutAssets = allEq.filter(e => e.currentStatus === 'RentedOut').length;
            const damagedAssets = allEq.filter(e => e.currentStatus === 'Damaged' || e.currentStatus === 'Quarantined').length;

            const allBills = await db.read(RepairBills);
            let totalBilledRevenue = 0;
            let pendingApprovalAmount = 0;
            let disputedAmount = 0;

            for (const b of allBills) {
                const total = Number(b.totalAmount || 0);
                if (b.billingStatus === 'Posted' || b.billingStatus === 'Billed' || b.billingStatus === 'Approved') {
                    totalBilledRevenue += total;
                } else if (b.billingStatus === 'PendingApproval') {
                    pendingApprovalAmount += total;
                } else if (b.billingStatus === 'Disputed') {
                    disputedAmount += total;
                }
            }

            const allMaintenance = await db.read(MaintenanceRecords);
            let totalMaintenanceCost = 0;
            for (const m of allMaintenance) {
                totalMaintenanceCost += Number(m.cost || 0);
            }

            return {
                totalAssets,
                availableAssets,
                rentedOutAssets,
                damagedAssets,
                totalBilledRevenue: Number(totalBilledRevenue.toFixed(2)),
                pendingApprovalAmount: Number(pendingApprovalAmount.toFixed(2)),
                disputedAmount: Number(disputedAmount.toFixed(2)),
                totalMaintenanceCost: Number(totalMaintenanceCost.toFixed(2))
            };
        });

        await super.init();
    }
}
