using {RentalEquipmentTrackingApp as my} from '../../db/schema';

@path    : '/billing'
@requires: [
    'BillingClerk',
    'YardWorker',
    'Admin'
]
service BillingService {

    @odata.draft.enabled
    @restrict: [{
        grant: ['*'],
        to   : [
            'BillingClerk',
            'YardWorker',
            'Admin'
        ]
    }]
    entity RepairBills         as projection on my.RepairBills;

    @restrict: [{
        grant: ['*'],
        to   : [
            'BillingClerk',
            'YardWorker',
            'Admin'
        ]
    }]
    entity DamagePhotos        as projection on my.DamagePhotos;

    @readonly
    @restrict: [{
        grant: ['READ'],
        to   : [
            'BillingClerk',
            'YardWorker',
            'Admin'
        ]
    }]
    entity ConditionLogs  as projection on my.ConditionLogs;

    @readonly
    @restrict: [{
        grant: ['READ'],
        to   : [
            'BillingClerk',
            'YardWorker',
            'Admin'
        ]
    }]
    entity Equipment           as projection on my.Equipment;

    @readonly
    @restrict: [{
        grant: ['READ'],
        to   : [
            'BillingClerk',
            'YardWorker',
            'Admin'
        ]
    }]
    entity ContractEquipment   as
        select from my.RentalItems {
            key ID,
                rental,
                equipment,
                equipment.equipmentNo   as equipmentNo,
                equipment.equipmentName as equipmentName,
                equipment.serialNumber  as serialNumber,
                equipment.category      as category,
                equipment.model         as model
        };

    @readonly
    @restrict: [{
        grant: ['READ'],
        to   : [
            'BillingClerk',
            'YardWorker',
            'Admin'
        ]
    }]
    entity DamageRecords       as projection on my.DamageRecords;

    @readonly
    @restrict: [{
        grant: ['READ'],
        to   : [
            'BillingClerk',
            'YardWorker',
            'Admin'
        ]
    }]
    entity Rentals             as projection on my.Rentals;

    @readonly
    @restrict: [{
        grant: ['READ'],
        to   : [
            'BillingClerk',
            'YardWorker',
            'Admin'
        ]
    }]
    entity Customers           as projection on my.Customers;

    @readonly
    @restrict: [{
        grant: ['READ'],
        to   : [
            'BillingClerk',
            'YardWorker',
            'Admin'
        ]
    }]
    entity Severities {
        key code : String(10);
    };

    // Pricing Engine & Billing Approval Workflows

    action calculateDamageCharge(damageId: UUID)     returns RepairBills;

    action approveRepairBill(billId: UUID,
                             approvalReason: String) returns RepairBills;

    action adjustRepairBill(billId: UUID,
                            partsCost: Decimal(12, 2),
                            labourCost: Decimal(12, 2),
                            paintingCost: Decimal(12, 2),
                            reason: String)          returns RepairBills;

    action rejectRepairBill(billId: UUID,
                            reason: String)          returns RepairBills;

    action disputeRepairBill(billId: UUID,
                             reason: String)         returns RepairBills;

    action postInvoice(billId: UUID)                 returns RepairBills;
}
