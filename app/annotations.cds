using { RentalService } from '../srv/rental-service/rental-service';
using { InspectionService } from '../srv/inspection-service/inspection-service';
using { MaintenanceService } from '../srv/maintenance-service/maintenance-service';
using { BillingService } from '../srv/billing-service/billing-service';
using { AnalyticsService } from '../srv/analytics-service/analytics-service';

/* ==========================================================================
   0. CUSTOMER MANAGEMENT - MASTER DATA (STEP 1: CUSTOMER CREATION)
   ========================================================================== */

annotate RentalService.Customers with @(
    UI.HeaderInfo: {
        TypeName: 'Customer',
        TypeNamePlural: 'Corporate Customers',
        Title: { Value: companyName },
        Description: { Value: contactPerson }
    },
    UI.SelectionFields: [
        companyName,
        contactPerson,
        email,
        phone,
        address
    ],
    UI.LineItem: [
        { Value: companyName, Label: 'Company / Customer Name' },
        { Value: contactPerson, Label: 'Contact Person' },
        { Value: email, Label: 'Email' },
        { Value: phone, Label: 'Phone' },
        { Value: address, Label: 'Address / City' },
        { Value: createdAt, Label: 'Registered On' }
    ],
    UI.Facets: [
        {
            $Type: 'UI.CollectionFacet',
            ID: 'CustomerGeneralInfo',
            Label: 'Customer Details',
            Facets: [
                {
                    $Type: 'UI.ReferenceFacet',
                    Label: 'Corporate Profile',
                    Target: '@UI.FieldGroup#CustomerProfile'
                },
                {
                    $Type: 'UI.ReferenceFacet',
                    Label: 'Contact Information',
                    Target: '@UI.FieldGroup#ContactInfo'
                }
            ]
        }
    ],
    UI.FieldGroup #CustomerProfile: {
        Data: [
            { Value: companyName, Label: 'Company / Business Name' },
            { Value: contactPerson, Label: 'Authorized Contact Person' },
            { Value: address, Label: 'Office / Yard Address' }
        ]
    },
    UI.FieldGroup #ContactInfo: {
        Data: [
            { Value: email, Label: 'Email Address' },
            { Value: phone, Label: 'Phone / Mobile No' },
            { Value: createdAt, Label: 'Created At' },
            { Value: createdBy, Label: 'Created By' }
        ]
    }
);


/* ==========================================================================
   1. RENTAL SERVICE - FLEET EQUIPMENT & ASSET DETAIL (FR-004, FR-010, FR-020)
   ========================================================================== */

annotate RentalService.Equipment with @(
    UI.HeaderInfo: {
        TypeName: 'Equipment Asset',
        TypeNamePlural: 'Equipment Assets',
        Title: { Value: equipmentName },
        Description: { Value: serialNumber }
    },
    UI.SelectionFields: [
        equipmentNo,
        category,
        equipmentType,
        currentStatus,
        currentGrade,
        location_ID
    ],
    UI.LineItem: [
        { Value: equipmentNo, Label: 'Asset ID' },
        { Value: equipmentName, Label: 'Equipment Name' },
        { Value: category, Label: 'Category' },
        { Value: manufacturer, Label: 'Manufacturer' },
        { Value: model, Label: 'Model' },
        {
            Value: currentStatus,
            Label: 'Status',
            Criticality: (
                currentStatus = 'Available' ? 3 :
                currentStatus = 'RentedOut' ? 2 :
                currentStatus = 'Damaged' ? 1 :
                currentStatus = 'Quarantined' ? 1 :
                currentStatus = 'InRepair' ? 2 : 0
            )
        },
        {
            Value: currentGrade,
            Label: 'Condition Grade',
            Criticality: (
                currentGrade = 'A' ? 3 :
                currentGrade = 'B' ? 2 :
                currentGrade = 'C' ? 2 : 1
            )
        },
        { Value: rentalRatePerDay, Label: 'Daily Rate ($)' },
        { Value: location.locationName, Label: 'Current Location' },
        { Value: nextServiceDate, Label: 'Next Service' }
    ],
    UI.HeaderFacets: [
        {
            $Type: 'UI.ReferenceFacet',
            Target: '@UI.DataPoint#Status'
        },
        {
            $Type: 'UI.ReferenceFacet',
            Target: '@UI.DataPoint#Grade'
        },
        {
            $Type: 'UI.ReferenceFacet',
            Target: '@UI.DataPoint#RentalRate'
        }
    ],
    UI.DataPoint #Status: {
        Value: currentStatus,
        Title: 'Operational Status',
        Criticality: (
            currentStatus = 'Available' ? 3 :
            currentStatus = 'RentedOut' ? 2 :
            currentStatus = 'Damaged' ? 1 : 0
        )
    },
    UI.DataPoint #Grade: {
        Value: currentGrade,
        Title: 'Condition Grade',
        Criticality: (
            currentGrade = 'A' ? 3 :
            currentGrade = 'B' ? 2 : 1
        )
    },
    UI.DataPoint #RentalRate: {
        Value: rentalRatePerDay,
        Title: 'Daily Rate'
    },
    UI.Facets: [
        {
            $Type: 'UI.CollectionFacet',
            ID: 'GeneralInfoFacet',
            Label: 'Asset Overview',
            Facets: [
                {
                    $Type: 'UI.ReferenceFacet',
                    Label: 'Technical Specifications',
                    Target: '@UI.FieldGroup#TechSpecs'
                },
                {
                    $Type: 'UI.ReferenceFacet',
                    Label: 'Yard & Telematics',
                    Target: '@UI.FieldGroup#LocationTelematics'
                }
            ]
        }
    ],
    UI.FieldGroup #TechSpecs: {
        Data: [
            { Value: equipmentNo, Label: 'Asset No' },
            { Value: serialNumber, Label: 'Serial Number' },
            { Value: equipmentName, Label: 'Equipment Name' },
            { Value: rentalRatePerDay, Label: 'Daily Rental Rate ($)' },
            { Value: category, Label: 'Category' },
            { Value: equipmentType, Label: 'Type' },
            { Value: manufacturer, Label: 'Manufacturer' },
            { Value: model, Label: 'Model' },
            { Value: purchaseDate, Label: 'Purchase Date' },
            { Value: currentMeterReading, Label: 'Meter Reading (Hours)' },
            { Value: barcode, Label: 'Barcode / NFC Tag' }
        ]
    },
    UI.FieldGroup #LocationTelematics: {
        Data: [
            { Value: plant, Label: 'Operating Plant' },
            { Value: location_ID, Label: 'Depot Location' },
            { Value: custodian, Label: 'Current Custodian' },
            { Value: latitude, Label: 'GPS Latitude' },
            { Value: longitude, Label: 'GPS Longitude' },
            { Value: nextServiceDate, Label: 'Next Scheduled Service' }
        ]
    }
);

