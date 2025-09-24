import React, { useEffect, useState, useRef } from 'react'
import { MapLoading } from '../common/Loading'
import { MapError } from '../common/ErrorMessage'

export default function KakaoMap({ flowInfo }) {
  const mapRef = useRef(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    if (window.kakao && window.kakao.maps) {
      setIsLoaded(true)
      return
    }

    const existingScript = document.querySelector('script[src*="dapi.kakao.com"]')

    if (existingScript) {
      const checkKakao = setInterval(() => {
        if (window.kakao && window.kakao.maps) {
          clearInterval(checkKakao)
          window.kakao.maps.load(() => {
            setIsLoaded(true)
          })
        }
      }, 100)

      return () => clearInterval(checkKakao)
    }

    const script = document.createElement('script')
    script.async = true
    const apiKey = process.env.REACT_APP_KAKAO_API_KEY
    if (!apiKey) {
      setLoadError('카카오맵 API 키가 설정되지 않았습니다')
      return
    }
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false`

    script.onload = () => {
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => {
          setIsLoaded(true)
          setLoadError(null)
        })
      } else {
        setLoadError('카카오맵 객체를 찾을 수 없습니다')
      }
    }

    script.onerror = () => {
      setLoadError('카카오맵 스크립트 로드에 실패했습니다')
    }

    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!isLoaded || !flowInfo || !mapRef.current) return

    try {
      const lat = flowInfo.flow_latitude
      const lng = flowInfo.flow_longitude

      if (!lat || !lng) return

      const container = mapRef.current
      const options = {
        center: new window.kakao.maps.LatLng(lat, lng),
        level: 3,
        draggable: true,
        scrollwheel: true,
        doubleClickZoom: true
      }

      const map = new window.kakao.maps.Map(container, options)
      const markerPosition = new window.kakao.maps.LatLng(lat, lng)
      const marker = new window.kakao.maps.Marker({
        position: markerPosition,
        title: `${flowInfo.flow_name} 모니터링 지점`
      })

      marker.setMap(map)

      // CustomOverlay를 사용하여 크기 조절 가능한 박스 생성
      const customOverlay = new window.kakao.maps.CustomOverlay({
        content: `
          <div style="
            background: white;
            border: 1px solid #ccc;
            border-radius: 6px;
            padding: 4px 8px;
            font-size: 12px;
            text-align: center;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            position: relative;
            display: inline-block;
          ">
            <strong style="color:#2563eb;">${flowInfo.flow_name}</strong>
            <div style="
              position: absolute;
              bottom: -8px;
              left: 50%;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: 8px solid transparent;
              border-right: 8px solid transparent;
              border-top: 8px solid white;
            "></div>
            <div style="
              position: absolute;
              bottom: -9px;
              left: 50%;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: 8px solid transparent;
              border-right: 8px solid transparent;
              border-top: 8px solid #ccc;
            "></div>
          </div>
        `,
        position: markerPosition,
        yAnchor: 2.7
      });

      customOverlay.setMap(map)

      // 마커 클릭 시 CustomOverlay 표시/숨김 토글
      let overlayVisible = true;

      window.kakao.maps.event.addListener(marker, 'click', () => {
        if (overlayVisible) {
          customOverlay.setMap(null);
          overlayVisible = false;
        } else {
          customOverlay.setMap(map);
          overlayVisible = true;
        }
      })

      window.kakao.maps.event.addListener(map, 'click', () => {
        customOverlay.setMap(null);
        overlayVisible = false;
      })

    } catch (error) {
      setLoadError('지도 초기화에 실패했습니다')
    }
  }, [isLoaded, flowInfo])

  if (!isLoaded && !loadError) {
    return <MapLoading />
  }

  if (loadError) {
    return <MapError error={loadError} />
  }

  return (
    <div className="h-48 rounded-lg border shadow-sm">
      <div ref={mapRef} className="w-full h-full rounded-lg" />
    </div>
  )
}