using { RentalService } from '../../srv/rental-service/rental-service';


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
        TypeName: 'Location',
        TypeNamePlural: 'Locations',
        Title: { Value: locationName }
    },
    UI.SelectionFields: [
        locationName,
        locationType,
        city
    ],
    UI.LineItem: [
        { Value: locationName, Label: 'Location Name' },
        { Value: plant, Label: 'Plant Code' },
        { Value: locationType, Label: 'Location Type' },
        { Value: address, Label: 'Full Address' },
        { Value: city, Label: 'City' },
        { Value: latitude, Label: 'Latitude' },
        { Value: longitude, Label: 'Longitude' }
    ],
    UI.Facets: [
        {
            $Type: 'UI.ReferenceFacet',
            Label: 'Location Details',
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
            { Value: plant, Label: 'Plant Code' },
            { Value: locationType, Label: 'Location Type' },
            { Value: address, Label: 'Full Address' },
            { Value: city, Label: 'City' },
            { Value: latitude, Label: 'GPS Latitude' },
            { Value: longitude, Label: 'GPS Longitude' }
        ]
    }
);

annotate RentalService.Locations with {
    locationName @mandatory @title: 'Location Name' @Common.Label: 'Location Name';
    plant        @readonly  @title: 'Plant Code'    @Common.Label: 'Plant Code';
    locationType @mandatory @title: 'Location Type' @Common.Label: 'Location Type'
                 @Common.ValueListWithFixedValues: true
                 @Common.ValueList: {
                     CollectionPath: 'LocationTypes',
                     Parameters: [
                         { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: locationType, ValueListProperty: 'name' }
                     ]
                 };
    address      @mandatory @title: 'Full Address'  @Common.Label: 'Full Address';
    city         @mandatory @title: 'City'          @Common.Label: 'City';
    latitude     @mandatory @title: 'GPS Latitude'  @Common.Label: 'GPS Latitude';
    longitude    @mandatory @title: 'GPS Longitude' @Common.Label: 'GPS Longitude';
    equipment    @readonly;
};
