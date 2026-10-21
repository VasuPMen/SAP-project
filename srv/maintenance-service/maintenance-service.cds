using { RentalEquipmentTrackingApp as my } from '../../db/schema';

@path: '/maintenance'
@requires: ['Technician', 'Admin']
service MaintenanceService {

    @odata.draft.enabled
    @restrict: [
        { grant: ['READ'], to: ['Technician', 'Admin'] },
        { grant: ['*'], to: ['Technician', 'Admin'] }
    ]
    entity MaintenanceRecords as projection on my.MaintenanceRecords;

    @odata.draft.enabled
    @restrict: [
        { grant: ['READ'], to: ['Technician', 'Admin'] },
        { grant: ['*'], to: ['Technician', 'Admin'] }
    ]
    entity RepairJobs as projection on my.RepairJobs;

    @restrict: [
        { grant: ['READ'], to: ['Technician', 'Admin'] },
        { grant: ['*'], to: ['Technician', 'Admin'] }
    ]
    entity DamagePhotos as projection on my.DamagePhotos;

    @readonly
    @cds.redirection.target
    @restrict: [
        { grant: ['READ'], to: ['Technician', 'Admin'] }
    ]
    entity Equipment as projection on my.Equipment;

    @readonly
    @restrict: [
        { grant: ['READ'], to: ['Technician', 'Admin'] }
    ]
    entity DamagedEquipment as projection on my.Equipment {
        key ID,
        equipmentNo,
        serialNumber,
        category,
        equipmentName,
        currentStatus,
        currentGrade
    } where currentStatus in ('Damaged', 'InRepair', 'Quarantined');

    @readonly
    @restrict: [
        { grant: ['READ'], to: ['Technician', 'Admin'] }
    ]
    entity DamageRecords as projection on my.DamageRecords;

    // Actions for Workshop & Technician Operations
    action createRepairJob(damageId: UUID, technician: String) returns RepairJobs;
    action completeRepairJob(repairJobId: UUID, labourHours: Decimal(5,2), actualCost: Decimal(12,2), repairDetails: String, afterPhotoUrl: String) returns RepairJobs;
    action completeMaintenanceRecord(recordId: UUID, cost: Decimal(12,2), nextServiceDate: Date) returns MaintenanceRecords;
    action releaseEquipmentToAvailable(equipmentId: UUID, reason: String) returns Equipment;
}
