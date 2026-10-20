using { RentalService } from '../../srv/rental-service/rental-service';

/* ==========================================================================
   RENTALS & CONTRACT ALLOCATIONS
   ========================================================================== */

annotate RentalService.Rentals with @(
    UI.HeaderInfo: {
        TypeName: 'Rental Contract',
        TypeNamePlural: 'Rental Contracts',
        Title: { Value: contractNo }
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
            { Value: totalRentalAmount, Label: 'Total Contract Value ($)' }
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
    customer           @title: 'Customer / Client'     @Common.Label: 'Customer / Client'
                       @Common.Text: customer.companyName @Common.TextArrangement: #TextFirst
                       @Common.ValueList: {
        CollectionPath: 'Customers',
        Parameters: [
            { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: customer_ID, ValueListProperty: 'ID' },
            { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'companyName' },
            { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'contactPerson' },
            { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'email' }
        ]
    };
    rentalDate         @title: 'Start Date'            @Common.Label: 'Start Date';
    expectedReturnDate @title: 'Expected Return Date'  @Common.Label: 'Expected Return Date';
    actualReturnDate   @title: 'Actual Return Date'    @Common.Label: 'Actual Return Date' @UI.Hidden: true;
    rentalStatus       @title: 'Contract Status'       @Common.Label: 'Contract Status';
    totalRentalAmount  @title: 'Total Contract Value ($)' @Common.Label: 'Total Contract Value ($)';
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
    equipment       @title: 'Equipment'        @Common.Label: 'Equipment'
                    @Common.Text: equipment.equipmentName @Common.TextArrangement: #TextFirst
                    @Common.ValueList: {
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
