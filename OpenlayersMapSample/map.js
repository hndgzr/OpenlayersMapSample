//var raster = new ol.layer.Tile({
//    source: new ol.source.OSM(),
//});
//$.ajaxSetup({
//    cache: false
//});
var source = new ol.source.Vector();
var source_formarkers = new ol.source.Vector();//for markers


/**
 * Currently drawn feature.
 * @type {import("../src/ol/Feature.js").default}
 */
var sketch;

/**
 * The help tooltip element.
 * @type {HTMLElement}
 */
var helpTooltipElement;

/**
 * Overlay to show the help messages.
 * @type {Overlay}
 */
var helpTooltip;

/**
 * The measure tooltip element.
 * @type {HTMLElement}
 */
var measureTooltipElement;

/**
 * Overlay to show the measurement.
 * @type {Overlay}
 */
var measureTooltip;

/**
 * Message to show when the user is drawing a polygon.
 * @type {string}
 */
var continuePolygonMsg = 'Click to continue drawing the polygon';

/**
 * Message to show when the user is drawing a line.
 * @type {string}
 */
var continueLineMsg = 'Click to continue drawing the line';

/**
 * Handle pointer move.
 * @param {import("../src/ol/MapBrowserEvent").default} evt The event.
 */
var pointerMoveHandler = function (evt) {
    if (evt.dragging) {
        return;
    }
    if (typeSelect.value != 'None') {
        /** @type {string} */
        var helpMsg = 'Click to start drawing';

        if (sketch) {
            var geom = sketch.getGeometry();
            if (geom instanceof ol.geom.Polygon) {
                helpMsg = continuePolygonMsg;
            } else if (geom instanceof ol.geom.LineString) {
                helpMsg = continueLineMsg;
            }
        }

        helpTooltipElement.innerHTML = helpMsg;
        helpTooltip.setPosition(evt.coordinate);

        helpTooltipElement.classList.remove('hidden');
    }
    else {
        helpTooltipElement.hidden = true;


    }
};
var zoominfo = 9;
var centerloc = ol.proj.fromLonLat([28.96, 41.03]);

if (localStorage.newZoom != null)
    zoominfo = localStorage.newZoom;
if (localStorage.newCenterlon != null && localStorage.newCenterlat != null) {
    var getcentercoor = new Array(localStorage.newCenterlon, localStorage.newCenterlat);
    centerloc = ol.proj.fromLonLat(getcentercoor, "EPSG:4326");
}
var view = new ol.View({
    center: centerloc,
    //center: [28.96, 41.03],
    zoom: zoominfo,
    //projection: "EPSG:4326"
});
var map = new ol.Map({
    //layers: [ vector],
    target: 'map',
    view: view,
    //renderer: 'webgl'
});



var typeSelect = document.getElementById('type');

var draw; // global so we can remove it later

/**
 * Format length output.
 * @param {LineString} line The line.
 * @return {string} The formatted length.
 */
var formatLength = function (line) {
    var length = ol.sphere.getLength(line);
    var output;
    if (length > 100) {
        output = Math.round((length / 1000) * 100) / 100 + ' ' + 'km';
    } else {
        output = Math.round(length * 100) / 100 + ' ' + 'm';
    }
    return output;
};

/**
 * Format area output.
 * @param {Polygon} polygon The polygon.
 * @return {string} Formatted area.
 */
var formatArea = function (polygon) {
    var area = ol.sphere.getArea(polygon);
    var output;
    if (area > 10000) {
        output = Math.round((area / 1000000) * 100) / 100 + ' ' + 'km<sup>2</sup>';
    } else {
        output = Math.round(area * 100) / 100 + ' ' + 'm<sup>2</sup>';
    }
    return output;
};

function addInteraction() {
    var type = typeSelect.value;
    //== 'area' ? 'Polygon' : 'LineString';
    if (type != 'None') {
        map.on('pointermove', pointerMoveHandler);

        map.getViewport().addEventListener('mouseout', function () {
            helpTooltipElement.classList.add('hidden');
        });


        //console.log(type);
        draw = new ol.interaction.Draw({
            source: source,
            type: type,
            style: new ol.style.Style({
                fill: new ol.style.Fill({
                    color: 'rgba(255, 255, 255, 0.2)',
                }),
                stroke: new ol.style.Stroke({
                    color: 'rgba(0, 0, 0, 0.5)',
                    lineDash: [10, 10],
                    width: 2,
                }),
                image: new ol.style.Circle({
                    radius: 5,
                    stroke: new ol.style.Stroke({
                        color: 'rgba(0, 0, 0, 0.7)',
                    }),
                    fill: new ol.style.Fill({
                        color: 'rgba(255, 255, 255, 0.2)',
                    }),
                }),
            }),
        });
        map.addInteraction(draw);

        createMeasureTooltip();
        createHelpTooltip();

        var listener;
        draw.on('drawstart', function (evt) {
            // set sketch
            sketch = evt.feature;

            /** @type {import("../src/ol/coordinate.js").Coordinate|undefined} */
            var tooltipCoord = evt.coordinate;

            listener = sketch.getGeometry().on('change', function (evt) {
                var geom = evt.target;
                var output;
                if (geom instanceof ol.geom.Polygon) {
                    output = formatArea(geom);
                    tooltipCoord = geom.getInteriorPoint().getCoordinates();
                } else if (geom instanceof ol.geom.LineString) {
                    output = formatLength(geom);
                    tooltipCoord = geom.getLastCoordinate();
                }
                measureTooltipElement.innerHTML = output;
                measureTooltip.setPosition(tooltipCoord);
            });
        });

        draw.on('drawend', function () {
            measureTooltipElement.className = 'ol-tooltip ol-tooltip-static';
            measureTooltip.setOffset([0, -7]);
            // unset sketch
            sketch = null;
            // unset tooltip so that a new one can be created
            measureTooltipElement = null;
            createMeasureTooltip();
            ol.Observable.unByKey(listener);
        });
    }

}