annotate RentalService.Equipment with {
    equipmentNo         @title: 'Asset ID'              @Common.Label: 'Asset ID';
    serialNumber        @title: 'Serial Number'         @Common.Label: 'Serial Number';
    equipmentName       @title: 'Equipment Name'        @Common.Label: 'Equipment Name';
    category            @title: 'Category'              @Common.Label: 'Category';
    equipmentType       @title: 'Equipment Type'        @Common.Label: 'Equipment Type';
    manufacturer        @title: 'Manufacturer'          @Common.Label: 'Manufacturer';
    model               @title: 'Model'                 @Common.Label: 'Model';
    rentalRatePerDay    @title: 'Daily Rental Rate'     @Common.Label: 'Daily Rental Rate';
    currentStatus       @title: 'Operational Status'    @Common.Label: 'Operational Status';
    currentGrade        @title: 'Condition Grade'       @Common.Label: 'Condition Grade';
    currentMeterReading @title: 'Meter Reading (Hours)' @Common.Label: 'Meter Reading (Hours)';
    plant               @title: 'Operating Plant'       @Common.Label: 'Operating Plant';
    location            @title: 'Depot Location'        @Common.Label: 'Depot Location' @Common.ValueList: {
        CollectionPath: 'Locations',
        Parameters: [
            { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: location_ID, ValueListProperty: 'ID' },
            { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'locationName' },
            { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'plant' },
            { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'city' }
        ]
    };
    custodian           @title: 'Current Custodian'     @Common.Label: 'Current Custodian';
    purchaseDate        @title: 'Purchase Date'         @Common.Label: 'Purchase Date';
    barcode             @title: 'Barcode / NFC Tag'     @Common.Label: 'Barcode / NFC Tag';
    latitude            @title: 'GPS Latitude'          @Common.Label: 'GPS Latitude';
    longitude           @title: 'GPS Longitude'         @Common.Label: 'GPS Longitude';
    nextServiceDate     @title: 'Next Service Date'     @Common.Label: 'Next Service Date';
};

annotate RentalService.EquipmentTransfers with @(
    UI.LineItem: [
        { Value: transferDate, Label: 'Transfer Date' },
        { Value: fromLocation.locationName, Label: 'From Location' },
        { Value: toLocation.locationName, Label: 'To Location' },
        { Value: reason, Label: 'Reason for Transfer' }
    ]
);

annotate RentalService.AssetStatusHistory with @(
    UI.LineItem: [
        { Value: changedAt, Label: 'Timestamp' },
        { Value: oldStatus, Label: 'Previous Status' },
        { Value: newStatus, Label: 'New Status' },
        { Value: changedBy, Label: 'Changed By' },
        { Value: reason, Label: 'Audit Reason' }
    ]
);

annotate RentalService.Rentals with @(
    UI.HeaderInfo: {
        TypeName: 'Rental Contract',
        TypeNamePlural: 'Rental Contracts',
        Title: { Value: contractNo },
        Description: { Value: customer_ID }
    },
    Common.SideEffects #ItemsChanged: {
        SourceEntities: [items],
        TargetProperties: ['totalRentalAmount']
    },
    UI.SelectionFields: [
        contractNo,
        rentalStatus,
        customer_ID,
        rentalDate,
        expectedReturnDate
    ],
    UI.LineItem: [
        { Value: contractNo, Label: 'Contract No' },
        { Value: customer.companyName, Label: 'Customer' },
        { Value: rentalDate, Label: 'Start Date' },
        { Value: expectedReturnDate, Label: 'Expected Return' },
        {
            Value: rentalStatus,
            Label: 'Status',
            Criticality: (
                rentalStatus = 'Active' ? 2 :
                rentalStatus = 'Returned' ? 3 :
                rentalStatus = 'Booked' ? 2 :
                rentalStatus = 'Overdue' ? 1 : 0
            )
        },
        { Value: totalRentalAmount, Label: 'Contract Value ($)' }
    ],
    UI.HeaderFacets: [
        {
            $Type: 'UI.ReferenceFacet',
            Target: '@UI.DataPoint#RentalStatus'
        },
        {
            $Type: 'UI.ReferenceFacet',
            Target: '@UI.DataPoint#TotalAmount'
        }
    ],
    UI.DataPoint #RentalStatus: {
        Value: rentalStatus,
        Title: 'Contract Status',
        Criticality: (
            rentalStatus = 'Active' ? 3 :
            rentalStatus = 'Returned' ? 2 :
            rentalStatus = 'Booked' ? 2 :
            rentalStatus = 'Overdue' ? 1 : 0
        )
    },
    UI.DataPoint #TotalAmount: {
        Value: totalRentalAmount,
        Title: 'Total Contract Value ($)'
    },
    UI.Facets: [
        {
            $Type: 'UI.CollectionFacet',
            ID: 'ContractGeneralInfo',
            Label: 'Contract Information',
            Facets: [
                {
                    $Type: 'UI.ReferenceFacet',
                    Label: 'General Details',
                    Target: '@UI.FieldGroup#ContractDetails'
                },
                {
                    $Type: 'UI.ReferenceFacet',
                    Label: 'Rental Period & Schedule',
                    Target: '@UI.FieldGroup#RentalSchedule'
                }
            ]
        },
        {
            $Type: 'UI.ReferenceFacet',
            Label: 'Allocated Equipment Items',
            Target: 'items/@UI.LineItem'
        }
    ],
    UI.FieldGroup #ContractDetails: {
        Data: [
            { Value: contractNo, Label: 'Contract Number' },
            { Value: customer_ID, Label: 'Customer / Client' },
            { Value: rentalStatus, Label: 'Rental Status' },
            { Value: totalRentalAmount, Label: 'Total Rental Value ($)' }
        ]
    },
    UI.FieldGroup #RentalSchedule: {
        Data: [
            { Value: rentalDate, Label: 'Rental Start Date' },
            { Value: expectedReturnDate, Label: 'Expected Return Date' }
        ]
    }
);

