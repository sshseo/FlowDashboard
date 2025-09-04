// 기상청 API 서비스
export const weatherService = {
  // 기상청 API 설정
  API_BASE_URL: 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0',
  API_KEY: process.env.REACT_APP_WEATHER_API_KEY || '',
  
  // 서울 중구 좌표 (예시 - 실제 지역에 맞게 수정 필요)
  DEFAULT_NX: 60,
  DEFAULT_NY: 127,

  // 격자 좌표 변환 (위경도 -> 격자좌표) - 기상청 공식
  convertToGrid: (lat, lon) => {
    const RE = 6371.00877; // 지구 반경(km)
    const GRID = 5.0; // 격자 간격(km)
    const SLAT1 = 30.0; // 투영 위도1(degree)
    const SLAT2 = 60.0; // 투영 위도2(degree)
    const OLON = 126.0; // 기준점 경도(degree)
    const OLAT = 38.0; // 기준점 위도(degree)
    const XO = 43; // 기준점 X좌표(GRID)
    const YO = 136; // 기준점 Y좌표(GRID)

    const DEGRAD = Math.PI / 180.0;
    
    const re = RE / GRID;
    const slat1 = SLAT1 * DEGRAD;
    const slat2 = SLAT2 * DEGRAD;
    const olon = OLON * DEGRAD;
    const olat = OLAT * DEGRAD;
    
    let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
    let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;
    let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
    ro = re * sf / Math.pow(ro, sn);

    const ra = Math.tan(Math.PI * 0.25 + (lat) * DEGRAD * 0.5);
    const ro2 = re * sf / Math.pow(ra, sn);
    let theta = lon * DEGRAD - olon;
    if (theta > Math.PI) theta -= 2.0 * Math.PI;
    if (theta < -Math.PI) theta += 2.0 * Math.PI;
    theta *= sn;

    const nx = Math.floor(ro2 * Math.sin(theta) + XO + 0.5);
    const ny = Math.floor(ro - ro2 * Math.cos(theta) + YO + 0.5);

    return { nx, ny };
  },

  // 현재 날짜/시간 포맷 생성
  getCurrentDateTime: () => {
    const now = new Date()
    const date = now.toISOString().slice(0, 10).replace(/-/g, '')
    const hour = String(now.getHours()).padStart(2, '0') + '00'
    return { date, hour }
  },

  // 초단기실황 데이터 조회 (현재 온도 포함)
  getCurrentWeather: async (lat = null, lon = null) => {
    try {
      if (!weatherService.API_KEY) {
        console.warn('기상청 API 키가 설정되지 않았습니다.')
        return weatherService.getMockTemperature()
      }

      const { nx, ny } = lat && lon ? weatherService.convertToGrid(lat, lon) : 
                        { nx: weatherService.DEFAULT_NX, ny: weatherService.DEFAULT_NY }
      
      console.log(`위경도 (${lat}, ${lon}) -> 격자좌표 (${nx}, ${ny})`)
      const { date, hour } = weatherService.getCurrentDateTime()

      const params = new URLSearchParams({
        serviceKey: decodeURIComponent(weatherService.API_KEY),
        pageNo: '1',
        numOfRows: '1000',
        dataType: 'JSON',
        base_date: date,
        base_time: hour,
        nx: nx.toString(),
        ny: ny.toString()
      })

      const response = await fetch(`${weatherService.API_BASE_URL}/getUltraSrtNcst?${params}`)
      
      if (!response.ok) {
        throw new Error(`기상청 API 호출 실패: ${response.status}`)
      }

      const data = await response.json()
      
      // T1H (기온) 데이터 추출
      if (data.response?.body?.items?.item) {
        const items = data.response.body.items.item
        const tempItem = items.find(item => item.category === 'T1H')
        
        if (tempItem) {
          return {
            temperature: parseFloat(tempItem.obsrValue),
            timestamp: new Date(),
            source: 'KMA_API'
          }
        }
      }
      
      // API 응답이 올바르지 않은 경우 목 데이터 반환
      return weatherService.getMockTemperature()
      
    } catch (error) {
      console.error('기상청 API 호출 실패:', error)
      // API 호출 실패시 목 데이터 반환
      return weatherService.getMockTemperature()
    }
  },

  // Mock 온도 데이터 (API 키가 없거나 실패시 사용)
  getMockTemperature: () => {
    // 계절에 따른 현실적인 온도 범위
    const now = new Date()
    const month = now.getMonth() + 1
    
    let baseTemp
    if (month >= 12 || month <= 2) {
      // 겨울 (-5 ~ 10도)
      baseTemp = Math.random() * 15 - 5
    } else if (month >= 3 && month <= 5) {
      // 봄 (5 ~ 25도)
      baseTemp = Math.random() * 20 + 5
    } else if (month >= 6 && month <= 8) {
      // 여름 (20 ~ 35도)
      baseTemp = Math.random() * 15 + 20
    } else {
      // 가을 (5 ~ 25도)
      baseTemp = Math.random() * 20 + 5
    }
    
    return {
      temperature: Math.round(baseTemp * 10) / 10, // 소수점 1자리
      timestamp: new Date(),
      source: 'MOCK_DATA'
    }
  },

  // API 키 설정
  setApiKey: (apiKey) => {
    weatherService.API_KEY = apiKey
  },

  // 좌표 설정
  setLocation: (nx, ny) => {
    weatherService.DEFAULT_NX = nx
    weatherService.DEFAULT_NY = ny
  }
}