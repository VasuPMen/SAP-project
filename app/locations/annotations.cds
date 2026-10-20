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
