using { RentalEquipmentTrackingApp as my } from '../../db/schema';

@path: '/billing'
@requires: ['BillingClerk', 'Manager', 'Admin', 'Auditor', 'YardWorker', 'Technician', 'Dispatcher']
service BillingService {

    @odata.draft.enabled
    @restrict: [
        { grant: ['READ'], to: ['BillingClerk', 'Manager', 'Admin', 'Auditor', 'YardWorker', 'Technician'] },
        { grant: ['*'], to: ['BillingClerk', 'Manager', 'Admin', 'YardWorker', 'Technician'] }
    ]
    entity RepairBills as projection on my.RepairBills;

    @restrict: [
        { grant: ['READ'], to: ['BillingClerk', 'Manager', 'Admin', 'Auditor', 'YardWorker', 'Technician'] },
        { grant: ['*'], to: ['BillingClerk', 'Manager', 'Admin', 'YardWorker', 'Technician'] }
    ]
    entity DamagePhotos as projection on my.DamagePhotos;

    @readonly
    @restrict: [
        { grant: ['READ'], to: ['BillingClerk', 'Manager', 'Admin', 'Auditor', 'YardWorker', 'Technician'] }
    ]
    entity ConditionLogs as projection on my.ConditionLogs;

    @readonly
    @restrict: [
        { grant: ['READ'], to: ['BillingClerk', 'Manager', 'Admin', 'Auditor', 'YardWorker', 'Technician', 'Dispatcher'] }
    ]
    entity Equipment as projection on my.Equipment;

    @readonly
    @restrict: [
        { grant: ['READ'], to: ['BillingClerk', 'Manager', 'Admin', 'Auditor', 'YardWorker', 'Technician', 'Dispatcher'] }
    ]
    entity ContractEquipment as select from my.RentalItems {
        key ID,
        rental,
        equipment,
        equipment.equipmentNo as equipmentNo,
        equipment.equipmentName as equipmentName,
        equipment.serialNumber as serialNumber,
        equipment.category as category,
        equipment.model as model
    };

    @odata.draft.enabled
    @restrict: [
        { grant: ['READ'], to: ['BillingClerk', 'Manager', 'Admin', 'Auditor'] },
        { grant: ['*'], to: ['Manager', 'Admin'] }
    ]
    entity PricingRules as projection on my.PricingRules;

    @readonly
    @restrict: [
        { grant: ['READ'], to: ['BillingClerk', 'Manager', 'Admin', 'Auditor', 'YardWorker', 'Technician', 'Dispatcher'] }
    ]
    entity DamageRecords as projection on my.DamageRecords;

    @readonly
    @restrict: [
        { grant: ['READ'], to: ['BillingClerk', 'Manager', 'Admin', 'Auditor', 'YardWorker', 'Technician', 'Dispatcher'] }
    ]
    entity Rentals as projection on my.Rentals;

    @readonly
    @restrict: [
        { grant: ['READ'], to: ['BillingClerk', 'Manager', 'Admin', 'Auditor', 'YardWorker', 'Technician', 'Dispatcher'] }
    ]
    entity Customers as projection on my.Customers;

    @restrict: [
        { grant: ['READ'], to: ['BillingClerk', 'Manager', 'Admin', 'Auditor'] },
        { grant: ['*'], to: ['Admin'] }
    ]
    entity IntegrationMessages as projection on my.IntegrationMessages;

    @readonly
    @restrict: [
        { grant: ['READ'], to: ['BillingClerk', 'Manager', 'Admin', 'Auditor', 'YardWorker', 'Technician', 'Dispatcher'] }
    ]
    entity Severities {
        key code : String(10);
    };

    // Pricing Engine & Billing Approval Workflows
    action calculateDamageCharge(damageId: UUID) returns RepairBills;
    action approveRepairBill(billId: UUID, approvalReason: String) returns RepairBills;
    action adjustRepairBill(billId: UUID, partsCost: Decimal(12,2), labourCost: Decimal(12,2), paintingCost: Decimal(12,2), reason: String) returns RepairBills;
    action rejectRepairBill(billId: UUID, reason: String) returns RepairBills;
    action disputeRepairBill(billId: UUID, reason: String) returns RepairBills;
    action postInvoice(billId: UUID) returns RepairBills;
}
