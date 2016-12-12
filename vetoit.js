var map;
var locations;
var loc;
var radius = 1000;

function drawMap(){
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 0, lng: 0},
        zoom: 15
    });
}

function changeLocation(lat, long){
    loc = {lat: lat, lng: long};
    map.setCenter(loc)
    removeAllMarkers()
    locations.places = [];
    findPlaces()
}

function findPlaces(){
    var service = new google.maps.places.PlacesService(map);
    service.nearbySearch({
        location: loc,
        radius: radius,
        type: ['restaurant']
    }, findPlacesSuccessHandler);
}

function removeAllMarkers(){
    locations.places.forEach(function(current_element){
        current_element.Marker.setMap(null);
    })
}

function findPlacesSuccessHandler(results, status) {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
        locations.places=[];
        results.forEach(function(current_element){
            locations.places.push({
                "Marker": createMarker(current_element),
                "Place": current_element
            })
        })
    }
    console.log(locations.places)
}
function searchLocation(){
    var address = document.getElementById("address").value;
    geocoder = new google.maps.Geocoder();
    geocoder.geocode( { 'address': address}, function(results, status) {
        if (status == 'OK') {
            changeLocation(results[0].geometry.location.lat(),results[0].geometry.location.lng())
        } else {
            alert('Unable to determine location. ' + status);
        }
    });
}

function createMarker(place) {
    return new google.maps.Marker({
        map: map,
        position: place.geometry.location
    });
}
function removeMarker(id){
    console.log(locations.places);
    locations.places.forEach(function(current_element, current_index){
        if(current_element.Place.id == id){
            current_element.Marker.setMap(null);
            locations.places.splice(current_index,1);
            return;
        }
    })
}
function useGeolocation(position){
    changeLocation(position.coords.latitude,position.coords.longitude)
}

function changeRadius(){
    radius = parseInt(document.getElementById("distance").value);
    console.log(radius)
    changeLocation(loc.lat,loc.lng)
}

window.onload = function(){
    //initMap(39.1462596,-84.4423238)
    locations = new Vue({
        el: '#locations',
        data: {
            places: []
        }
    })
    drawMap()
    navigator.geolocation.getCurrentPosition(useGeolocation, function(error){console.log(error)})
}
