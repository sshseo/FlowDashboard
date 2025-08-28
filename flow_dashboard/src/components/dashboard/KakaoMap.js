import React, { useEffect, useState, useRef } from 'react'
import { locations } from '../../utils/constants'
import { MapLoading } from '../common/Loading'
import { MapError } from '../common/ErrorMessage'

export default function KakaoMap({ selectedLocation, flowInfo }) {
  const mapRef = useRef(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState(null)

  const currentLocation = locations.find(loc => loc.id === selectedLocation)

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
    if (!isLoaded || !currentLocation || !mapRef.current) return

    try {
      const lat = flowInfo?.flow_latitude || currentLocation.lat
      const lng = flowInfo?.flow_longitude || currentLocation.lng

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
        title: `${currentLocation.name} 모니터링 지점`
      })

      marker.setMap(map)

      const flowName = flowInfo?.flow_name || '영오지하차도'
      const infowindow = new window.kakao.maps.InfoWindow({
        content: `
          <div style="padding:8px; font-size:12px; width:200px; text-align:center;">
            <strong style="color:#2563eb;">${flowName}</strong><br/>
            <span style="color:#666; font-size:11px;">${currentLocation.name} 모니터링 지점</span><br/>
            <span style="color:#10b981; font-size:10px;">🟢 수위센서 + AI CCTV 정상 작동</span>
          </div>
        `,
        removable: false
      })

      infowindow.open(map, marker)

      window.kakao.maps.event.addListener(marker, 'click', () => {
        infowindow.open(map, marker)
      })

      window.kakao.maps.event.addListener(map, 'click', () => {
        infowindow.close()
      })

    } catch (error) {
      setLoadError('지도 초기화에 실패했습니다')
    }
  }, [isLoaded, currentLocation, flowInfo])

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