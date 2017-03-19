window.onload = function(){
    locations = new Vue({
        el: '#locations',
        data: {
            places: [],
            locallyDeletedLocations: []
        },
        methods:{
            createMarker: function(place){
                return new google.maps.Marker({
                    map: map.gmap,
                    position: place.geometry.location
                });
            },
            removeMarker: function(id){
                locations.places.forEach(function(current_element, current_index){
                    if(current_element.Place.id == id){
                        current_element.Marker.setMap(null);
                        locations.places.splice(current_index,1);
                        return;
                    }
                });
                locations.locallyDeletedLocations.push(id);
            }
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
                }, function(results, status, pagination){
                    if (status === google.maps.places.PlacesServiceStatus.OK) {
                        results.forEach(function(current_element){
                            locations.places.push({
                                "Marker": locations.createMarker(current_element),
                                "Place": current_element
                            })
                        })
                    }
                    if(pagination.hasNextPage){
                        pagination.nextPage();
                    }
                });
            },
            initializeMap: function(zoom){
                zoom = typeof zoom === 'undefined' ? 15 : zoom;
                map.gmap = new google.maps.Map(document.getElementById('map'), { center: map.location, zoom: zoom })
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

    shareButton = new Vue({
        el: "#imgShareSession",
        methods: {
            shareSession: function(){
                if(sharedSession.sharedSession){
                    alert("Shared URL: " + window.location);
                    return;
                }
                var session_data = {
                    "gps": map.gmap.center.lat() + ',' + map.gmap.center.lng(),
                    "init_km": selectedDistance.selected,
                    "del_ids": locations.locallyDeletedLocations
                };
                this.$http.post('https://api.tuchfarber.com/vetoit/create', session_data).then(
                    function(response){
                        var share_url = window.location + '#' + response.data.d_id;
                        window.location.hash = response.data.d_id;
                        alert(share_url);
                    },
                    function(reponse){
                        console.log("Error");
                        console.log(response);
                    }
                );
            }
        }
    });

    sharedSession = new Vue({
        data: {
            sharedSession: window.location.hash.substring(1) !== "" ? true : false,
            sessionId: window.location.hash.substring(1),
            deletedIds: [],
            gpsLocation: {lat: 0, lng: 0},
            km: 1000
        },
        methods:{
            getData: function(){

            }
        }
    });

    map.initializeMap();
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