annotate RentalService.Rentals with {
    contractNo         @mandatory @readonly @title: 'Contract Number'       @Common.Label: 'Contract Number';
    customer           @title: 'Customer / Client'     @Common.Label: 'Customer / Client' @Common.ValueList: {
        CollectionPath: 'Customers',
        Parameters: [
            { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: customer_ID, ValueListProperty: 'ID' },
            { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'companyName' },
            { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'contactPerson' },
            { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'email' }
        ]
    };
    customer_ID        @title: 'Customer / Client'     @Common.Label: 'Customer / Client' @Common.Text: customer.companyName @Common.TextArrangement: #TextFirst;
    rentalDate         @title: 'Start Date'            @Common.Label: 'Start Date';
    expectedReturnDate @title: 'Expected Return Date'  @Common.Label: 'Expected Return Date';
    actualReturnDate   @title: 'Actual Return Date'    @Common.Label: 'Actual Return Date' @UI.Hidden: true;
    rentalStatus       @title: 'Contract Status'       @Common.Label: 'Contract Status';
    totalRentalAmount  @title: 'Contract Amount ($)'   @Common.Label: 'Contract Amount ($)';
    statusHistory      @UI.Hidden: true;
    conditionLogs      @UI.Hidden: true;
};

annotate RentalService.Customers with {
    companyName   @mandatory @title: 'Company / Business Name' @Common.Label: 'Company / Business Name';
    contactPerson @title: 'Authorized Contact Person'          @Common.Label: 'Authorized Contact Person';
    email         @mandatory @title: 'Email Address'           @Common.Label: 'Email Address' @Communication.IsEmailAddress;
    phone         @mandatory @title: 'Phone / Mobile No'       @Common.Label: 'Phone / Mobile No' @Communication.IsPhoneNumber;
    address       @title: 'Office / Yard Address'              @Common.Label: 'Office / Yard Address';
};

annotate RentalService.RentalStatusHistory with @UI.Hidden: true;

annotate RentalService.RentalItems with @(
    UI.HeaderInfo: {
        TypeName: 'Rental Item',
        TypeNamePlural: 'Rental Items',
        Title: { Value: equipment.equipmentName }
    },
    Common.SideEffects #EquipmentChanged: {
        SourceProperties: [equipment_ID],
        TargetProperties: [
            'dailyRentalRate',
            'startDate',
            'endDate'
        ],
        TargetEntities: [equipment]
    },
    Common.SideEffects #ItemRateOrDatesChanged: {
        SourceProperties: [dailyRentalRate, startDate, endDate],
        TargetEntities: [rental]
    },
    UI.LineItem: [
        { Value: equipment_ID, Label: 'Equipment Asset' },
        {
            $Type: 'UI.DataField',
            Value: equipment.serialNumber,
            Label: 'Serial Number',
            ![@Common.FieldControl]: #ReadOnly
        },
        { Value: dailyRentalRate, Label: 'Daily Rate ($)' },
        { Value: startDate, Label: 'Start Date' },
        { Value: endDate, Label: 'End Date' },
        { Value: itemStatus, Label: 'Item Status' }
    ],
    UI.Facets: [
        {
            $Type: 'UI.ReferenceFacet',
            Label: 'Item Details',
            Target: '@UI.FieldGroup#ItemDetails'
        }
    ],
    UI.FieldGroup #ItemDetails: {
        Data: [
            { Value: equipment_ID, Label: 'Equipment Asset' },
            { Value: dailyRentalRate, Label: 'Daily Rental Rate ($)' },
            { Value: startDate, Label: 'Start Date' },
            { Value: endDate, Label: 'End Date' },
            { Value: itemStatus, Label: 'Item Status' }
        ]
    }
);

annotate RentalService.RentalItems with {
    equipment       @title: 'Equipment'        @Common.Label: 'Equipment' @Common.ValueList: {
        CollectionPath: 'AvailableEquipment',
        Parameters: [
            { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: equipment_ID, ValueListProperty: 'ID' },
            { $Type: 'Common.ValueListParameterOut', LocalDataProperty: dailyRentalRate, ValueListProperty: 'rentalRatePerDay' },
            { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'equipmentName' },
            { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'serialNumber' },
            { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'currentStatus' },
            { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'rentalRatePerDay' }
        ]
    };
    equipment_ID    @Common.Text: equipment.equipmentName @Common.TextArrangement: #TextFirst;
    dailyRentalRate @title: 'Daily Rate ($)'   @Common.Label: 'Daily Rate ($)';
    startDate       @title: 'Start Date'       @Common.Label: 'Start Date';
    endDate         @title: 'End Date'         @Common.Label: 'End Date';
    itemStatus      @title: 'Item Status'      @Common.Label: 'Item Status';
};

annotate RentalService.AvailableEquipment with {
    equipmentName    @title: 'Equipment Name'     @Common.Label: 'Equipment Name';
    serialNumber     @title: 'Serial Number'      @Common.Label: 'Serial Number';
    currentStatus    @title: 'Operational Status' @Common.Label: 'Operational Status';
    rentalRatePerDay @title: 'Daily Rental Rate'  @Common.Label: 'Daily Rental Rate';
    category         @title: 'Category'           @Common.Label: 'Category';
    manufacturer     @title: 'Manufacturer'       @Common.Label: 'Manufacturer';
    model            @title: 'Model'              @Common.Label: 'Model';
};

/* ==========================================================================
   2. BILLING SERVICE - DAMAGE CHARGE APPROVAL (FR-007, FR-021, FR-025)
   ========================================================================== */

