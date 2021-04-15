var map, markers;

function init() {
    map = new OpenLayers.Map("map");
    map.addLayer(new OpenLayers.Layer.OSM());
    map.setCenter(new OpenLayers.LonLat(13.41,52.52) // Center of the map
        .transform(
        new OpenLayers.Projection("EPSG:4326"), // transform from WGS 1984
            new OpenLayers.Projection("EPSG:900913") // to Spherical Mercator Projection
          ), 15 // Zoom level
      );
    markers = new OpenLayers.Layer.Markers( "Markers" );
    map.addLayer(markers);
}

function locate(){
    idInput = document.getElementById('fmdid');

    fetch("/location/" + idInput.value)
        .then(function(response) {

            return response.json();
        })
        .then(function(json) {
            var lonLat = new OpenLayers.LonLat( json.lon , json.lat )
                .transform(
                new OpenLayers.Projection("EPSG:4326"),
                map.getProjectionObject()
                );

            var zoom=16;
            markers.clearMarkers();
            markers.addMarker(new OpenLayers.Marker(lonLat));
            map.setCenter (lonLat, zoom);
        })

}
