function findPlacesSuccessHandler(results, status, pagination){
    if (status === google.maps.places.PlacesServiceStatus.OK) {
        results.forEach(function(current_element){
            locations.places.push({
                "Marker": createMarker(current_element),
                "Place": current_element
            })
        })
    }
    if(pagination.hasNextPage){
        pagination.nextPage();
    }
}

function createMarker(place) {
    return new google.maps.Marker({
        map: map.gmap,
        position: place.geometry.location
    });
}

function removeMarker(id){
    locations.places.forEach(function(current_element, current_index){
        if(current_element.Place.id == id){
            current_element.Marker.setMap(null);
            locations.places.splice(current_index,1);
            return;
        }
    })
}

function startSharedSession(){
    console.log("start session");
    // this.$http.post('/api', sessionData).then(response => {
    //     // Success
    // }, response => {
    //     // Error
    // });
}

window.onload = function(){
    locations = new Vue({
        el: '#locations',
        data: {
            places: []
        }
    });

    selectedDistance = new Vue({
        el: '#ddlDistance',
        data: {
            selected: 1000,
            options: [
                {text: '1 km', value: 1000},
                {text: '2 km', value: 2000},
                {text: '5 km', value: 5000},
                {text: '10 km', value: 10000}
            ]
        },
        methods: {
            changeRadius: function(){
                map.findPlaces();
            }
        }
    });

    map = new Vue({
        el: '#map',
        data: {
            location: {lat: 0, lng: 0},
            gmap: null
        },
        methods: {
            changeLocation: function(lat, lng){
                this.location = {lat: lat, lng: lng}

                // Set Latitude and Longitude
                map.gmap.setCenter(this.location);

                // Remove all markers
                locations.places.forEach(function(current_element){
                    current_element.Marker.setMap(null);
                })
                locations.places = [];

                //Find places
                this.findPlaces();
            },
            findPlaces: function(){
                var service = new google.maps.places.PlacesService(map.gmap);
                service.nearbySearch({
                    location: this.location,
                    radius: selectedDistance.selected,
                    type: ['restaurant']
                }, findPlacesSuccessHandler);
            }
        }
    });

    newLocation = new Vue({
        el: '#txtNewLocation',
        data: {
            newLocation: ""
        },
        methods: {
            searchLocation: function(newLocation){
                geocoder = new google.maps.Geocoder();
                geocoder.geocode( { 'address': newLocation}, function(results, status) {
                    if (status == 'OK') {
                        map.changeLocation(results[0].geometry.location.lat(),results[0].geometry.location.lng())
                    } else {
                        alert('Unable to determine location. ' + status);
                    }
                });
            }
        }
    });

    // Initialize map
    map.gmap = new google.maps.Map(document.getElementById('map'), { center: map.location, zoom: 15 })

    navigator.geolocation.getCurrentPosition(
        function(position){
            //Success
            map.changeLocation(position.coords.latitude,position.coords.longitude);
        }, function(error){
            // Error
            switch(error.code){
                case 1:
                    alert("Not permitted to access location data");
                    break;
                case 2:
                    alert("Unable to determine location");
                    break;
                case 3:
                    alert("Location data timeout");
                    break;
            }
        });
}