annotate BillingService.RepairBills with @(
    UI.HeaderInfo: {
        TypeName: 'Repair Bill',
        TypeNamePlural: 'Repair Bills & Damage Charges',
        Title: { Value: invoiceNo },
        Description: { Value: customer.companyName }
    },
    UI.SelectionFields: [
        billingStatus,
        customer_ID,
        billDate,
        rental_ID
    ],
    UI.LineItem: [
        { Value: invoiceNo, Label: 'Invoice / Doc Ref' },
        { Value: customer.companyName, Label: 'Customer' },
        { Value: rental.contractNo, Label: 'Contract No' },
        { Value: damage.damageType, Label: 'Damage Type' },
        { Value: billDate, Label: 'Bill Date' },
        { Value: partsCost, Label: 'Parts ($)' },
        { Value: labourCost, Label: 'Labour ($)' },
        { Value: paintingCost, Label: 'Painting ($)' },
        { Value: repairAmount, Label: 'Subtotal ($)' },
        { Value: taxAmount, Label: 'Tax ($)' },
        { Value: totalAmount, Label: 'Total Charge ($)' },
        {
            Value: billingStatus,
            Label: 'Billing Status',
            Criticality: (
                billingStatus = 'Approved' ? 3 :
                billingStatus = 'Posted' ? 3 :
                billingStatus = 'PendingApproval' ? 2 :
                billingStatus = 'Disputed' ? 1 :
                billingStatus = 'Rejected' ? 1 : 0
            )
        },
        { Value: approvalReason, Label: 'Approval / Dispute Notes' }
    ],
    UI.HeaderFacets: [
        {
            $Type: 'UI.ReferenceFacet',
            Target: '@UI.DataPoint#BillStatus'
        },
        {
            $Type: 'UI.ReferenceFacet',
            Target: '@UI.DataPoint#TotalBill'
        }
    ],
    UI.DataPoint #BillStatus: {
        Value: billingStatus,
        Title: 'Approval Status',
        Criticality: (
            billingStatus = 'Approved' ? 3 :
            billingStatus = 'PendingApproval' ? 2 : 1
        )
    },
    UI.DataPoint #TotalBill: {
        Value: totalAmount,
        Title: 'Total Invoice Amount'
    },
    UI.Facets: [
        {
            $Type: 'UI.ReferenceFacet',
            Label: 'Cost Breakdown & Liability',
            Target: '@UI.FieldGroup#BillDetails'
        }
    ],
    Common.SideEffects #DamageSelect: {
        SourceProperties: [ damage_ID ],
        TargetProperties: [ customer_ID, rental_ID, partsCost, labourCost, paintingCost, repairAmount, taxAmount, totalAmount ]
    },
    UI.FieldGroup #BillDetails: {
        Data: [
            { Value: invoiceNo, Label: 'Invoice No' },
            { Value: customer_ID, Label: 'Customer' },
            { Value: rental_ID, Label: 'Rental Contract' },
            { Value: damage_ID, Label: 'Damage Record Reference' },
            { Value: billDate, Label: 'Bill Date' },
            { Value: partsCost, Label: 'Parts Cost ($)' },
            { Value: labourCost, Label: 'Labour Cost ($)' },
            { Value: paintingCost, Label: 'Painting Cost ($)' },
            { Value: repairAmount, Label: 'Net Repair Amount ($)' },
            { Value: taxAmount, Label: 'Tax Amount ($)' },
            { Value: totalAmount, Label: 'Gross Total ($)' },
            { Value: billingStatus, Label: 'Status' },
            { Value: approvalReason, Label: 'Approval Notes' }
        ]
    }
);

annotate BillingService.RepairBills with {
    invoiceNo      @title: 'Invoice Number'           @Common.Label: 'Invoice Number' @readonly;
    customer       @title: 'Customer / Client'        @Common.Label: 'Customer / Client'
                   @Common.Text: customer.companyName @Common.TextArrangement: #TextFirst
                   @Common.ValueList: {
                       CollectionPath: 'Customers',
                       Parameters: [
                           { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: customer_ID, ValueListProperty: 'ID' },
                           { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'companyName' },
                           { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'contactPerson' }
                       ]
                   };
    rental         @title: 'Rental Contract'          @Common.Label: 'Rental Contract'
                   @Common.Text: rental.contractNo    @Common.TextArrangement: #TextFirst
                   @Common.ValueList: {
                       CollectionPath: 'Rentals',
                       Parameters: [
                           { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: rental_ID, ValueListProperty: 'ID' },
                           { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'contractNo' },
                           { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'rentalStatus' }
                       ]
                   };
    damage         @title: 'Damage Record Reference'  @Common.Label: 'Damage Record Reference'
                   @Common.ValueList: {
                       CollectionPath: 'DamageRecords',
                       Parameters: [
                           { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: damage_ID, ValueListProperty: 'ID' },
                           { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'damageType' },
                           { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'area' },
                           { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'repairEstimate' }
                       ]
                   };
    billDate       @title: 'Bill Date'                @Common.Label: 'Bill Date';
    partsCost      @title: 'Parts Cost ($)'           @Common.Label: 'Parts Cost ($)';
    labourCost     @title: 'Labour Cost ($)'          @Common.Label: 'Labour Cost ($)';
    paintingCost   @title: 'Painting Cost ($)'        @Common.Label: 'Painting Cost ($)';
    repairAmount   @title: 'Net Repair Amount ($)'    @Common.Label: 'Net Repair Amount ($)';
    taxAmount      @title: 'Tax Amount ($)'           @Common.Label: 'Tax Amount ($)';
    totalAmount    @title: 'Gross Total ($)'          @Common.Label: 'Gross Total ($)';
    billingStatus  @title: 'Approval Status'          @Common.Label: 'Approval Status';
    approvalReason @title: 'Approval Notes'           @Common.Label: 'Approval Notes';
};



/* ==========================================================================
   3. INSPECTION SERVICE - RETURN INSPECTIONS & EVIDENCE (FR-005, FR-014, FR-018)
   ========================================================================== */

// Section 3 annotations merged with Section 9 below

annotate InspectionService.DamageRecords with @(
    UI.LineItem: [
        { Value: area, Label: 'Area / Component' },
        { Value: damageType, Label: 'Damage Type' },
        {
            Value: severity,
            Label: 'Severity',
            Criticality: (
                severity = 'Critical' ? 1 :
                severity = 'High' ? 1 :
                severity = 'Medium' ? 2 : 3
            )
        },
        { Value: origin, Label: 'Origin (New/Pre-existing)' },
        { Value: repairEstimate, Label: 'Estimate ($)' },
        { Value: customerLiable, Label: 'Customer Liable' },
        {
            Value: damageStatus,
            Label: 'Resolution Status',
            Criticality: (
                damageStatus = 'Repaired' ? 3 :
                damageStatus = 'Billed' ? 3 :
                damageStatus = 'InRepair' ? 2 : 1
            )
        },
        { Value: description, Label: 'Description' }
    ]
);

annotate InspectionService.DamagePhotos with @(
    UI.LineItem: [
        { Value: fileName, Label: 'Photo File' },
        { Value: photoType, Label: 'Evidence Type' },
        { Value: mediaUrl, Label: 'Photo Preview / URL' },
        { Value: sha256, Label: 'SHA-256 Tamper Hash' },
        { Value: latitude, Label: 'GPS Lat' },
        { Value: longitude, Label: 'GPS Long' },
        { Value: uploadedBy, Label: 'Uploaded By' }
    ]
);

/* ==========================================================================
   4. MAINTENANCE SERVICE - WORKSHOP & REPAIRS (FR-012, FR-013)
   ========================================================================== */

