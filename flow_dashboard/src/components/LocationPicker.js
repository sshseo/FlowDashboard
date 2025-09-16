import React, { useEffect, useRef, useState } from 'react';
import { X, MapPin } from 'lucide-react';

const LocationPicker = ({ isOpen, onClose, onLocationSelect, initialLocation = null }) => {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [map, setMap] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    if (isOpen && mapRef.current && window.kakao && window.kakao.maps) {
      // 카카오맵 서비스 로드 대기
      const loadKakaoServices = () => {
        if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
          initializeMap();
        } else {
          // 서비스가 로드되지 않았으면 잠시 후 재시도
          setTimeout(loadKakaoServices, 100);
        }
      };
      loadKakaoServices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // 모달이 열려있을 때 body 스크롤 비활성화
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const initializeMap = () => {
    const { kakao } = window;

    // 초기 위치 설정 (기본: 서울시청)
    const initialLat = initialLocation?.lat || 37.5665;
    const initialLng = initialLocation?.lng || 126.9780;

    const mapOption = {
      center: new kakao.maps.LatLng(initialLat, initialLng),
      level: 8 // 확대 레벨
    };

    const kakaoMap = new kakao.maps.Map(mapRef.current, mapOption);
    setMap(kakaoMap);

    // 초기 마커 설정
    if (initialLocation) {
      const initialMarker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(initialLocation.lat, initialLocation.lng),
        map: kakaoMap
      });
      markerRef.current = initialMarker;
      setSelectedLocation(initialLocation);
    }

    // 지도 클릭 이벤트
    kakao.maps.event.addListener(kakaoMap, 'click', (mouseEvent) => {
      const latlng = mouseEvent.latLng;
      const lat = latlng.getLat();
      const lng = latlng.getLng();

      // 기존 마커 제거
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }

      // 새 마커 생성
      const newMarker = new kakao.maps.Marker({
        position: latlng,
        map: kakaoMap
      });

      markerRef.current = newMarker;
      setSelectedLocation({ lat, lng });

      // 주소 가져오기 (역지오코딩)
      getAddressFromCoords(lat, lng);
    });
  };

  const getAddressFromCoords = (lat, lng) => {
    const { kakao } = window;

    // 서비스가 로드되었는지 확인
    if (!kakao?.maps?.services?.Geocoder) {
      console.warn('카카오맵 Geocoder 서비스가 로드되지 않았습니다.');
      return;
    }

    const geocoder = new kakao.maps.services.Geocoder();

    geocoder.coord2Address(lng, lat, (result, status) => {
      if (status === kakao.maps.services.Status.OK) {
        const address = result[0]?.address?.address_name || '';
        setSelectedLocation(prev => ({ ...prev, address }));
      }
    });
  };

  const handleConfirm = () => {
    if (selectedLocation && onLocationSelect) {
      onLocationSelect({
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        address: selectedLocation.address || ''
      });
    }
    onClose();
  };

  const searchAddresses = (keyword) => {
    if (!keyword.trim()) {
      setSearchResults([]);
      return;
    }

    // 먼저 주소 검색 시도 (Geocoder)
    if (window.kakao?.maps?.services?.Geocoder) {
      const geocoder = new window.kakao.maps.services.Geocoder();

      geocoder.addressSearch(keyword, (result, status) => {
        if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
          const addressResults = result.slice(0, 5).map((addr, index) => ({
            id: `addr_${index}`,
            place_name: addr.address_name,
            address_name: addr.address_name,
            road_address_name: addr.road_address ? addr.road_address.address_name : null,
            x: parseFloat(addr.x),
            y: parseFloat(addr.y)
          }));
          setSearchResults(addressResults);
        } else {
          // 주소 검색 실패시 장소명으로 재검색
          searchByPlaceName(keyword);
        }
      });
    } else {
      // Geocoder 없으면 장소명으로 검색
      searchByPlaceName(keyword);
    }
  };

  const searchByPlaceName = (keyword) => {
    if (!window.kakao?.maps?.services?.Places) {
      setSearchResults([]);
      return;
    }

    const places = new window.kakao.maps.services.Places();

    places.keywordSearch(keyword, (result, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        const results = result.slice(0, 5).map(place => ({
          id: place.id,
          place_name: place.place_name,
          address_name: place.address_name,
          road_address_name: place.road_address_name,
          x: parseFloat(place.x),
          y: parseFloat(place.y)
        }));
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    });
  };

  const handleSearchResult = (result) => {
    if (map) {
      const moveLatLng = new window.kakao.maps.LatLng(result.y, result.x);
      map.setCenter(moveLatLng);

      // 기존 마커 제거
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }

      // 새 마커 생성
      const newMarker = new window.kakao.maps.Marker({
        position: moveLatLng,
        map: map
      });

      markerRef.current = newMarker;
      setSelectedLocation({
        lat: result.y,
        lng: result.x,
        address: result.road_address_name || result.address_name
      });
      setSearchResults([]);
      setSearchKeyword('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchAddresses(searchKeyword);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-500" />
              <h3 className="text-lg font-semibold">위치 선택</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="mb-4">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="주소나 장소명을 입력하세요"
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => searchAddresses(searchKeyword)}
                className="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                검색
              </button>
            </div>

            {/* 검색 결과 */}
            {searchResults.length > 0 && (
              <div className="mb-3 max-h-32 overflow-y-auto border border-gray-200 rounded">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    onClick={() => handleSearchResult(result)}
                    className="p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-sm">{result.place_name}</div>
                    <div className="text-xs text-gray-600">
                      {result.road_address_name || result.address_name}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="text-sm text-gray-600">
              주소를 검색하거나 지도를 클릭하여 위치를 선택해주세요
            </div>
          </div>

          {/* 지도 컨테이너 */}
          <div
            ref={mapRef}
            className="w-full h-96 border rounded-lg"
          />

          {/* 선택된 위치 정보 */}
          {selectedLocation && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm">
                <div className="font-medium">선택된 위치:</div>
                <div>위도: {selectedLocation.lat?.toFixed(6)}</div>
                <div>경도: {selectedLocation.lng?.toFixed(6)}</div>
                {selectedLocation.address && (
                  <div>주소: {selectedLocation.address}</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedLocation}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            선택 완료
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationPicker;