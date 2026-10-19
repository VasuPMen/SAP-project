using { RentalEquipmentTrackingApp as my } from '../../db/schema';

@path: '/analytics'
@requires: ['Manager', 'Auditor', 'Admin']
service AnalyticsService {

    @readonly
    @restrict: [
        { grant: ['READ'], to: ['Manager', 'Auditor', 'Admin'] }
    ]
    entity FleetOverview as select from my.Equipment {
        ID,
        equipmentNo,
        serialNumber,
        category,
        equipmentName,
        equipmentType,
        currentStatus,
        currentGrade,
        rentalRatePerDay,
        location.locationName as locationName,
        location.plant as plant
    };

    @readonly
    @restrict: [
        { grant: ['READ'], to: ['Manager', 'Auditor', 'Admin'] }
    ]
    entity RentalPerformance as select from my.Rentals {
        ID,
        contractNo,
        rentalDate,
        expectedReturnDate,
        actualReturnDate,
        rentalStatus,
        totalRentalAmount,
        customer.companyName as customerName
    };

    @readonly
    @restrict: [
        { grant: ['READ'], to: ['Manager', 'Auditor', 'Admin'] }
    ]
    entity MaintenanceSummary as select from my.MaintenanceRecords {
        ID,
        maintenanceType,
        maintenanceDate,
        serviceProvider,
        cost,
        status,
        equipment.equipmentName as equipmentName,
        equipment.category as equipmentCategory
    };

    @readonly
    @restrict: [
        { grant: ['READ'], to: ['Manager', 'Auditor', 'Admin'] }
    ]
    entity DamageAnalytics as select from my.DamageRecords {
        ID,
        damageType,
        severity,
        area,
        origin,
        billable,
        repairEstimate,
        damageStatus,
        conditionLog.equipment.equipmentName as equipmentName
    };

    @readonly
    @restrict: [
        { grant: ['READ'], to: ['Manager', 'Auditor', 'Admin'] }
    ]
    entity BillingSummary as select from my.RepairBills {
        ID,
        billDate,
        repairAmount,
        taxAmount,
        totalAmount,
        billingStatus,
        invoiceNo,
        customer.companyName as customerName,
        rental.contractNo as contractNo
    };

    // Executive & Management Dashboard KPI Function
    function getManagementKPIs() returns {
        totalAssets: Integer;
        availableAssets: Integer;
        rentedOutAssets: Integer;
        damagedAssets: Integer;
        totalBilledRevenue: Decimal(12,2);
        pendingApprovalAmount: Decimal(12,2);
        disputedAmount: Decimal(12,2);
        totalMaintenanceCost: Decimal(12,2);
    };
}