annotate MaintenanceService.RepairJobs with @(
    UI.HeaderInfo: {
        TypeName: 'Workshop Repair Job',
        TypeNamePlural: 'Workshop Repair Jobs',
        Title: { Value: equipment_ID },
        Description: { Value: status }
    },
    UI.SelectionFields: [
        status,
        technician,
        equipment_ID
    ],
    UI.LineItem: [
        { Value: equipment.equipmentName, Label: 'Asset' },
        { Value: equipment.serialNumber, Label: 'Serial' },
        { Value: technician, Label: 'Assigned Technician' },
        { Value: labourHours, Label: 'Actual Hours' },
        { Value: actualCost, Label: 'Actual Repair Cost ($)' },
        {
            Value: status,
            Label: 'Status',
            Criticality: (
                status = 'Completed' ? 3 :
                status = 'InProgress' ? 2 : 1
            )
        },
        { Value: repairDetails, Label: 'Work Performed Details' },
        { Value: beforePhotoUrl, Label: 'Before Photo' },
        { Value: afterPhotoUrl, Label: 'After Photo' },
        { Value: closedAt, Label: 'Completed At' }
    ],
    UI.Facets: [
        {
            $Type: 'UI.ReferenceFacet',
            Label: 'Repair Job Specifications',
            Target: '@UI.FieldGroup#RepairDetails'
        }
    ],
    Common.SideEffects #DamageSelected: {
        SourceProperties: [ damage_ID ],
        TargetProperties: [ equipment_ID, actualCost ]
    },
    UI.FieldGroup #RepairDetails: {
        Data: [
            { Value: equipment_ID, Label: 'Equipment Asset' },
            { Value: damage_ID, Label: 'Damage Reference' },
            { Value: technician, Label: 'Lead Technician' },
            { Value: labourHours, Label: 'Labour Hours' },
            { Value: actualCost, Label: 'Material & Labor Cost ($)' },
            { Value: status, Label: 'Job Status' },
            { Value: repairDetails, Label: 'Technician Work Log' },
            { Value: beforePhotoUrl, Label: 'Pre-Repair Photo URL' },
            { Value: afterPhotoUrl, Label: 'Post-Repair Evidence URL' },
            { Value: closedAt, Label: 'Completion Timestamp' }
        ]
    }
);

annotate MaintenanceService.RepairJobs with {
    equipment      @title: 'Equipment Asset'          @Common.Label: 'Equipment Asset'
                   @Common.Text: equipment.equipmentName @Common.TextArrangement: #TextFirst
                   @Common.ValueList: {
                       CollectionPath: 'Equipment',
                       Parameters: [
                           { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: equipment_ID, ValueListProperty: 'ID' },
                           { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'equipmentName' },
                           { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'serialNumber' },
                           { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'currentStatus' }
                       ]
                   };
    damage         @title: 'Damage Reference'         @Common.Label: 'Damage Reference'
                   @Common.ValueList: {
                       CollectionPath: 'DamageRecords',
                       Parameters: [
                           { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: damage_ID, ValueListProperty: 'ID' },
                           { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'damageType' },
                           { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'area' },
                           { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'severity' }
                       ]
                   };
    technician     @title: 'Lead Technician'          @Common.Label: 'Lead Technician';
    labourHours    @title: 'Labour Hours'             @Common.Label: 'Labour Hours';
    actualCost     @title: 'Material & Labor Cost ($)' @Common.Label: 'Material & Labor Cost ($)';
    status         @title: 'Job Status'               @Common.Label: 'Job Status';
    repairDetails  @title: 'Technician Work Log'      @Common.Label: 'Technician Work Log';
    beforePhotoUrl @title: 'Pre-Repair Photo URL'     @Common.Label: 'Pre-Repair Photo URL';
    afterPhotoUrl  @title: 'Post-Repair Evidence URL' @Common.Label: 'Post-Repair Evidence URL';
    closedAt       @title: 'Completion Timestamp'     @Common.Label: 'Completion Timestamp';
};

annotate MaintenanceService.MaintenanceRecords with @(
    UI.HeaderInfo: {
        TypeName: 'Maintenance Record',
        TypeNamePlural: 'Maintenance Records',
        Title: { Value: equipment_ID },
        Description: { Value: maintenanceType }
    },
    UI.SelectionFields: [
        maintenanceType,
        status,
        equipment_ID,
        maintenanceDate,
        nextMaintenanceDate
    ],
    UI.LineItem: [
        { Value: equipment.equipmentName, Label: 'Asset' },
        { Value: maintenanceType, Label: 'Service Type' },
        { Value: maintenanceDate, Label: 'Service Date' },
        { Value: serviceProvider, Label: 'Service Provider' },
        { Value: cost, Label: 'Cost ($)' },
        {
            Value: status,
            Label: 'Status',
            Criticality: (
                status = 'Completed' ? 3 :
                status = 'InProgress' ? 2 : 1
            )
        },
        { Value: nextMaintenanceDate, Label: 'Next Due Date' },
        { Value: description, Label: 'Work Summary' }
    ],
    UI.Facets: [
        {
            $Type: 'UI.ReferenceFacet',
            Label: 'Maintenance Specifications & Planning',
            Target: '@UI.FieldGroup#MaintenanceDetails'
        }
    ],
    UI.FieldGroup #MaintenanceDetails: {
        Data: [
            { Value: equipment_ID, Label: 'Equipment Asset' },
            { Value: maintenanceType, Label: 'Maintenance Type' },
            { Value: status, Label: 'Maintenance Status' },
            { Value: maintenanceDate, Label: 'Service Date' },
            { Value: nextMaintenanceDate, Label: 'Next Due Date' },
            { Value: serviceProvider, Label: 'Service Provider / Workshop' },
            { Value: cost, Label: 'Estimated Service Cost ($)' },
            { Value: description, Label: 'Scope of Work / Description' }
        ]
    }
);

annotate MaintenanceService.MaintenanceRecords with {
    equipment           @title: 'Equipment Asset'              @Common.Label: 'Equipment Asset'
                        @Common.Text: equipment.equipmentName  @Common.TextArrangement: #TextFirst
                        @Common.ValueList: {
                            CollectionPath: 'Equipment',
                            Parameters: [
                                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: equipment_ID, ValueListProperty: 'ID' },
                                { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'equipmentName' },
                                { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'serialNumber' },
                                { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'currentStatus' }
                            ]
                        };
    maintenanceType     @title: 'Maintenance Type'             @Common.Label: 'Maintenance Type'
                        @Common.ValueListWithFixedValues;
    status              @title: 'Maintenance Status'           @Common.Label: 'Maintenance Status'
                        @Common.ValueListWithFixedValues;
    maintenanceDate     @title: 'Service Date'                 @Common.Label: 'Service Date';
    nextMaintenanceDate @title: 'Next Due Date'                @Common.Label: 'Next Due Date';
    serviceProvider     @title: 'Service Provider / Workshop'  @Common.Label: 'Service Provider / Workshop';
    cost                @title: 'Estimated Service Cost ($)'   @Common.Label: 'Estimated Service Cost ($)';
    description         @title: 'Scope of Work / Description'  @Common.Label: 'Scope of Work / Description';
};

/* ==========================================================================
   5. ANALYTICS SERVICE - MANAGEMENT DASHBOARD (FR-022 to FR-025)
   ========================================================================== */

