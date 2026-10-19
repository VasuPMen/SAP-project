using { RentalEquipmentTrackingApp as my } from '../../db/schema';

@path: '/billing'
@requires: ['BillingClerk', 'Manager', 'Admin', 'Auditor']
service BillingService {

    @odata.draft.enabled
    @restrict: [
        { grant: ['READ'], to: ['BillingClerk', 'Manager', 'Admin', 'Auditor'] },
        { grant: ['*'], to: ['BillingClerk', 'Manager', 'Admin'] }
    ]
    entity RepairBills as projection on my.RepairBills;

    @odata.draft.enabled
    @restrict: [
        { grant: ['READ'], to: ['BillingClerk', 'Manager', 'Admin', 'Auditor'] },
        { grant: ['*'], to: ['Manager', 'Admin'] }
    ]
    entity PricingRules as projection on my.PricingRules;

    @readonly
    @restrict: [
        { grant: ['READ'], to: ['BillingClerk', 'Manager', 'Admin', 'Auditor'] }
    ]
    entity DamageRecords as projection on my.DamageRecords;

    @readonly
    @restrict: [
        { grant: ['READ'], to: ['BillingClerk', 'Manager', 'Admin', 'Auditor'] }
    ]
    entity Rentals as projection on my.Rentals;

    @readonly
    @restrict: [
        { grant: ['READ'], to: ['BillingClerk', 'Manager', 'Admin', 'Auditor'] }
    ]
    entity Customers as projection on my.Customers;

    @restrict: [
        { grant: ['READ'], to: ['BillingClerk', 'Manager', 'Admin', 'Auditor'] },
        { grant: ['*'], to: ['Admin'] }
    ]
    entity IntegrationMessages as projection on my.IntegrationMessages;

    // Pricing Engine & Billing Approval Workflows
    action calculateDamageCharge(damageId: UUID) returns RepairBills;
    action approveRepairBill(billId: UUID, approvalReason: String) returns RepairBills;
    action adjustRepairBill(billId: UUID, partsCost: Decimal(12,2), labourCost: Decimal(12,2), paintingCost: Decimal(12,2), reason: String) returns RepairBills;
    action rejectRepairBill(billId: UUID, reason: String) returns RepairBills;
    action disputeRepairBill(billId: UUID, reason: String) returns RepairBills;
    action postInvoice(billId: UUID) returns RepairBills;
    action retryMessage(messageId: UUID) returns IntegrationMessages;
}
