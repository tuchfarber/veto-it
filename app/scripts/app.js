window.onload = function(){
    locations = new Vue({
        el: '#locations',
        data: {
            places: [],
            progresswidth: 0
        },
        methods:{
            createMarker: function(place){
                return new google.maps.Marker({
                    map: map.gmap,
                    position: place.geometry.location
                });
            },
            removeMarker: function(id){
                var changed = false;
                locations.places.forEach(function(current_element, current_index){
                    if(current_element.Place.id == id){
                        current_element.Marker.setMap(null);
                        locations.places.splice(current_index,1);
                        changed = true;
                        return;
                    }
                });
                if(changed){
                    sharedSession.deletedIds = sharedSession.deletedIds.concat([id]).filter(sharedSession.findUnique)
                    var veto_url = 'https://api.tuchfarber.com/vetoit/veto/' + sharedSession.sessionId + '/' + sharedSession.sessionKey;
                    var session_data = {"del_ids":sharedSession.deletedIds}
                    this.$http.post(veto_url, session_data).then(
                        function(response){
                            console.log("Successfully vetoed")
                        },
                        function(reponse){
                            console.log("Error");
                            console.log(response);
                        }
                    );
                }

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
                
                //Find places
                this.findPlaces();
            },
            findPlaces: function(){
                locations.progresswidth = 0;
                var service = new google.maps.places.PlacesService(map.gmap);
                locations.places = [];
                service.nearbySearch({
                    location: this.location,
                    radius: selectedDistance.selected,
                    type: ['restaurant']
                }, function(results, status, pagination){
                    if (status === google.maps.places.PlacesServiceStatus.OK) {
                        results.forEach(function(current_element){
                            if(sharedSession.deletedIds.indexOf(current_element.id) < 0){
                                locations.places.push({
                                    "Marker": locations.createMarker(current_element),
                                    "Place": current_element
                                })
                            }
                        })
                    }
                    if(pagination.hasNextPage){
                        locations.progresswidth += 33;
                        pagination.nextPage();
                    }else{
                        locations.progresswidth = 100;
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
                document.getElementById("txtNewLocation").disabled = true;
                document.getElementById("ddlDistance").disabled = true;
                if(sharedSession.sharedSession){
                    alert("Shared URL: " + window.location);
                    return;
                }
                var session_data = {
                    "gps": map.gmap.center.lat() + ',' + map.gmap.center.lng(),
                    "init_km": selectedDistance.selected,
                    "del_ids": sharedSession.deletedIds
                };
                this.$http.post('https://api.tuchfarber.com/vetoit/create', session_data).then(
                    function(response){
                        var share_url = window.location + '#' + response.data.d_id + '/' + response.data.d_key;
                        window.location.hash = response.data.d_id + '/' + response.data.d_key;
                        alert(share_url);
                        window.setInterval(sharedSession.getData,1000);
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
            sessionId: window.location.hash.substring(1, window.location.hash.indexOf('/')),
            sessionKey: window.location.hash.substring(window.location.hash.indexOf('/') + 1),
            deletedIds: []
        },
        methods:{
            getData: function(){
                var retrieve_url = 'https://api.tuchfarber.com/vetoit/retrieve/' + sharedSession.sessionId + '/' + sharedSession.sessionKey;
                this.$http.get(retrieve_url).then(
                    function(response){
                        if(response.status != "Error"){
                            console.log(response)
                            selectedDistance.selected = response.data.init_km;
                            sharedSession.deletedIds = sharedSession.deletedIds.concat(response.data.del_ids).filter(this.findUnique)
                            if(map.location.lat + ',' + map.location.lng != response.data.gps){
                                var gps = response.data.gps.split(',');
                                map.changeLocation(parseFloat(gps[0]),parseFloat(gps[1]));
                            }
                        }else{
                            console.log("Retrieval error: " + response.status_text);
                            return;
                        }
                    },
                    function(reponse){
                        console.log("Error");
                        console.log(response);
                    }
                );
            },
            findUnique : function(value, index, self) { 
                return self.indexOf(value) === index;
            }
        },
        watch:{
            deletedIds: function(ids){
                ids.forEach(function(id){
                    locations.removeMarker(id);
                });
            }
        }
    });

    window.addEventListener("hashchange", function(hash){
        sharedSession.sharedSession = window.location.hash.substring(1) !== "" ? true : false;
        sharedSession.sessionId = window.location.hash.substring(1,window.location.hash.indexOf('/'))
        sharedSession.sessionKey = window.location.hash.substring(window.location.hash.indexOf('/') + 1)
    });

    if(sharedSession.sharedSession){
        document.getElementById("txtNewLocation").disabled = true;
        document.getElementById("ddlDistance").disabled = true;
        sharedSession.getData()
        window.setInterval(sharedSession.getData,1000);

    }else{
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
            }
        );
    }

    map.initializeMap();
}