annotate AnalyticsService.FleetOverview with @(
    UI.HeaderInfo: {
        TypeName: 'Fleet Asset',
        TypeNamePlural: 'Fleet Overview & Utilization',
        Title: { Value: equipmentName },
        Description: { Value: category }
    },
    UI.SelectionFields: [
        category,
        currentStatus,
        currentGrade,
        plant
    ],
    UI.LineItem: [
        { Value: equipmentNo, Label: 'Asset ID' },
        { Value: equipmentName, Label: 'Equipment Name' },
        { Value: category, Label: 'Category' },
        { Value: equipmentType, Label: 'Type' },
        {
            Value: currentStatus,
            Label: 'Status',
            Criticality: (
                currentStatus = 'Available' ? 3 :
                currentStatus = 'RentedOut' ? 2 :
                currentStatus = 'Damaged' ? 1 : 1
            )
        },
        {
            Value: currentGrade,
            Label: 'Grade',
            Criticality: (
                currentGrade = 'A' ? 3 :
                currentGrade = 'B' ? 2 : 1
            )
        },
        { Value: rentalRatePerDay, Label: 'Daily Rate ($)' },
        { Value: locationName, Label: 'Location' },
        { Value: plant, Label: 'Plant' }
    ]
);

annotate AnalyticsService.BillingSummary with @(
    UI.HeaderInfo: {
        TypeName: 'Billing Analysis',
        TypeNamePlural: 'Billing & Recovery Analysis',
        Title: { Value: invoiceNo },
        Description: { Value: customerName }
    },
    UI.SelectionFields: [
        billingStatus,
        customerName,
        billDate
    ],
    UI.LineItem: [
        { Value: invoiceNo, Label: 'Invoice No' },
        { Value: customerName, Label: 'Customer' },
        { Value: contractNo, Label: 'Contract No' },
        { Value: billDate, Label: 'Date' },
        { Value: repairAmount, Label: 'Net Amount ($)' },
        { Value: taxAmount, Label: 'Tax ($)' },
        { Value: totalAmount, Label: 'Total Invoiced ($)' },
        {
            Value: billingStatus,
            Label: 'Status',
            Criticality: (
                billingStatus = 'Posted' ? 3 :
                billingStatus = 'Approved' ? 3 :
                billingStatus = 'PendingApproval' ? 2 : 1
            )
        }
    ]
);

/* ==========================================================================
   6. CONFIGURATION - PRICING & DAMAGE RULES (FR-011)
   ========================================================================== */

annotate BillingService.PricingRules with @(
    UI.HeaderInfo: {
        TypeName: 'Pricing Rule',
        TypeNamePlural: 'Pricing & Damage Rules',
        Title: { Value: damageType },
        Description: { Value: severity }
    },
    UI.SelectionFields: [
        damageType,
        severity
    ],
    UI.LineItem: [
        { Value: damageType, Label: 'Damage Category' },
        {
            Value: severity,
            Label: 'Severity',
            Criticality: (
                severity = 'Critical' ? 1 :
                severity = 'High' ? 1 :
                severity = 'Medium' ? 2 : 3
            )
        },
        { Value: baseCharge, Label: 'Base Diagnostic Fee ($)' },
        { Value: partsCharge, Label: 'Standard Parts ($)' },
        { Value: labourRate, Label: 'Labour Rate ($/hr)' },
        { Value: paintingCharge, Label: 'Painting Surcharge ($)' },
        { Value: taxPercent, Label: 'Tax %' },
        { Value: autoApproveLimit, Label: 'Auto-Approve Threshold ($)' }
    ],
    UI.Facets: [
        {
            $Type: 'UI.ReferenceFacet',
            Label: 'Pricing Rule Details',
            Target: '@UI.FieldGroup#RuleDetails'
        }
    ],
    UI.FieldGroup#RuleDetails: {
        Data: [
            { Value: damageType, Label: 'Damage Category' },
            { Value: severity, Label: 'Severity Level' },
            { Value: baseCharge, Label: 'Base Diagnostic Fee ($)' },
            { Value: partsCharge, Label: 'Standard Parts Cost ($)' },
            { Value: labourRate, Label: 'Labour Rate ($/hr)' },
            { Value: paintingCharge, Label: 'Painting Surcharge ($)' },
            { Value: taxPercent, Label: 'Tax Percentage (%)' },
            { Value: autoApproveLimit, Label: 'Auto-Approve Threshold ($)' }
        ]
    }
);

annotate BillingService.PricingRules with {
    damageType       @title: 'Damage Category'            @Common.Label: 'Damage Category';
    severity         @title: 'Severity Level'             @Common.Label: 'Severity Level'
                     @Common.ValueListWithFixedValues;
    baseCharge       @title: 'Base Diagnostic Fee ($)'    @Common.Label: 'Base Diagnostic Fee ($)';
    partsCharge      @title: 'Standard Parts Cost ($)'    @Common.Label: 'Standard Parts Cost ($)';
    labourRate       @title: 'Labour Rate ($/hr)'         @Common.Label: 'Labour Rate ($/hr)';
    paintingCharge   @title: 'Painting Surcharge ($)'     @Common.Label: 'Painting Surcharge ($)';
    taxPercent       @title: 'Tax Percentage (%)'         @Common.Label: 'Tax Percentage (%)';
    autoApproveLimit @title: 'Auto-Approve Threshold ($)' @Common.Label: 'Auto-Approve Threshold ($)';
};

/* ==========================================================================
   7. INTEGRATION MONITOR - OUTBOX & S/4HANA SYNC (FR-015, FR-016)
   ========================================================================== */

annotate BillingService.IntegrationMessages with @(
    UI.HeaderInfo: {
        TypeName: 'Outbox Message',
        TypeNamePlural: 'Integration & Outbox Messages',
        Title: { Value: messageType },
        Description: { Value: reference }
    },
    UI.SelectionFields: [
        messageType,
        targetSystem,
        status,
        billingDocument
    ],
    UI.LineItem: [
        { Value: messageType, Label: 'Message Type' },
        { Value: reference, Label: 'Reference (Contract)' },
        { Value: targetSystem, Label: 'Target System' },
        { Value: billingDocument, Label: 'Billing Document' },
        {
            Value: status,
            Label: 'Sync Status',
            Criticality: (
                status = 'Success' ? 3 :
                status = 'Pending' ? 2 : 1
            )
        },
        { Value: retryCount, Label: 'Retry Count' },
        { Value: lastAttemptAt, Label: 'Last Synced' },
        { Value: errorMessage, Label: 'Error Details' }
    ],
    UI.Facets: [
        {
            $Type: 'UI.ReferenceFacet',
            Label: 'Integration Payload & Audit',
            Target: '@UI.FieldGroup#MessagePayload'
        }
    ],
    UI.FieldGroup#MessagePayload: {
        Data: [
            { Value: messageType, Label: 'Message Type' },
            { Value: reference, Label: 'Reference' },
            { Value: targetSystem, Label: 'Target Backend' },
            { Value: billingDocument, Label: 'Document Number' },
            { Value: status, Label: 'Status' },
            { Value: retryCount, Label: 'Retry Attempts' },
            { Value: lastAttemptAt, Label: 'Timestamp' },
            { Value: payload, Label: 'Payload (JSON)' },
            { Value: errorMessage, Label: 'Error Message' }
        ]
    }
);

