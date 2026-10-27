using { RentalEquipmentTrackingApp as my } from '../../db/schema';

@path: '/rental'
@requires: ['Admin', 'Manager']
service RentalService {

    @odata.draft.enabled
    @restrict: [
        { grant: ['*'], to: ['Admin', 'Manager'] }
    ]
    entity Customers as projection on my.Customers;

    @odata.draft.enabled
    @restrict: [
        { grant: ['*'], to: ['Admin', 'Manager'] }
    ]
    entity Locations as projection on my.Locations {
        *,
        @readonly equipment
    } actions {
        @Common.SideEffects: {
            TargetEntities: [ equipment ]
        }
        action assignEquipment(
            @mandatory
            @title: 'Select Equipment'
            @Common.Label: 'Select Equipment'
            @(Common.ValueList: {
                CollectionPath: 'Equipment',
                Parameters: [
                    { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: equipmentId, ValueListProperty: 'ID' },
                    { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'equipmentNo' },
                    { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'equipmentName' },
                    { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'serialNumber' },
                    { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'currentStatus' }
                ]
            })
            equipmentId: UUID,

            @title: 'Assignment Reason / Notes'
            @Common.Label: 'Assignment Reason / Notes'
            reason: String
        ) returns Locations;
    };

    @odata.draft.enabled
    @cds.redirection.target
    @restrict: [
        { grant: ['*'], to: ['Admin', 'Manager'] }
    ]
    entity Equipment as projection on my.Equipment;

    @readonly
    @restrict: [
        { grant: ['READ'], to: ['Admin', 'Manager'] }
    ]
    entity AvailableEquipment as projection on my.Equipment {
        ID,
        equipmentNo,
        serialNumber,
        category,
        equipmentName,
        equipmentType,
        manufacturer,
        model,
        rentalRatePerDay,
        currentStatus,
        currentGrade,
        location
    } where currentStatus = 'Available';

    @odata.draft.enabled
    @restrict: [
        { grant: ['*'], to: ['Admin', 'Manager'] }
    ]
    entity Rentals as projection on my.Rentals;

    @restrict: [
        { grant: ['*'], to: ['Admin', 'Manager'] }
    ]
    entity RentalItems as projection on my.RentalItems;

    @readonly
    @restrict: [
        { grant: ['READ'], to: ['Admin', 'Manager'] }
    ]
    entity LocationEvents as projection on my.LocationEvents;

    @readonly
    @restrict: [
        { grant: ['READ'], to: ['Admin', 'Manager'] }
    ]
    entity LocationTypes {
        key code : String(50);
        name     : String(100);
    }

    // Actions restricted by role
    action checkOutRental(rentalId: UUID) returns Rentals;
    action checkInRental(rentalId: UUID, actualReturnDate: Date) returns Rentals;
    action cancelRental(rentalId: UUID, reason: String) returns Rentals;
    action transferEquipment(equipmentId: UUID, toLocationId: UUID, reason: String) returns Equipment;
}
