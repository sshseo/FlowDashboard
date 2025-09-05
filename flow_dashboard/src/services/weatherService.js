// 기상청 API 서비스
export const weatherService = {
  // 기상청 API 설정
  API_BASE_URL: process.env.REACT_APP_WEATHER_API_BASE_URL || 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0',
  API_KEY: process.env.REACT_APP_WEATHER_API_KEY || '',
  
  // 기본 좌표 (환경변수에서 설정)
  DEFAULT_NX: parseInt(process.env.REACT_APP_DEFAULT_NX) || 60,
  DEFAULT_NY: parseInt(process.env.REACT_APP_DEFAULT_NY) || 127,

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

  // 현재 날짜/시간 포맷 생성 (데이터 가용성 고려)
  getCurrentDateTime: (fallbackHours = 0) => {
    const now = new Date()
    now.setHours(now.getHours() - fallbackHours)
    
    const date = now.toISOString().slice(0, 10).replace(/-/g, '')
    const hour = String(now.getHours()).padStart(2, '0') + '00'
    console.log(`기상청 API 요청 시간: ${date} ${hour} (${fallbackHours}시간 전)`)
    return { date, hour }
  },

  // 초단기실황 데이터 조회 (현재 온도 포함)
  getCurrentWeather: async (lat = null, lon = null) => {
    try {
      if (!weatherService.API_KEY) {
        console.warn('기상청 API 키가 설정되지 않았습니다.')
        return null
      }

      const { nx, ny } = lat && lon ? weatherService.convertToGrid(lat, lon) : 
                        { nx: weatherService.DEFAULT_NX, ny: weatherService.DEFAULT_NY }
      
      console.log(`위경도 (${lat}, ${lon}) -> 격자좌표 (${nx}, ${ny})`)

      // 먼저 현재 시간으로 시도
      for (let fallbackHours = 0; fallbackHours <= 2; fallbackHours++) {
        const { date, hour } = weatherService.getCurrentDateTime(fallbackHours)

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
          console.warn(`기상청 API 호출 실패 (${fallbackHours}시간 전): ${response.status}`)
          continue
        }

        const data = await response.json()
        
        // 응답 코드 확인
        if (data.response?.header?.resultCode === '00') {
          // 정상 응답 - T1H (기온) 데이터 추출
          if (data.response?.body?.items?.item) {
            const items = data.response.body.items.item
            const tempItem = items.find(item => item.category === 'T1H')
            
            if (tempItem) {
              console.log(`온도 데이터 찾음: ${tempItem.obsrValue}°C (${fallbackHours}시간 전 데이터)`)
              return {
                temperature: parseFloat(tempItem.obsrValue),
                timestamp: new Date(),
                source: 'KMA_API'
              }
            }
          }
        } else if (data.response?.header?.resultCode === '03') {
          // NO_DATA - 다음 시간대로 시도
          console.warn(`데이터 없음 (${fallbackHours}시간 전) - 이전 시간대 시도`)
          continue
        }
      }
      
      console.warn('모든 시간대에서 온도 데이터를 찾을 수 없음')
      return null
      
    } catch (error) {
      console.error('기상청 API 호출 실패:', error)
      return null
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