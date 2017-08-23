
var markers = [], map, urlMyLocations;

// Use third pary API to get BART stations.
var urlBartStations =
        "http://api.bart.gov/api/stn.aspx?cmd=stns&key=MW9S-E7SL-26DU-VV8V&json=y";

// Stores center location.
var point;

var firstApplyBindings = false;

var myLocations = ["Los Angeles County Museum of Art", "WP24 by Wolfgang Puck",
    "Santa Monica Pier", "Universal Studios Hollywood", "Rodeo Drive"];

var myLocationsCoords = [34.0645577, -118.3592293, 34.0451356, -118.2688615,
    34.0087686, -118.5000063, 34.1381212, -118.355567, 34.0698796, -118.4058262];

var latitudeMyLocation, longitudeMyLocation;

var bart = true;

// Model for filter.
var filterModel = [
    {place: "Bart Locations"},
    {place: "Los Angeles County Museum of Art"},
    {place: "WP24 by Wolfgang Puck"},
    {place: "Santa Monica Pier"},
    {place: "Universal Studios Hollywood"},
    {place: "Rodeo Drive"}
];

function applyBindingsFilter() {
    var self = this;
    self.places = ko.observableArray(filterModel);
}

ko.applyBindings(new applyBindingsFilter(), $("#filter_bind")[0]);

var observableArray = []; // Stores locations.
var observableArrayModel = ko.observableArray(observableArray); // Stores model.

function Location(location, address) {
    this.location = ko.observable(location);
    this.address = ko.observable(address);
}

/* Apply knockout:create Locations and fill out the list. */
function applyBindingLocations() {
    var self = this;
    this.Locations = observableArrayModel;
    this.query = ko.observable("");

    // Apply search.
    this.Locations = ko.computed(function () {
        var input = self.query().toLowerCase();
        if (!input) {
            return observableArrayModel();
        } else {
            return ko.utils.arrayFilter(observableArrayModel(), function (item, index) {
                var present = item.location().toLowerCase().indexOf(input) !== -1;
                if (present) {
                    markers[index].setMap(map);
                } else {
                    markers[index].setMap(null);
                }

                return present;
            });
        }
    });
}

var model = new applyBindingLocations();

/* Apply search bindings */
ko.applyBindings(model, $("#myInput")[0]);
ko.applyBindings(model, $("#items_ul")[0]);

function myMap() {
    var self = this;
    if (bart) {
        point = new google.maps.LatLng(37.773972, -122.431297); // San Francisco.
    } else {
        point = new google.maps.LatLng(latitudeMyLocation, longitudeMyLocation);
    }
    var geocoder = new google.maps.Geocoder();
    geocoder.geocode({
        "location": point
    }, function (results, status) {
        if (status === google.maps.GeocoderStatus.OK) {
            var mapProp = {
                center: new google.maps.LatLng(
                        results[0].geometry.location.lat(),
                        results[0].geometry.location.lng()),
                zoom: 10
            };
            map = new google.maps.Map(document.getElementById("googleMap"), mapProp);

            // Use Media WIKI API to get my locations.
            urlMyLocations =
                    "https://en.wikipedia.org/w/api.php?format=json&action=query&list=geosearch&origin=*&gsradius=10000&gscoord=" +
                    latitudeMyLocation + "|" +
                    longitudeMyLocation + "&gslimit=40&gsprop=type";

            // Apply ajax request to connect with the api.bart.gov (to get bart locations
            // or with the en.wikipedia.org, i.e. media wiki (to get my 5 locations
            // stored in myLocations array.
            $.ajax({
                type: "GET",
                dataType: "json",
                url: bart ? urlBartStations : urlMyLocations,
                success: function (response) { // If the ajax request was successful.
                    console.log("success");
                    observableArray.length = 0;// Clear observable array.

                    markers = []; // Clear markers on google map.
                    if (bart) { // Check if bart locations selected and if so, 
                        // then get latitude using gtfs_latitude unlike the
                        // my locations (lat), because json format is differrent
                        // in media wiki and in api.bart.gov.

                        $.each(response.root.stations.station, function (k, v) {
                            var neighbour = new google.maps.LatLng(v.gtfs_latitude, v.gtfs_longitude);
                            var marker = new google.maps.Marker({position: neighbour});

                            /* Add infoWindow when clicking on the marker  */
                            google.maps.event.addListener(marker, 'click', function () {
                                openInfoWindow(k);
                            });

                            markers.push(marker);
                            marker.setMap(map); // Display marker.

                            /*Fill out the list of locations*/
                            observableArrayModel.push(new Location(v.name, v.address));

                        });
                    } else {
                        $.each(response.query.geosearch, function (k, v) {

                            var neighbour = new google.maps.LatLng(v.lat, v.lon);
                            var marker = new google.maps.Marker({position: neighbour});

                            /* Add infoWindow when clicking on the marker  */
                            google.maps.event.addListener(marker, 'click', function () {
                                openInfoWindow(k);
                            });

                            markers.push(marker);
                            marker.setMap(map); // Display marker.

                            /*Fill out the list of locations.
                             * Note, that in media wiki we use title and type
                             * instead of name and address.*/
                            observableArrayModel.push(new Location(v.title, v.type));

                        });
                    }
                },
                error: function (er) { // If the ajax request failed.
                    console.log("Error occurred: " + er);
                    alert("Error occurred: URL locations cannot be loaded (check url)"); // Show error to the user.
                }
            });
        }
    });
}

