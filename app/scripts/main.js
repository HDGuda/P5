'use strict';

// Workaround for ESLint
/* global ko, google, mapBounds */

var map, infowindow;
var allMySights = [],
    allMyMarkers = [];
var infoWindowContentString = "<div><h5 id='sight-info-header'></h5><ul class='list-unstyled' id='sight-info'></ul></div>";
// this array keeps the initial data
var mySights = ["Centre Pompidou", 48.8606, 2.3522, "Tour Eiffel", 48.8583, 2.2944, "Arc de Triomphe", 48.8731545, 2.2949929, "Paris Expo Porte de Versailles", 48.8296, 2.2872075, "Musee Rodin", 48.8553, 2.3160, "Musee d'Orsay", 48.8599, 2.3265, "Musee du Louvre", 48.8606, 2.3376, "Notre-Dame de Paris", 48.8529, 2.3499, "Jardin du Luxembourg", 48.8462, 2.3371];

// functions to initialize the list and display additional information below the list
var ListModule = (function() {
    return {
        initList: function() {
            //push sights into allMySights; "visible" is needed for filtering the list of sights
            for (var j = 0; j < mySights.length; j = j + 3) {
                allMySights.push({nameofsight: mySights[j], visible: true});
            }
        },
        getWikipediaInfo: function(searchStr){
            var wikipediaURL = "https://en.wikipedia.org/w/api.php?action=opensearch&search=" + searchStr + "&format=json&callback=wikiCallback";
            $.ajax(wikipediaURL, {
                dataType: "jsonp",
                success: function(response) {
                    var entryList = response[1];
                    $('#sight-info').empty();
                    $('#sight-info-header').empty().append('Information from Wikipedia');
                    for (var w = 0; w < entryList.length; w++) {
                        var entry = entryList[w];
                        var entryurl = "http://en.wikipedia.org/wiki/" + entry;
                        $('#sight-info').append('<li><a target="_blank" href="' + entryurl + '">' + entry + '</a></li>');
                    }
                },
                error: function(e) {
                    $('#sight-info-header').empty().append('Information from Wikipedia could not be loaded');
                }
            });
        }
    };
})();

// functions to initialize and handle the map
var MapModule = (function() {
    return {
        initializeMap: function() {
            var mapOptions = {
                disableDefaultUI: false,
                fullscreenControl: false,
                scrollwheel: false,
                zoom: 2,
                draggable: false
            };

            map = new google.maps.Map(document.querySelector('#map-area'), mapOptions);

            // alert user if map could not be initialized
            if (map === null) { window.alert ("Map could not be initialized") };

            // resize map to new window size when window is resized
            window.addEventListener('resize', function(e) {
                map.fitBounds(mapBounds);
            });
            window.mapBounds = new google.maps.LatLngBounds();

        },
        placeMarkers: function() {
            for (var s = 0; s < mySights.length; s = s + 3) {
                //create sight markers and infowindows for all sights and push them in allMyMarkers
                var newmarker = MapModule.createMapMarker(mySights[s], mySights[s + 1], mySights[s + 2]);
                allMyMarkers.push({name: mySights[s], marker: newmarker.marker, infowindow: newmarker.infowindow});
            }

        },

        createMapMarker: function(name, lat, lng) {
            // this function creates a single marker including infowindow
            var bounds = window.mapBounds;
            var marker = new google.maps.Marker({
                map: map,
                position: {lat: lat, lng: lng},
                title: name,
                visible: true
            });
            infowindow = new google.maps.InfoWindow({
                content: infoWindowContentString
            });

            bounds.extend(new google.maps.LatLng(lat, lng));
            map.fitBounds(bounds);
            map.setCenter(bounds.getCenter());
            // listen to click on marker
            google.maps.event.addListener(marker, 'click', function() {
                for (var mm = 0; mm < allMyMarkers.length; mm++) {
                    //remove animation and info window from other animated marker
                    allMyMarkers[mm].marker.setAnimation(null);
                    allMyMarkers[mm].infowindow.close();
                }

                infowindow.open(map, marker);
                if (marker.getAnimation() !== null) {
                    marker.setAnimation(null);
                } else {
                    //get Wikipedia info for clicked marker
                    ListModule.getWikipediaInfo(marker.title);
                    //animate clicked marker
                    marker.setAnimation(google.maps.Animation.BOUNCE);
                }
            });
            return {marker: marker, infowindow: infowindow};
        }
    };
})();

//Knockout handlers for list operations
var SightViewModel = function(sightarr) {
        var self = this;
        self.sightarr = ko.observableArray(sightarr);
        self.searchStr = ko.observable("");

        //when an entry in the list is clicked
        self.entryClicked = function(item) {
            ListModule.getWikipediaInfo(item.nameofsight);
            for (var i = 0; i < allMyMarkers.length; i++) {
                if (item.nameofsight === allMyMarkers[i].name) {
                    for (var mm = 0; mm < allMyMarkers.length; mm++) {
                        allMyMarkers[mm].marker.setAnimation(null);
                        allMyMarkers[mm].infowindow.close();
                    }
                    allMyMarkers[i].marker.setAnimation(google.maps.Animation.BOUNCE);
                    allMyMarkers[i].infowindow.open(map, allMyMarkers[i].marker);
                }
            }
        };

        //filter the list when something is entered by the user
        self.filterSights = function() {
            for (var i = 0; i < allMySights.length; i++) {
                if (self.searchStr() !== "") {
                    //search for sights that match the search string and mark them as visible, the rest as not visible
                    if (allMySights[i].nameofsight.includes(self.searchStr())){
                        allMySights[i].visible = true;
                    } else {
                        allMySights[i].visible = false;
                    }
                }
            }
            //refresh sight list to initial values if search string is empty
            if (self.searchStr() === "") {
                allMySights = [];
                self.sightarr.removeAll();
                ListModule.initList();
                for (i = 0; i < allMySights.length; i++) {
                    self.sightarr.push(allMySights[i]);
                }
            } else {
                //remove sights from sight list that don't match the query
                self.sightarr.remove(function(item) { return item.visible === false; });
            }
            self.searchStr("");
        };
    };

// initialize map when page is loaded
window.addEventListener('load', MapModule.initializeMap());
//place all markers on the map
MapModule.placeMarkers();
//initialize the sight and fill it with all sights
ListModule.initList();
// get Knockout-Bindings ready
ko.applyBindings(new SightViewModel(allMySights));
