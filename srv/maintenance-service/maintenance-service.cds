using { RentalEquipmentTrackingApp as my } from '../../db/schema';

@path: '/maintenance'
@requires: ['Technician', 'Dispatcher', 'Manager', 'Admin', 'Auditor']
service MaintenanceService {

    @odata.draft.enabled
    @restrict: [
        { grant: ['READ'], to: ['Technician', 'Dispatcher', 'Manager', 'Admin', 'Auditor'] },
        { grant: ['*'], to: ['Technician', 'Manager', 'Admin'] }
    ]
    entity MaintenanceRecords as projection on my.MaintenanceRecords;

    @odata.draft.enabled
    @restrict: [
        { grant: ['READ'], to: ['Technician', 'Dispatcher', 'Manager', 'Admin', 'Auditor'] },
        { grant: ['*'], to: ['Technician', 'Manager', 'Admin'] }
    ]
    entity RepairJobs as projection on my.RepairJobs;

    @readonly
    @restrict: [
        { grant: ['READ'], to: ['Technician', 'Dispatcher', 'Manager', 'Admin', 'Auditor'] }
    ]
    entity Equipment as projection on my.Equipment;

    @readonly
    @restrict: [
        { grant: ['READ'], to: ['Technician', 'Dispatcher', 'Manager', 'Admin', 'Auditor'] }
    ]
    entity DamageRecords as projection on my.DamageRecords;

    // Actions for Workshop & Technician Operations
    action createRepairJob(damageId: UUID, technician: String) returns RepairJobs;
    action completeRepairJob(repairJobId: UUID, labourHours: Decimal(5,2), actualCost: Decimal(12,2), repairDetails: String, afterPhotoUrl: String) returns RepairJobs;
    action completeMaintenanceRecord(recordId: UUID, cost: Decimal(12,2), nextServiceDate: Date) returns MaintenanceRecords;
    action releaseEquipmentToAvailable(equipmentId: UUID, reason: String) returns Equipment;
}