/**
 * Creates a new help tooltip
 */
function createHelpTooltip() {
    if (helpTooltipElement) {
        helpTooltipElement.parentNode.removeChild(helpTooltipElement);
    }
    helpTooltipElement = document.createElement('div');
    helpTooltipElement.className = 'ol-tooltip hidden';
    helpTooltip = new ol.Overlay({
        element: helpTooltipElement,
        offset: [15, 0],
        positioning: 'center-left',
    });
    map.addOverlay(helpTooltip);
}

/**
 * Creates a new measure tooltip
 */
function createMeasureTooltip() {
    if (measureTooltipElement) {
        measureTooltipElement.parentNode.removeChild(measureTooltipElement);
    }
    measureTooltipElement = document.createElement('div');
    measureTooltipElement.className = 'ol-tooltip ol-tooltip-measure';
    measureTooltip = new ol.Overlay({
        element: measureTooltipElement,
        offset: [0, -15],
        positioning: 'bottom-center',
    });
    map.addOverlay(measureTooltip);
}

/**
 * Let user change the geometry type.
 */
typeSelect.onchange = function () {
    map.removeInteraction(draw);
    addInteraction();
};

addInteraction();


//Harita KAtmanları

var baselayerGroup = new ol.layer.Group({
    layers: [
        new ol.layer.Tile({
            source: new ol.source.TileJSON({
                url: 'https://a.tiles.mapbox.com/v3/aj.1x1-degrees.json?secure=1',
                crossOrigin: '',
            }),
            title: 'MapQuestOSM',
            visible: false,

        }),
        new ol.layer.Tile({
            source: new ol.source.Stamen({ layer: 'watercolor' }),
            title: 'MapQuestHybrid',
            visible: false,
        }),
        new ol.layer.Tile({
            source: new ol.source.OSM(),
            title: 'OpenStreetMap',
            //visible: false,
        })
    ],
    zIndex: 0
});



const baseLayerElements = document.querySelectorAll('.layer > input[type=radio]');
for (let baseLayerElement of baseLayerElements) {
    baseLayerElement.addEventListener('change', function () {
        let baseLayerElementValue = this.value;
        baselayerGroup.getLayers().forEach(function (element, index, array) {
            let baseLayerTitle = element.get('title');
            element.setVisible(baseLayerTitle === baseLayerElementValue);
            //console.log('baseLayerTitle:' + baseLayerTitle, 'baseLayerElementValue')


        })
    })

}

map.addLayer(baselayerGroup);

//json verileri oku

var label_Styles = {
    red: new ol.style.Style({
        text: new ol.style.Text({
            offsetY: -20,
            //text: text,
            placement: 'point',
            textAlign: 'center',
            font: '16px Calibri,sans-serif',
            fill: new ol.style.Fill({ color: '#fff' }),
            backgroundFill: new ol.style.Fill({ color: '#b24441' }),
            padding: [6, 8, 6, 8],

        })
    }),
    orange: new ol.style.Style({
        text: new ol.style.Text({
            offsetY: -20,
            //text: text,
            placement: 'point',
            textAlign: 'center',
            font: '16px Calibri,sans-serif',
            fill: new ol.style.Fill({ color: '#fff' }),
            backgroundFill: new ol.style.Fill({ color: '#c58e40' }),
            padding: [6, 8, 6, 8],

        })
    }),
    green: new ol.style.Style({
        text: new ol.style.Text({
            offsetY: -20,
            //text: text,
            placement: 'point',
            textAlign: 'center',
            font: '16px Calibri,sans-serif',
            fill: new ol.style.Fill({ color: '#fff' }),
            backgroundFill: new ol.style.Fill({ color: '#4c974c' }),
            padding: [6, 8, 6, 8],

        })
    }),
    bos: new ol.style.Style({
        text: new ol.style.Text({
            offsetY: -50,

        })
    }),
};

