import { useEffect, useRef, useState } from 'react';
import type * as LeafletType from 'leaflet';
import { useStore } from '@/lib/store';
import { convertDistance, convertSpeed } from '@/utils/units';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spinner } from '@/components/ui/spinner';

import 'leaflet/dist/leaflet.css';
import { getTileServerUrl } from '@/lib/api';

const POLYLINE_OPACITY = 0.6;
const POLYLINE_WEIGHT = 3;

const CIRCLE_FILL_OPACITY = 0.25;
const CIRCLE_WEIGHT = 0;

const ACCURACY_CIRCLE_RANGE = 5;

const formatProvider = (provider: string): string => {
  const providerMap: Record<string, string> = {
    gps: 'GPS',
    network: 'Network',
  };
  return providerMap[provider] ?? provider;
};

const calculateZoomLevel = (accuracy?: number): number => {
  if (!accuracy) return 16;

  // accuracy < 100m: zoom 16-17 (street level)
  // accuracy 100-500m: zoom 14-15
  // accuracy 500-2000m: zoom 12-13
  // accuracy > 2000m: zoom 10-11
  const zoom = Math.max(
    10,
    Math.min(17, 17 - Math.floor(Math.log2(accuracy / 100)))
  );
  return zoom;
};

export const LocationMap = () => {
  const { locations, units, currentLocationIndex, isLocationsLoading } =
    useStore();

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletType.Map | null>(null);
  const leafletRef = useRef<typeof LeafletType | null>(null);

  const tileLayerRef = useRef<LeafletType.TileLayer | null>(null);
  const markersLayerRef = useRef<LeafletType.LayerGroup | null>(null);
  const accuracyCirclesLayerRef = useRef<LeafletType.LayerGroup | null>(null);
  const polylineRef = useRef<LeafletType.Polyline | null>(null);
  const selectedIconRef = useRef<LeafletType.Icon | null>(null);

  const locationCacheRef = useRef<Set<number>>(new Set());
  const lastLocationRef = useRef<{ lat: number; lon: number } | null>(null);

  const { mapPrimaryColor, mapAccentColor } = useThemeColors();
  const [mapReady, setMapReady] = useState(false);

  const [tileServerUrl, setTileServerUrl] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const url = await getTileServerUrl();
        setTileServerUrl(url);
      } catch {
        setTileServerUrl('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
      }
    })();
  }, []);

  // The basic map view
  useEffect(() => {
    if (
      !mapRef.current ||
      mapInstanceRef.current ||
      isLocationsLoading ||
      !tileServerUrl
    ) {
      return;
    }

    const loadLeaflet = async () => {
      if (!leafletRef.current) {
        const L = await import('leaflet');
        leafletRef.current = L.default;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: '/marker-icon-2x.png',
          iconUrl: '/marker-icon.png',
          shadowUrl: '/marker-shadow.png',
        });

        selectedIconRef.current = new L.Icon({
          iconRetinaUrl: '/marker-icon-2x.png',
          iconUrl: '/marker-icon.png',
          shadowUrl: '/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
          className: 'marker-selected',
        });
      }

      if (!mapInstanceRef.current && mapRef.current) {
        const firstLocation = locations[0];
        const initialView: [number, number] = firstLocation
          ? [firstLocation.lat, firstLocation.lon]
          : [20, 0];
        const initialZoom = firstLocation
          ? calculateZoomLevel(firstLocation.accuracy)
          : 2;

        mapInstanceRef.current = leafletRef.current
          .map(mapRef.current)
          .setView(initialView, initialZoom);

        markersLayerRef.current = leafletRef.current
          .layerGroup()
          .addTo(mapInstanceRef.current);

        accuracyCirclesLayerRef.current = leafletRef.current
          .layerGroup()
          .addTo(mapInstanceRef.current);

        tileLayerRef.current = leafletRef.current
          .tileLayer(tileServerUrl, {
            attribution:
              '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
          })
          .addTo(mapInstanceRef.current);

        if (mapInstanceRef.current.attributionControl) {
          mapInstanceRef.current.attributionControl.setPrefix('');
        }

        setMapReady(true);
      }
    };

    void loadLeaflet();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocationsLoading, tileServerUrl]);

  // The markers shown on the map
  useEffect(() => {
    if (
      !mapInstanceRef.current ||
      !leafletRef.current ||
      !markersLayerRef.current ||
      !accuracyCirclesLayerRef.current ||
      locations.length === 0
    )
      return;

    const location = locations[currentLocationIndex];
    if (!location) return;

    const { lat, lon } = location;

    locationCacheRef.current.add(currentLocationIndex);

    const cachedIndices = Array.from(locationCacheRef.current).sort(
      (a, b) => a - b
    );
    const cachedLocations = cachedIndices.map((idx) => locations[idx]);

    markersLayerRef.current.clearLayers();
    accuracyCirclesLayerRef.current.clearLayers();
    if (polylineRef.current) {
      polylineRef.current.remove();
    }

    const latLngs: [number, number][] = cachedLocations.map((loc) => [
      loc.lat,
      loc.lon,
    ]);

    if (latLngs.length > 1) {
      polylineRef.current = leafletRef.current
        .polyline(latLngs, {
          color: mapPrimaryColor,
          weight: POLYLINE_WEIGHT,
          opacity: POLYLINE_OPACITY,
        })
        .addTo(mapInstanceRef.current);
    }

    for (let i = 0; i < cachedIndices.length; i++) {
      const idx = cachedIndices[i];
      const loc = cachedLocations[i];
      const isCurrentLocation = idx === currentLocationIndex;

      const marker = leafletRef.current
        .marker(
          [loc.lat, loc.lon],
          isCurrentLocation && selectedIconRef.current
            ? { icon: selectedIconRef.current, zIndexOffset: 1000 }
            : {}
        )
        .addTo(markersLayerRef.current)
        .bindPopup(
          `
        <div style="min-width: 5rem;">
          <strong>Time:</strong> ${new Date(loc.date).toLocaleString()}<br/>
          <strong>Battery:</strong> ${loc.bat}%<br/>
          <strong>Provider:</strong> ${formatProvider(loc.provider)}<br/>
          ${loc.accuracy ? `<strong>Accuracy:</strong> ${convertDistance(loc.accuracy, units)}<br/>` : ''}
          ${loc.altitude !== undefined ? `<strong>Altitude:</strong> ${convertDistance(loc.altitude, units)}<br/>` : ''}
          ${loc.speed !== undefined ? `<strong>Speed:</strong> ${convertSpeed(loc.speed, units)}<br/>` : ''}
          ${loc.bearing !== undefined ? `<strong>Bearing:</strong> ${loc.bearing.toFixed(0)}°` : ''}
        </div>
      `,
          { autoClose: false, closeOnClick: false, closeButton: false }
        );

      marker.on('mouseover', () => {
        marker.openPopup();
      });
      marker.on('mouseout', () => {
        marker.closePopup();
      });

      // show accuracy circles only for locations within ACCURACY_CIRCLE_RANGE of current
      if (
        loc.accuracy &&
        idx >= currentLocationIndex - ACCURACY_CIRCLE_RANGE &&
        idx <= currentLocationIndex + ACCURACY_CIRCLE_RANGE
      ) {
        const circleColor = isCurrentLocation
          ? mapAccentColor
          : mapPrimaryColor;

        leafletRef.current
          .circle([loc.lat, loc.lon], {
            radius: loc.accuracy,
            color: circleColor,
            fillColor: circleColor,
            fillOpacity: CIRCLE_FILL_OPACITY,
            weight: CIRCLE_WEIGHT,
          })
          .addTo(accuracyCirclesLayerRef.current);
      }
    }

    const locationChanged =
      lastLocationRef.current === null ||
      lastLocationRef.current.lat !== lat ||
      lastLocationRef.current.lon !== lon;

    if (locationChanged) {
      if (locationCacheRef.current.size === 1) {
        const zoom = calculateZoomLevel(location.accuracy);
        mapInstanceRef.current.setView([lat, lon], zoom);
      } else {
        mapInstanceRef.current.panTo([lat, lon]);
      }
      lastLocationRef.current = { lat, lon };
    }
  }, [currentLocationIndex, units, locations, mapAccentColor, mapReady]);

  return (
    <div className="bg-fmd-light dark:bg-fmd-dark relative flex h-full w-full flex-col rounded-lg">
      <div ref={mapRef} className="relative flex-1 rounded-lg" />

      {isLocationsLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80">
          <Spinner />
        </div>
      )}
    </div>
  );
};
