"use strict";

const React = require("react");
const { View, Text, StyleSheet } = require("react-native");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 200,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4f1ee",
    borderRadius: 12,
    padding: 16,
  },
  text: {
    color: "#b8ada4",
    fontSize: 13,
    textAlign: "center",
  },
});

function MapView(props) {
  return React.createElement(
    View,
    { style: [styles.container, props && props.style] },
    React.createElement(
      Text,
      { style: styles.text },
      "Map preview is not available on the web build."
    ),
    props && props.children ? props.children : null
  );
}

function noop() {
  return null;
}

const Marker = noop;
const Callout = noop;
const Polygon = noop;
const Polyline = noop;
const Circle = noop;
const Overlay = noop;
const Heatmap = noop;
const Geojson = noop;

const PROVIDER_GOOGLE = "google";
const PROVIDER_DEFAULT = "default";

module.exports = MapView;
module.exports.default = MapView;
module.exports.MapView = MapView;
module.exports.Marker = Marker;
module.exports.Callout = Callout;
module.exports.Polygon = Polygon;
module.exports.Polyline = Polyline;
module.exports.Circle = Circle;
module.exports.Overlay = Overlay;
module.exports.Heatmap = Heatmap;
module.exports.Geojson = Geojson;
module.exports.PROVIDER_GOOGLE = PROVIDER_GOOGLE;
module.exports.PROVIDER_DEFAULT = PROVIDER_DEFAULT;