function labelStyleFunction(color) {
    if (color == "#b24441") {
        return label_Styles.red;
    }
    else if (color == "#c58e40") {
        return label_Styles.orange;
    }
    else if (color == "#4c974c") {
        return label_Styles.green;
    }
    else if (color == "#") {
        return label_Styles.bos;
    }
}
function svg_value(color) {
    const Svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 102">
          <defs>
              <style>

                  .b{opacity:0.7;}.b{fill:`+ color + `;}.c{fill:` + color + `;stroke:#ffffff;stroke-miterlimit:10;stroke-width:5px;}
              </style>
          </defs>
          <polygon points="20,55,-40,-12 80,-12 " class="b" />
          <circle class="b" cx="20" cy="82" r="20" />
          <circle class="c" cx="20" cy="82" r="10" />
      </svg>`;

    return Svg;
}
var svgStyles = {
    red: new ol.style.Style({
        image: new ol.style.Icon({
            //color: '#BADA55',
            crossOrigin: 'anonymous',
            // For Internet Explorer 11
            //imgSize: [20, 20],
            src: 'data:image/svg+xml;utf8,' + escape(svg_value("#b24441")),
        }),
    }),
    green: new ol.style.Style({
        image: new ol.style.Icon({
            //color: '#BADA55',
            crossOrigin: 'anonymous',
            // For Internet Explorer 11
            //imgSize: [20, 20],
            src: 'data:image/svg+xml;utf8,' + escape(svg_value("#4c974c")),
        }),
    }),
    orange: new ol.style.Style({
        image: new ol.style.Icon({
            //color: '#BADA55',
            crossOrigin: 'anonymous',
            // For Internet Explorer 11
            //imgSize: [20, 20],
            src: 'data:image/svg+xml;utf8,' + escape(svg_value("#c58e40")),
        }),
    }),
};
function svgStyleFunction(color) {
    if (color == "#b24441") {
        return svgStyles.red;
    }
    else if (color == "#c58e40") {
        return svgStyles.orange;
    }
    else if (color == "#4c974c") {
        return svgStyles.green;
    }
}
function adding_overlay(i) {
    ////console.log(coordinates[1] + "_" + coordinates[0]);
    ////coordinates, color, text, 
    //var divid = "id_" + i;
    //var bothElements = document.querySelectorAll("[id='" + divid + "']");
    ////console.log(bothElements.length);
    //if (bothElements.length == 0) {

    var str = json_data[i];
    var coord = str.split("_")[0];
    var coordinates = [];
    coordinates.push(coord.split(",")[0]); coordinates.push(coord.split(",")[1]);
    var color = str.split("_")[1]; //console.log(color);
    var text = str.split("_")[2]; //console.log(text);

    var container = document.createElement('div');

    container.className = "ol-popup";
    container.style.cssText = "background-color: " + color + ";color:#fff";
    container.innerHTML = '<p>You located here:</p>' + text + '';
    //var sheet = document.createElement('style')
    //sheet.innerHTML = "#" + divid + " .popover-header {min-width: 116px;background-color: " + color + ";border-color: dimgrey;color: white;}" +
    //    "#" + divid + " .popover-body{min-width: 116px;background-color: " + color + ";color: white;}" +
    //    "#" + divid + " .popover .arrow {display: none;}";
    //document.body.appendChild(sheet);


    var popup = new ol.Overlay({
        position: ol.proj.fromLonLat(coordinates),
        element: container,
        positioning: 'top-center',
        stopEvent: false,
        //autoPan: true,
        //autoPanAnimation: {
        //    duration: 250,
        //},
        id: i,
        className: 'p'

    });
    map.addOverlay(popup);


    //var coordinate = ol.proj.fromLonLat(coordinates);



    //popup.setPosition(coordinate);

    //}
}
var polystyle_text = new ol.style.Style({

    text: new ol.style.Text({
        offsetY: -20,
        //text: text,
        placement: 'point',
        textAlign: 'center',
        font: '16px Calibri,sans-serif',
        fill: new ol.style.Fill({ color: '#000' }),
        backgroundFill: new ol.style.Fill({ color: '#fff' }),
        padding: [6, 8, 6, 8],

    })
});
function polystyle_text_function() {

    return polystyle_text;
}
var polystyle_color = new ol.style.Style({
    stroke: new ol.style.Stroke({
        color: 'rgba(100, 255, 0, 1)',
        width: 2,
    }),
    fill: new ol.style.Fill({
        color: 'rgba(100, 255, 0, 0.3)',
    }),

});
function polystyle_color_function() {
    return polystyle_color;
}
var clustered_marker_Style = [new ol.style.Style({
    image: new ol.style.Circle({
        radius: 15,
        stroke: new ol.style.Stroke({
            color: '#33a3ff',
            width: 4,
        }),
        fill: new ol.style.Fill({
            color: '#008cff',

        })
    }),
    text: new ol.style.Text({
        //text: size.toString(),
        fill: new ol.style.Fill({
            color: '#fff'
        })
    })
})];

var currZoom = map.getView().getZoom();

var zoomInfo = 'Zoom = ' + currZoom;
document.getElementById('zoomlevel').innerHTML = zoomInfo;


load(currZoom);

var json_data = [];

function load(zoomval) {
    $.getJSON("json.json", function (data) {
        json_data = [];
        for (var i = 0; i < data.length; i++) {
            //var overlay = map.getOverlayById(i);
            //map.removeOverlay(overlay);
            var coordinate = data[i].coordinates;
            var shape = data[i].shape;
            var text = data[i].text;
            if (shape == "circle") {

                var centerLongitudeLatitude = ol.proj.fromLonLat(coordinate, "EPSG:4326");

                var circle = new ol.geom.Circle(centerLongitudeLatitude, parseFloat(data[i].radius))
                //Circle feature class
                var feat = new ol.Feature({
                    geometry: circle,
                    name: "circle",
                    id: i
                });

                source.addFeature(feat);
                json_data.push(text);
            }
            if (shape == "polygon") {

                //Declare a new array
                var coordinatesPolygon = new Array();
                //Cycle traversal transfers longitude and latitude to the projection coordinate system of "EPSG:4326"

                coordinatesPolygon = [];
                for (var j = 0; j < coordinate.length; j++) {

                    var pointTransform = ol.proj.fromLonLat([coordinate[j][0], coordinate[j][1]], "EPSG:4326");
                    coordinatesPolygon.push(pointTransform);
                }


                //The polygon here must be an array of coordinates
                var plygon = new ol.geom.Polygon([coordinatesPolygon])
                //Polygon feature class
                var feat = new ol.Feature({
                    geometry: plygon,
                    name: "polygon",
                    id: i
                });


                source.addFeature(feat);
                json_data.push(text);
            }
            else if (shape == "marker") {
                var color = data[i].color;

                var feature = new ol.Feature({
                    geometry: new ol.geom.Point(ol.proj.fromLonLat(coordinate)),
                    name: color.substring(1, color.length) + "_" + coordinate[1] + "," + coordinate[0],
                    id: i
                });
                source_formarkers.addFeature(feature);
                json_data.push(coordinate + "_" + color + "_" + text);

            }
        }

    });


}
console.log(json_data);
var vector = new ol.layer.Vector({
    source: source,
    style: function (feature) {


        var id = feature.get('id');
        //console.log(id);


        if (currZoom > 10) {
            var style = [polystyle_text_function(), polystyle_color_function()];
            style[0].getText().setText(json_data[id]);
        }
        else
            var style = [polystyle_color_function()];


        return style;

    }
});
map.addLayer(vector);


var cluster = new ol.source.Cluster({
    distance: 40,
    source: source_formarkers
});

//var styleCache = {};
var clusterLayer = new ol.layer.Vector({
    source: cluster,
    style: function (feature) {
        var size = feature.get('features').length;
        //console.log(feature.get('features')[0])
        var style;
        //= styleCache[size];
        //if (!style) {
        //alert(size);
        if (size != 1) {
            style = clustered_marker_Style;
            style[0].getText().setText(size.toString());
            for (var i = 0; i < feature.get('features').length; i++) {
                var id = feature.get('features')[i].get('id');
                var overlay = map.getOverlayById(id);
                map.removeOverlay(overlay);
            }
        }
        else {

            var id = feature.get('features')[0].get('id');
            //feature.get('features')[0].getStyle()[0].text = json_data[id].split('_')[2];
            //style = feature.get('features')[0].getStyle();

            //console.log(feature.get('features')[0].get('id'));

            var overlay = map.getOverlayById(id);
            map.removeOverlay(overlay);
            if (currZoom > 10) {
                style = [labelStyleFunction("#"), svgStyleFunction(json_data[id].split('_')[1])]
                adding_overlay(id);
            }
            else {
                console.log(json_data[id] ); console.log(json_data[id].split('_')[1]);
                style = [labelStyleFunction(json_data[id].split('_')[1]), svgStyleFunction(json_data[id].split('_')[1])];
                style[0].getText().setText(json_data[id].split('_')[2]);
            }


        }
        //styleCache[size] = style;
        //}
        return style;
    }
});
map.addLayer(clusterLayer);

//Mouse Pozisyonu,zoom ve adres bilgisi...
var mousePositionControl = new ol.control.MousePosition({
    coordinateFormat: function (coordinate) {
        return ol.coordinate.format(coordinate, '{y}, {x}', 4);
    },
    projection: 'EPSG:4326',
    // comment the following two lines to have the mouse position
    // be placed within the map.
    className: 'custom-mouse-position',
    target: document.getElementById('mouse-position'),
    undefinedHTML: '&nbsp;',
});
map.addControl(mousePositionControl);

map.on('moveend', function (e) {
    var newZoom = map.getView().getZoom();
    if (currZoom != newZoom) {

        //source.clear();
        //source_formarkers.clear();
        //load(newZoom);
        currZoom = map.getView().getZoom();

        var zoomInfo = 'Zoom = ' + newZoom;
        document.getElementById('zoomlevel').innerHTML = zoomInfo;
    }
});

function reverseGeocode(coords) {
    fetch('http://nominatim.openstreetmap.org/reverse?format=json&lon=' + coords[0] + '&lat=' + coords[1])
        .then(function (response) {
            return response.json();
        }).then(function (json) {
            //console.log(json);
            //console.log(json.display_name);
            document.getElementById('address_info').innerHTML = json.display_name;
        });
}

map.on('click', function (evt) {
    var coord = ol.proj.toLonLat(evt.coordinate);
    reverseGeocode(coord);
});



//Marker ekleme

var lon_value = document.getElementById('lon');
var lat_value = document.getElementById('lat');

var marker_select_value = document.getElementById('marker_select');
var text_marker = document.getElementById('label_marker');
var marker_color_select_value = document.getElementById('marker_color_select');

var btn_add_marker = document.getElementById('btn_add_marker');

var imagestyle = new ol.style.Style({
    image: new ol.style.Icon( /** @type {olx.style.IconOptions} */({
        anchor: [0.5, 46],
        anchorXUnits: 'fraction',
        anchorYUnits: 'pixels',
        src: 'poi.png'
    }))
});


var label_Styles_marker = {
    red: new ol.style.Style({
        text: new ol.style.Text({
            offsetY: -20,
            //text: text,
            placement: 'point',
            textAlign: 'center',
            font: '16px Calibri,sans-serif',
            fill: new ol.style.Fill({ color: '#fff' }),
            backgroundFill: new ol.style.Fill({ color: '#b24441' }),
            padding: [6, 8, 6, 8],

        })
    }),
    orange: new ol.style.Style({
        text: new ol.style.Text({
            offsetY: -20,
            //text: text,
            placement: 'point',
            textAlign: 'center',
            font: '16px Calibri,sans-serif',
            fill: new ol.style.Fill({ color: '#fff' }),
            backgroundFill: new ol.style.Fill({ color: '#c58e40' }),
            padding: [6, 8, 6, 8],

        })
    }),
    green: new ol.style.Style({
        text: new ol.style.Text({
            offsetY: -20,
            //text: text,
            placement: 'point',
            textAlign: 'center',
            font: '16px Calibri,sans-serif',
            fill: new ol.style.Fill({ color: '#fff' }),
            backgroundFill: new ol.style.Fill({ color: '#4c974c' }),
            padding: [6, 8, 6, 8],

        })
    }),
    bos: new ol.style.Style({
        text: new ol.style.Text({
            offsetY: -50,

        })
    }),
};

function labelStyleFunction_formarkeradding(color) {
    if (color == "#b24441") {
        return label_Styles_marker.red;
    }
    else if (color == "#c58e40") {
        return label_Styles_marker.orange;
    }
    else if (color == "#4c974c") {
        return label_Styles_marker.green;
    }
    else if (color == "#") {
        return label_Styles_marker.bos;
    }
}



btn_add_marker.onclick = function () {
    console.log("deneme");
    var color = marker_color_select_value.value;
    var feature = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([lon_value.value, lat_value.value])),
        name: color.substring(1, color.length) + "_" + lat_value.value + "," + lon_value.value,
    });
    //if (marker_select_value.value == 'picture') {
    //    //if (currZoom < 7)
    //    feature.setStyle([imagestyle, label_style(text_marker.value, marker_color_select_value.value)]);
    //    //else
    //    //    feature.setStyle([imagestyle]);
    //}
    //else if (marker_select_value.value == 'drawing') {
    //console.log(currZoom);
    //if (currZoom <= 10) {
    //    feature.setStyle([labelStyleFunction_formarkeradding(color), svgStyleFunction(color)]);
    //    //feature.getStyle()[0].getText().setText(text_marker.value);
    //}
    //else
    //    feature.setStyle([svgStyleFunction(color)]);

    //}
    var vectorSource = new ol.source.Vector({
        features: [feature],

    });

    var vectorLayer = new ol.layer.Vector({
        source: vectorSource,
        style: function (feature) {
            var style;
            if (currZoom <= 10) {
                style = [labelStyleFunction_formarkeradding(color), svgStyleFunction(color)];
                style[0].getText().setText(text_marker.value);
            }
            else {
                style = [svgStyleFunction(color)];

            }

            return style;
        }
    });
    map.addLayer(vectorLayer);
    if (currZoom > 10) {
        var container = document.createElement('div');
        //container.id = "id_container_" + lat_value.value.replace(".", "_") + "_" + lon_value.value.replace(".", "_");
        container.className = "ol-popup";
        container.style.cssText = "background-color: " + marker_color_select_value.value + ";color:#fff";
        //var content = document.createElement('div');
        //content.title = lat_value.value + ", " + lon_value.value;
        //content.id = "id_" + lat_value.value.replace(".", "_") + "_" + lon_value.value.replace(".", "_");
        ////var sheet = document.createElement('style')
        ////sheet.innerHTML = "#" + "id_" + lat_value.value.replace(".", "_") + "_" + lon_value.value.replace(".", "_") + " .popover-header {min-width: 176px;background-color: " + marker_color_select_value.value + ";border-color: dimgrey;color: white;}" +
        ////    "#" + "id_" + lat_value.value.replace(".", "_") + "_" + lon_value.value.replace(".", "_") + " .popover-body{min-width: 176px;background-color: " + marker_color_select_value.value + ";color: white;}" +
        ////    "#" + "id_" + lat_value.value.replace(".", "_") + "_" + lon_value.value.replace(".", "_") + " .popover .arrow {display: none;}";
        ////document.body.appendChild(sheet);
        //container.appendChild(content);

        var popup = new ol.Overlay({
            element: container,
            autoPan: true,
            autoPanAnimation: {
                duration: 250,
            },
        });
        map.addOverlay(popup);

        //var element = popup.getElement();
        var coordinate = ol.proj.fromLonLat([lon_value.value, lat_value.value]);
        //var hdms = ol.coordinate.toStringHDMS(ol.proj.fromLonLat(coordinate));
        var text = text_marker.value;
        //console.log(text);
        //$(element).popover('dispose');
        container.innerHTML = '<p>You located here:</p>' + text + '';
        popup.setPosition(coordinate);
        //$(element).popover({
        //    container: element,
        //    placement: 'top',
        //    animation: false,
        //    html: true,
        //    content: '<p>' + text + '</p>',

        //});
        //$(element).popover('show');
    }

    //var marker_info = {
    //    shape: "marker",
    //    coordinates: [lon_value.value, lat_value.value],
    //    color: color,
    //    text: text_marker.value
    //}
    //dataaa.push(marker_info); 
    //console.log(marker_info);
};





function isCluster(feature) {
    //console.log(feature.get('features'));
    if (!feature || !feature.get('features')) {
        return false;
    }
    return feature.get('features').length > 1;
}
map.on('click', function (evt) {

    var cluster = map.forEachFeatureAtPixel(evt.pixel, function (feat) {
        return feat;
    });

    if (cluster && isCluster(cluster))
    {
        console.log("test");

        let extent = new ol.extent.createEmpty();
        cluster.get('features').forEach(function (feature) {

            extent = new ol.extent.extend(extent, feature.getGeometry().getExtent());

        });

        
        map.getView().fit(extent, {  minResolution: 50 });

    }


})


///* Add a pointermove handler to the map to render the popup.*/
map.on('pointermove', function (evt) {

    var div = document.getElementById('popup');
    //div.title = lat_value.value + ", " + lon_value.value;
    //div.id = "id_" + lat_value.value + "_" + lon_value.value;
    //var sheet = document.createElement('style')
    //sheet.innerHTML = "#" + "id_" + lat_value.value + "_" + lon_value.value + " .popover-header {min-width: 176px;background-color: " + markerrenksecim_value.value + ";border-color: dimgrey;color: white;}" +
    //    "#" + "id_" + lat_value.value + "_" + lon_value.value + " .popover-body{min-width: 176px;background-color: " + markerrenksecim_value.value + ";color: white;}" +
    //    "#" + "id_" + lat_value.value + "_" + lon_value.value + " .popover .arrow {display: none;}";
    //document.body.appendChild(sheet);


    var popup = new ol.Overlay({
        element: div,
        //positioning: "top-right"
        autoPan: true,
        autoPanAnimation: {
            duration: 250,
        },
    });
    map.addOverlay(popup);


    var cluster = map.forEachFeatureAtPixel(evt.pixel, function (feat) {
        return feat;
    });
    console.log(cluster.get('name')+"aaaaaa");
    if (cluster && isCluster(cluster)) {
        //var coordinate = evt.coordinate;    //default projection is EPSG:3857 you may want to use ol.proj.transform
        //// list all the features in the cluster
        //content.innerHTML = '<div>';
        //cluster.get('features').forEach(function (feature) {
        //    console.log(feature.get('name') + '<br>');
        //    content.innerHTML += (feature.get('name') + '<br>');
        //}); content.innerHTML += '</div>';
        //popup.setPosition(coordinate);



        var element = popup.getElement();
        var coordinate = ol.extent.getTopRight(map.getView().calculateExtent(map.getSize()));


        var text = "";
        cluster.get('features').forEach(function (feature) {
            //console.log(feature.get('name') + '<br>');
            var color = feature.get('name').split("_")[0];
            var text_ = feature.get('name').split("_")[1];
            text += ('<img src="colors/' + color + '.png"/>' + ' ' + text_ + '<br>');
            //console.log(text);
            //text += '<img src="4c974c.png"/>';
        });
        //console.log(text);

        //console.log(text);
        $(element).popover('dispose');
        popup.setPosition([coordinate[0] - 10000, coordinate[1]]);
        $(element).popover({
            container: element,
            placement: 'top',
            animation: false,
            html: true,
            content: '<p>' + text + '</p>',

        });
        $(element).popover('show');
    }
    else if (cluster && cluster.get('name') != "polygon" && cluster.get('name') != "circle") {
        //normalde burası bir önceki ifle birleştirilebilir kodlar aynı fakat text kısmına farkli bilgiler çekilebilir diye ayrı tuttum.
        var element = popup.getElement();
        var coordinate = ol.extent.getTopRight(map.getView().calculateExtent(map.getSize()));

        var text = "";
        if (cluster.get('features')) {
            cluster.get('features').forEach(function (feature) {
                //console.log(feature.get('name') + '<br>');
                var color = feature.get('name').split("_")[0];
                var text_ = feature.get('name').split("_")[1];
                text += ('<img src="colors/' + color + '.png"/>' + ' ' + text_ + '<br>');
                //console.log(text);
                //text += '<img src="4c974c.png"/>';
            });
        }
        else {
            var color = cluster.get('name').split("_")[0];
            var text_ = cluster.get('name').split("_")[1];
            text += ('<img src="colors/' + color + '.png"/>' + ' ' + text_ + '<br>');
        }


        $(element).popover('dispose');
        popup.setPosition([coordinate[0] - 10000, coordinate[1]]);
        $(element).popover({
            container: element,
            placement: 'top',
            animation: false,
            html: true,
            content: '<p>' + text + '</p>',

        });
        $(element).popover('show');
    }
    else {
        popup.setPosition(undefined);
    }
});



//Bölge Tanımlama
var btn_go = document.getElementById('btn_go');

btn_go.onclick = function () {
    var lat_select = document.getElementById('lat_select');
    var lon_select = document.getElementById('lon_select');



    map.getView().setCenter(ol.proj.fromLonLat([lon_select.value, lat_select.value]));
    map.getView().setZoom(13);





    var feature = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([lon_select.value, lat_select.value])),
    });

    var imagestyle = new ol.style.Style({
        image: new ol.style.Icon( /** @type {olx.style.IconOptions} */({
            anchor: [0.5, 46],
            anchorXUnits: 'fraction',
            anchorYUnits: 'pixels',
            src: 'pin.png'
        }))
    });

    feature.setStyle([imagestyle]);


    var vectorSource = new ol.source.Vector({
        features: [feature],
    });

    var vectorLayer = new ol.layer.Vector({
        source: vectorSource,

    });
    map.addLayer(vectorLayer);


}


// math utilities

// coordinates; will return the length of the [a, b] segment
function length(a, b) {
    return Math.sqrt(
        (b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1])
    );
}

// coordinates; will return true if c is on the [a, b] segment
function isOnSegment(c, a, b) {
    var lengthAc = length(a, c);
    var lengthAb = length(a, b);
    var dot =
        ((c[0] - a[0]) * (b[0] - a[0]) + (c[1] - a[1]) * (b[1] - a[1])) / lengthAb;
    return Math.abs(lengthAc - dot) < 1e-6 && lengthAc < lengthAb;
}

// modulo for negative values, eg: mod(-1, 4) returns 3
function mod(a, b) {
    return ((a % b) + b) % b;
}

// returns a coordinates array which contains the segments of the feature's
// outer ring between the start and end points
// Note: this assumes the base feature is a single polygon
function getPartialRingCoords(feature, startPoint, endPoint) {
    var polygon = feature.getGeometry();
    if (polygon.getType() === 'MultiPolygon') {
        polygon = polygon.getPolygon(0);
    }
    var ringCoords = polygon.getLinearRing().getCoordinates();

    var i,
        pointA,
        pointB,
        startSegmentIndex = -1;
    for (i = 0; i < ringCoords.length; i++) {
        pointA = ringCoords[i];
        pointB = ringCoords[mod(i + 1, ringCoords.length)];

        // check if this is the start segment dot product
        if (isOnSegment(startPoint, pointA, pointB)) {
            startSegmentIndex = i;
            break;
        }
    }

    var cwCoordinates = [];
    var cwLength = 0;
    var ccwCoordinates = [];
    var ccwLength = 0;

    // build clockwise coordinates
    for (i = 0; i < ringCoords.length; i++) {
        pointA =
            i === 0
                ? startPoint
                : ringCoords[mod(i + startSegmentIndex, ringCoords.length)];
        pointB = ringCoords[mod(i + startSegmentIndex + 1, ringCoords.length)];
        cwCoordinates.push(pointA);

        if (isOnSegment(endPoint, pointA, pointB)) {
            cwCoordinates.push(endPoint);
            cwLength += length(pointA, endPoint);
            break;
        } else {
            cwLength += length(pointA, pointB);
        }
    }

    // build counter-clockwise coordinates
    for (i = 0; i < ringCoords.length; i++) {
        pointA = ringCoords[mod(startSegmentIndex - i, ringCoords.length)];
        pointB =
            i === 0
                ? startPoint
                : ringCoords[mod(startSegmentIndex - i + 1, ringCoords.length)];
        ccwCoordinates.push(pointB);

        if (isOnSegment(endPoint, pointA, pointB)) {
            ccwCoordinates.push(endPoint);
            ccwLength += length(endPoint, pointB);
            break;
        } else {
            ccwLength += length(pointA, pointB);
        }
    }
    // keep the shortest path
    return ccwLength < cwLength ? ccwCoordinates : cwCoordinates;
}

// features in this layer will be snapped to
var baseVector = new ol.layer.Vector({
    source: new ol.source.Vector({
        format: new ol.format.GeoJSON(),
        url:
            "https://ahocevar.com/geoserver/wfs?service=wfs&request=getfeature&typename=topp:states&cql_filter=STATE_NAME='Idaho'&outputformat=application/json",
    }),
});

// this is were the drawn features go
var drawVector = new ol.layer.Vector({
    source: new ol.source.Vector(),

});
function drawVectorstyle(textzone) {

    var style = new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'rgba(100, 255, 0, 1)',
            width: 2,
        }),
        fill: new ol.style.Fill({
            color: 'rgba(100, 255, 0, 0.3)',
        }),
        text: new ol.style.Text({
            offsetY: -20,
            text: textzone,
            placement: 'point',
            textAlign: 'center',
            font: '16px Calibri,sans-serif',
            fill: new ol.style.Fill({ color: '#000' }),
            backgroundFill: new ol.style.Fill({ color: '#fff' }),
            padding: [6, 8, 6, 8]
        })
    });
    return style;
}

var namezone = document.getElementById('namezone');
drawVector.setStyle(drawVectorstyle(namezone.value));

// this line only appears when we're tracing a feature outer ring
var previewLine = new ol.Feature({
    geometry: new ol.geom.LineString([]),
});
var previewVector = new ol.layer.Vector({
    source: new ol.source.Vector({
        features: [previewLine],
    }),
    style: new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'rgba(255, 0, 0, 1)',
            width: 2,
        }),
    }),
});

var Group = new ol.layer.Group({
    layers: [baseVector, drawVector, previewVector]
});

map.addLayer(Group);

var drawInteraction, tracingFeature, startPoint, endPoint;
var drawing = false;

var getFeatureOptions = {
    hitTolerance: 10,
    layerFilter: function (layer) {
        return layer === baseVector;
    },
};

// the click event is used to start/end tracing around a feature
map.on('click', function (event) {
    if (!drawing) {
        return;
    }

    var hit = false;
    map.forEachFeatureAtPixel(
        event.pixel,
        function (feature) {
            if (tracingFeature && feature !== tracingFeature) {
                return;
            }

            hit = true;
            var coord = map.getCoordinateFromPixel(event.pixel);

            // second click on the tracing feature: append the ring coordinates
            if (feature === tracingFeature) {
                endPoint = tracingFeature.getGeometry().getClosestPoint(coord);
                var appendCoords = getPartialRingCoords(
                    tracingFeature,
                    startPoint,
                    endPoint
                );
                drawInteraction.removeLastPoint();
                drawInteraction.appendCoordinates(appendCoords);
                tracingFeature = null;
            }

            // start tracing on the feature ring
            tracingFeature = feature;
            startPoint = tracingFeature.getGeometry().getClosestPoint(coord);
        },
        getFeatureOptions
    );

    if (!hit) {
        // clear current tracing feature & preview
        previewLine.getGeometry().setCoordinates([]);
        tracingFeature = null;
    }
});

// the pointermove event is used to show a preview of the result of the tracing
map.on('pointermove', function (event) {

    if (tracingFeature && drawing) {
        var coord = null;
        map.forEachFeatureAtPixel(
            event.pixel,
            function (feature) {
                if (tracingFeature === feature) {
                    coord = map.getCoordinateFromPixel(event.pixel);
                }
            },
            getFeatureOptions
        );

        var previewCoords = [];
        if (coord) {

            endPoint = tracingFeature.getGeometry().getClosestPoint(coord);
            previewCoords = getPartialRingCoords(
                tracingFeature,
                startPoint,
                endPoint
            );
        }
        previewLine.getGeometry().setCoordinates(previewCoords);
    }
});

var snapInteraction = new ol.interaction.Snap({
    source: baseVector.getSource(),
});

var typezone = document.getElementById('typezone');

function addInteraction_zone() {
    var value = typezone.value;
    if (value !== 'None') {
        drawInteraction = new ol.interaction.Draw({
            source: drawVector.getSource(),
            type: typezone.value,
        });
        drawInteraction.on('drawstart', function () {
            drawing = true;
        });
        drawInteraction.on('drawend', function (evt) {
            drawing = false;
            previewLine.getGeometry().setCoordinates([]);
            tracingFeature = null;

            //console.log(evt.feature.getGeometry().getCoordinates());

            //console.log(evt.feature.getGeometry().getRadius());//for circle...
            //console.log(evt.feature.getGeometry().getCenter());//for circle...
        });
        map.addInteraction(drawInteraction);
        map.addInteraction(snapInteraction);
    }
}

typezone.onchange = function () {
    var namezone = document.getElementById('namezone');
    drawVector.setStyle(drawVectorstyle(namezone.value));
    map.removeInteraction(drawInteraction);
    map.removeInteraction(snapInteraction);
    addInteraction_zone();
};
addInteraction_zone();

//escape tuş event'i
$(document).keyup(function (e) {
    //if (e.keyCode === 13) $('.save').click();     // enter
    if (e.keyCode === 27) {
        //console.log("esc");
        //alan çizimiminden çıkış yapmak için...
        map.removeInteraction(drawInteraction);
        map.removeInteraction(snapInteraction);
        typezone.value = "None";
        //ölçüm yapılan çizimden çıkış yapmak için...
        map.removeInteraction(draw);
        type.value = "None";
    }
});
//harita yenile
//var view = map.getView();
//var zoom = view.getZoom();
//var center = view.getCenter();
//var rotation = view.getRotation();

var btn_refresh_map = document.getElementById('btn_refresh_map');
btn_refresh_map.onclick = function () {


    //view.setCenter(center);
    //view.setRotation(rotation);
    //view.setZoom(zoom);


    source.clear();
    source_formarkers.clear();
    load(currZoom);
}

//ekranı kaydet
var btn_record_screen = document.getElementById('btn_record_screen');
btn_record_screen.onclick = function () {

    localStorage.newZoom = map.getView().getZoom();

    localStorage.newCenterlon = map.getView().getCenter()[0];
    localStorage.newCenterlat = map.getView().getCenter()[1];

}
var btn_fit_map = document.getElementById('btn_fit_map');
btn_fit_map.onclick = function () {
    //console.log(source.getFeatures().length);
    //var feature = source.getFeatures()[0];
    //var point = feature.getGeometry(); console.log(point);
    //view.fit(point, { padding: [170, 50, 30, 150], minResolution: 50 });

    let extent = new ol.extent.createEmpty();
    source.getFeatures().forEach(function (feature) {
        //add extent of every feature to the extent
        extent = new ol.extent.extend(extent, feature.getGeometry().getExtent());
    });
    source_formarkers.getFeatures().forEach(function (feature) {
        //add extent of every feature to the extent
        extent = new ol.extent.extend(extent, feature.getGeometry().getExtent());
    });
    map.getView().fit(extent, { padding: [170, 50, 30, 150], minResolution: 50 });


}

var btn_zoom_out = document.getElementById('btn_zoom_out');
btn_zoom_out.onclick = function () {
    var view = map.getView();
    var zoom = view.getZoom();
    view.setZoom(zoom - 1);

}
var btn_zoom_in = document.getElementById('btn_zoom_in');
btn_zoom_in.onclick = function () {
    var view = map.getView();
    var zoom = view.getZoom();
    view.setZoom(zoom + 1);


}