//function applySearch() {
//    console.log("applySearch called");
//    var input, filter, ul, li, i;
//    input = document.getElementById("myInput");
//    filter = input.value.toUpperCase();
//    ul = document.getElementById("items_ul");
//    li = ul.getElementsByTagName("li");
//    for (i = 0; i < observableArray.length; i++) {
//        var loc = observableArray[i];
//        if (loc.location().toUpperCase().indexOf(filter) > -1) {
//            li[i].style.display = ""; // Add item to list.
//            markers[i].setMap(map); // Add marker to map.
//        } else {
//            li[i].style.display = "none"; // Remove item from list.
//            markers[i].setMap(null); // Remove marker from map.
//        }
//    }
//}


function openInfoWindow(data) {
    var indexOfItemInList;
    if (data === parseInt(data, 10)) { // If index passed, i.e. the user clicks
        // directly on the marker. 

        indexOfItemInList = data;
    } else { // If user clicks on the location in the drop down list.

        for (var i = 0; i < observableArrayModel().length; i++) {
            if (observableArrayModel()[i] === data) {
                indexOfItemInList = i;
                break;
            }
        }
    }
    var marker = markers[indexOfItemInList]; // Retrieve required marker using the given index.

    var item = observableArrayModel()[indexOfItemInList];
    var infowindow = new google.maps.InfoWindow({
        content: item.location() + "<br>" + item.address()
    });
    infowindow.open(map, marker); // Open info window with name of item.

    applyAnimation(marker, infowindow);

}

function applyAnimation(marker, infowindow) {
    for (var i = 0; i < markers.length; i++) {
        markers[i].setAnimation(null);
    }
    marker.setAnimation(google.maps.Animation.BOUNCE);

    // Add listener to stop bouncing once info window closed.
    google.maps.event.addListener(infowindow, 'closeclick', function () {
        marker.setAnimation(null);
    });
}


/*
 * This method called whenever the user applies filter to select
 * the location. Bart Locations is displayed by default.
 */
function applyFilter(index) {
    switch (index) {
        case 0:
            bart = true;
            break;
        case 1:
            bart = false;
            latitudeMyLocation = myLocationsCoords[0];
            longitudeMyLocation = myLocationsCoords[1];
            break;
        case 2:
            bart = false;
            latitudeMyLocation = myLocationsCoords[2];
            longitudeMyLocation = myLocationsCoords[3];
            break;
        case 3:
            bart = false;
            latitudeMyLocation = myLocationsCoords[4];
            longitudeMyLocation = myLocationsCoords[5];
            break;
        case 4:
            bart = false;
            latitudeMyLocation = myLocationsCoords[6];
            longitudeMyLocation = myLocationsCoords[7];
            break;
        case 5:
            bart = false;
            latitudeMyLocation = myLocationsCoords[8];
            longitudeMyLocation = myLocationsCoords[9];
            break;
        default:
            console.log("Unexpected error: invalid input index in select method");
    }
    myMap();
}

setTimeout(function () {
    if (!window.google || !window.google.maps) {
        alert("Google Map not loaded");
    }
}, 6000); // Give 6 sec to load map.

function throwError() {
    alert("Google Map not loaded");
}