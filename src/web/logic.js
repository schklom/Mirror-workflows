var mapOptions = {
    center: [17.385044, 78.486671],
    zoom: 14
    }
    
    var map = new L.map("map", mapOptions);
    
    var layer = new     L.TileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png");
    
    map.addLayer(layer);