/* ==========================================================================
   8. LOCATIONS & YARDS - MASTER DATA (FR-004, FR-020)
   ========================================================================== */

annotate RentalService.Locations with @(
    Capabilities.NavigationRestrictions: {
        RestrictedProperties: [
            {
                NavigationProperty: equipment,
                InsertRestrictions: { Insertable: false },
                UpdateRestrictions: { Updatable: false },
                DeleteRestrictions: { Deletable: false }
            }
        ]
    },
    UI.Identification: [
        {
            $Type: 'UI.DataFieldForAction',
            Action: 'RentalService.assignEquipment',
            Label: 'Assign Equipment'
        }
    ],
    UI.HeaderInfo: {
        TypeName: 'Depot Location',
        TypeNamePlural: 'Yard & Depot Locations',
        Title: { Value: locationName },
        Description: { Value: plant }
    },
    UI.SelectionFields: [
        locationName,
        locationType,
        plant,
        city
    ],
    UI.LineItem: [
        { Value: locationName, Label: 'Depot / Location Name' },
        { Value: locationType, Label: 'Location Type' },
        { Value: plant, Label: 'SAP Plant Code' },
        { Value: address, Label: 'Street Address' },
        { Value: city, Label: 'City' },
        { Value: latitude, Label: 'Latitude' },
        { Value: longitude, Label: 'Longitude' }
    ],
    UI.Facets: [
        {
            $Type: 'UI.ReferenceFacet',
            Label: 'Depot Details',
            Target: '@UI.FieldGroup#LocationInfo'
        },
        {
            $Type: 'UI.ReferenceFacet',
            Label: 'Stationed Equipment Fleet',
            Target: 'equipment/@UI.LineItem',
            ![@UI.Hidden]: {$edmJson: {$Not: {$Path: 'IsActiveEntity'}}}
        }
    ],
    UI.FieldGroup #LocationInfo: {
        Data: [
            { Value: locationName, Label: 'Location Name' },
            { Value: locationType, Label: 'Location Type' },
            { Value: plant, Label: 'Operating Plant' },
            { Value: address, Label: 'Full Address' },
            { Value: city, Label: 'City' },
            { Value: latitude, Label: 'GPS Latitude' },
            { Value: longitude, Label: 'GPS Longitude' }
        ]
    }
);

annotate RentalService.Locations with {
    locationName @mandatory @title: 'Depot / Location Name' @Common.Label: 'Depot / Location Name';
    locationType @title: 'Location Type'                   @Common.Label: 'Location Type';
    plant        @mandatory @title: 'SAP Plant Code'        @Common.Label: 'SAP Plant Code';
    address      @title: 'Street Address'                  @Common.Label: 'Street Address';
    city         @title: 'City'                            @Common.Label: 'City';
    latitude     @title: 'GPS Latitude'                    @Common.Label: 'GPS Latitude';
    longitude    @title: 'GPS Longitude'                   @Common.Label: 'GPS Longitude';
    equipment    @readonly;
};

/* ==========================================================================
   9. INSPECTION SERVICE - CONDITION LOGS & INSPECTIONS (FR-005, FR-006)
   ========================================================================== */

annotate InspectionService.ConditionLogs with @(
    UI.HeaderInfo: {
        TypeName: 'Inspection Log',
        TypeNamePlural: 'Condition Logs & Inspections',
        Title: { Value: equipment_ID },
        Description: { Value: inspectionType }
    },
    UI.SelectionFields: [
        inspectionType,
        conditionGrade,
        inspectionDate,
        inspector,
        locked
    ],
    UI.LineItem: [
        { Value: equipment.equipmentName, Label: 'Equipment Asset' },
        { Value: equipment.serialNumber, Label: 'Serial No' },
        { Value: rental.contractNo, Label: 'Contract No' },
        { Value: inspectionType, Label: 'Type (Check-Out/In)' },
        { Value: inspectionDate, Label: 'Inspection Date' },
        {
            Value: conditionGrade,
            Label: 'Grade',
            Criticality: (
                conditionGrade = 'A' ? 3 :
                conditionGrade = 'B' ? 2 :
                conditionGrade = 'C' ? 2 : 1
            )
        },
        { Value: meterReading, Label: 'Meter Hours' },
        { Value: inspector, Label: 'Inspector' },
        { Value: customerAck, Label: 'Customer Signed' },
        { Value: locked, Label: 'Locked' }
    ],
    UI.Facets: [
        {
            $Type: 'UI.ReferenceFacet',
            Label: 'Inspection Findings',
            Target: '@UI.FieldGroup#InspectionFindings'
        },
        {
            $Type: 'UI.ReferenceFacet',
            Label: 'Photographic Evidence & Hashes',
            Target: 'photos/@UI.LineItem'
        }
    ],
    Common.SideEffects #EquipmentChange: {
        SourceProperties: [ equipment_ID ],
        TargetProperties: [ rental_ID ]
    },
    UI.FieldGroup #InspectionFindings: {
        Data: [
            { Value: equipment_ID, Label: 'Equipment Asset' },
            { Value: rental_ID, Label: 'Rental Contract' },
            { Value: inspectionType, Label: 'Inspection Type' },
            { Value: inspectionDate, Label: 'Date & Time' },
            { Value: conditionGrade, Label: 'Condition Grade' },
            { Value: meterReading, Label: 'Meter Reading (Hours)' },
            { Value: inspector, Label: 'Inspector Name' },
            { Value: notes, Label: 'Inspection Notes' },
            { Value: customerAck, Label: 'Customer Acknowledged' },
            { Value: signatureUrl, Label: 'Digital Signature Ref' },
            { Value: locked, Label: 'Report Locked (Immutable)' }
        ]
    }
);

