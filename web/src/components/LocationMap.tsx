import { useEffect, useRef, useState } from 'react';
import type * as LeafletType from 'leaflet';
import { useStore } from '@/lib/store';
import { convertDistance, convertSpeed } from '@/utils/units';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spinner } from '@/components/ui/spinner';

import 'leaflet/dist/leaflet.css';

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
  const markerRef = useRef<LeafletType.Marker | null>(null);
  const circleRef = useRef<LeafletType.Circle | null>(null);
  const leafletRef = useRef<typeof LeafletType | null>(null);
  const lastLocationRef = useRef<{ lat: number; lon: number } | null>(null);
  const tileLayerRef = useRef<LeafletType.TileLayer | null>(null);
  const { accentColor } = useThemeColors();
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || isLocationsLoading) {
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

        const selectedIcon = new L.Icon({
          iconRetinaUrl: '/marker-icon-2x.png',
          iconUrl: '/marker-icon.png',
          shadowUrl: '/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
          className: 'marker-selected',
        });
        (
          leafletRef.current as typeof L & { selectedIcon?: L.Icon }
        ).selectedIcon = selectedIcon;
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

        tileLayerRef.current = leafletRef.current
          .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
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
  }, [isLocationsLoading]);

  useEffect(() => {
    if (
      !mapInstanceRef.current ||
      !leafletRef.current ||
      locations.length === 0
    )
      return;

    const location = locations[currentLocationIndex];
    if (!location) return;

    const { lat, lon } = location;

    // Force update if this is the first location (map was initialized at default position)
    const isFirstLocation = lastLocationRef.current === null;
    const locationChanged =
      isFirstLocation ||
      (lastLocationRef.current !== null &&
        (lastLocationRef.current.lat !== lat ||
          lastLocationRef.current.lon !== lon));

    if (markerRef.current) {
      markerRef.current.remove();
    }
    if (circleRef.current) {
      circleRef.current.remove();
    }

    markerRef.current = leafletRef.current
      .marker([lat, lon], {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        icon: (leafletRef.current as any).selectedIcon,
      })
      .addTo(mapInstanceRef.current)
      .bindPopup(
        `
        <div style="min-width: 5rem;">
          <strong>Time:</strong> ${new Date(location.date).toLocaleString()}<br/>
          <strong>Battery:</strong> ${location.bat}%<br/>
          ${location.provider ? `<strong>Provider:</strong> ${formatProvider(location.provider)}<br/>` : ''}
          ${location.accuracy ? `<strong>Accuracy:</strong> ${convertDistance(location.accuracy, units)}<br/>` : ''}
          ${location.altitude !== undefined ? `<strong>Altitude:</strong> ${convertDistance(location.altitude, units)}<br/>` : ''}
          ${location.speed !== undefined ? `<strong>Speed:</strong> ${convertSpeed(location.speed, units)}<br/>` : ''}
          ${location.bearing !== undefined ? `<strong>Bearing:</strong> ${location.bearing.toFixed(0)}°` : ''}
        </div>
      `,
        { autoClose: false, closeOnClick: false, closeButton: false }
      );

    markerRef.current.on('mouseover', () => {
      markerRef.current?.openPopup();
    });
    markerRef.current.on('mouseout', () => {
      markerRef.current?.closePopup();
    });

    if (location.accuracy) {
      circleRef.current = leafletRef.current
        .circle([lat, lon], {
          radius: location.accuracy,
          color: accentColor,
          fillColor: accentColor,
          fillOpacity: 0.1,
          weight: 2,
        })
        .addTo(mapInstanceRef.current);
    }

    if (locationChanged) {
      const zoom = calculateZoomLevel(location.accuracy);
      mapInstanceRef.current.setView([lat, lon], zoom);
      lastLocationRef.current = { lat, lon };
    }
  }, [currentLocationIndex, units, locations, accentColor, mapReady]);

  return (
    <div className="bg-fmd-light dark:bg-fmd-dark relative flex h-full w-full flex-col rounded-lg">
      <div ref={mapRef} className="relative flex-1" />
      {isLocationsLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80">
          <Spinner />
        </div>
      )}
    </div>
  );
};