annotate InspectionService.ConditionLogs with {
    equipment        @title: 'Equipment Asset'       @Common.Label: 'Equipment Asset'
                     @Common.Text: equipment.equipmentName @Common.TextArrangement: #TextFirst
                     @Common.ValueList: {
                         CollectionPath: 'RentedEquipment',
                         Parameters: [
                             { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: equipment_ID, ValueListProperty: 'ID' },
                             { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'equipmentName' },
                             { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'serialNumber' },
                             { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'currentStatus' },
                             { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'currentGrade' }
                         ]
                     };
    rental           @title: 'Rental Contract'       @Common.Label: 'Rental Contract'
                     @Common.Text: rental.contractNo @Common.TextArrangement: #TextFirst
                     @Common.ValueList: {
                         CollectionPath: 'Rentals',
                         Parameters: [
                             { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: rental_ID, ValueListProperty: 'ID' },
                             { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'contractNo' },
                             { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'rentalStatus' }
                         ]
                     };
    inspectionDate   @title: 'Date & Time'           @Common.Label: 'Date & Time';
    inspectionType   @title: 'Inspection Type'       @Common.Label: 'Inspection Type'
                     @Common.ValueListWithFixedValues: true
                     @Common.ValueList: {
                         CollectionPath: 'InspectionTypes',
                         Parameters: [
                             { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: inspectionType, ValueListProperty: 'code' },
                             { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
                         ]
                     };
    conditionGrade   @title: 'Condition Grade'       @Common.Label: 'Condition Grade' @Common.ValueListWithFixedValues: true;
    suggestedGrade   @title: 'Suggested Grade'       @Common.Label: 'Suggested Grade';
    inspectionStatus @title: 'Review State'          @Common.Label: 'Review State';
    inspector        @title: 'Inspector Name'        @Common.Label: 'Inspector Name'
                     @Common.ValueListWithFixedValues: true
                     @Common.ValueList: {
                         CollectionPath: 'Inspectors',
                         Parameters: [
                             { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: inspector, ValueListProperty: 'code' },
                             { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
                         ]
                     };
    meterReading     @title: 'Meter Reading (Hours)' @Common.Label: 'Meter Reading (Hours)';
    notes            @title: 'Inspection Notes'      @Common.Label: 'Inspection Notes';
    customerAck      @title: 'Customer Acknowledged' @Common.Label: 'Customer Acknowledged';
    signatureUrl     @title: 'Digital Signature Ref' @Common.Label: 'Digital Signature Ref';
    locked           @title: 'Report Locked (Immutable)' @Common.Label: 'Report Locked (Immutable)';
};

/* ==========================================================================
   10. INSPECTION SERVICE - DAMAGE RECORDS & DAMAGE MANAGEMENT (FR-007)
   ========================================================================== */

annotate InspectionService.DamageRecords with @(
    UI.HeaderInfo: {
        TypeName: 'Damage Incident',
        TypeNamePlural: 'Damage Incidents & Records',
        Title: { Value: damageType },
        Description: { Value: area }
    },
    UI.SelectionFields: [
        damageType,
        area,
        severity,
        origin,
        damageStatus,
        billable,
        customerLiable
    ],
    UI.LineItem: [
        { Value: damageType, Label: 'Damage Type' },
        { Value: area, Label: 'Equipment Area' },
        {
            Value: severity,
            Label: 'Severity',
            Criticality: (
                severity = 'Low' ? 3 :
                severity = 'Medium' ? 2 : 1
            )
        },
        { Value: origin, Label: 'Origin (New/Pre-existing)' },
        { Value: repairEstimate, Label: 'Estimated Repair ($)' },
        { Value: billable, Label: 'Billable' },
        { Value: customerLiable, Label: 'Customer Liable' },
        {
            Value: damageStatus,
            Label: 'Damage Status',
            Criticality: (
                damageStatus = 'Repaired' ? 3 :
                damageStatus = 'Billed' ? 3 :
                damageStatus = 'InRepair' ? 2 : 1
            )
        }
    ],
    UI.Facets: [
        {
            $Type: 'UI.ReferenceFacet',
            Label: 'Damage Particulars',
            Target: '@UI.FieldGroup#DamageInfo'
        },
        {
            $Type: 'UI.ReferenceFacet',
            Label: 'Photo Evidence',
            Target: 'photos/@UI.LineItem'
        }
    ],
    UI.FieldGroup #DamageInfo: {
        Data: [
            { Value: conditionLog_ID, Label: 'Inspection Reference' },
            { Value: damageType, Label: 'Damage Classification' },
            { Value: area, Label: 'Area / Component' },
            { Value: severity, Label: 'Severity' },
            { Value: description, Label: 'Damage Description' },
            { Value: origin, Label: 'Origin' },
            { Value: repairEstimate, Label: 'Estimated Repair Cost ($)' },
            { Value: billable, Label: 'Billable to Customer' },
            { Value: customerLiable, Label: 'Customer Liable' },
            { Value: damageStatus, Label: 'Current Status' }
        ]
    }
);

annotate InspectionService.DamageRecords with {
    conditionLog   @title: 'Inspection Reference'   @Common.Label: 'Inspection Reference' @Common.ValueList: {
        CollectionPath: 'ConditionLogs',
        Parameters: [
            { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: conditionLog_ID, ValueListProperty: 'ID' },
            { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'inspectionType' },
            { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'conditionGrade' }
        ]
    };
    damageType     @title: 'Damage Type'            @Common.Label: 'Damage Type' @Common.ValueListWithFixedValues: true;
    area           @title: 'Equipment Area'         @Common.Label: 'Equipment Area' @Common.ValueListWithFixedValues: true;
    severity       @title: 'Severity'               @Common.Label: 'Severity' @Common.ValueListWithFixedValues: true;
    damageStatus   @title: 'Damage Status'          @Common.Label: 'Damage Status' @Common.ValueListWithFixedValues: true;
    repairEstimate @title: 'Estimated Repair ($)'   @Common.Label: 'Estimated Repair ($)';
    description    @title: 'Damage Description'     @Common.Label: 'Damage Description';
};

/* ==========================================================================
   11. DAMAGE PHOTOS - EVIDENCE GALLERY WITH INTEGRITY HASH (FR-009)
   ========================================================================== */

annotate InspectionService.DamagePhotos with @(
    UI.LineItem: [
        { Value: fileName, Label: 'Photo Filename' },
        { Value: photoType, Label: 'Evidence Type' },
        { Value: sha256, Label: 'SHA-256 Hash' },
        { Value: mediaUrl, Label: 'Media / Evidence URL' },
        { Value: uploadedAt, Label: 'Captured On' },
        { Value: uploadedBy, Label: 'Captured By' }
    ]
);

annotate InspectionService.DamagePhotos with {
    fileName  @title: 'Photo Filename' @Common.Label: 'Photo Filename';
    photoType @title: 'Evidence Type'  @Common.Label: 'Evidence Type' @Common.ValueListWithFixedValues: true;
    mediaUrl  @title: 'Media URL'      @Common.Label: 'Media URL';
    sha256    @title: 'SHA-256 Hash'   @Common.Label: 'SHA-256 Hash';
};


