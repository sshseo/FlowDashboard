// 기상청 API 서비스
export const weatherService = {
    // 기상청 API 설정
    API_BASE_URL: process.env.REACT_APP_WEATHER_API_BASE_URL || 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0',
    API_KEY: process.env.REACT_APP_WEATHER_API_KEY || '',

    // 기본 좌표 (환경변수에서 설정)
    DEFAULT_NX: parseInt(process.env.REACT_APP_DEFAULT_NX) || 60,
    DEFAULT_NY: parseInt(process.env.REACT_APP_DEFAULT_NY) || 127,

    // 캐시 및 중복 요청 방지
    _cache: new Map(),
    _pendingRequests: new Map(),
    _cacheTimeout: 5 * 60 * 1000, // 5분 캐시

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

    // 지정 Date 객체를 기상청 base_date/base_time(10분 단위 내림)으로 포맷
    _formatKmaBase: (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const mm10 = Math.floor(d.getMinutes() / 10) * 10; // 10분 단위 내림
        const hh = String(d.getHours()).padStart(2, '0');
        const base_date = `${y}${m}${day}`;
        const base_time = `${hh}${String(mm10).padStart(2, '0')}`; // HHmm
        return { base_date, base_time };
    },

    // 초단기실황 데이터 조회 (현재 온도 포함)
    getCurrentWeather: async (lat = null, lon = null) => {
        try {
            if (!weatherService.API_KEY) {
                console.warn('기상청 API 키가 설정되지 않았습니다.');
                return null;
            }

            const { nx, ny } = lat && lon ? weatherService.convertToGrid(lat, lon) :
                { nx: weatherService.DEFAULT_NX, ny: weatherService.DEFAULT_NY };

            // 캐시 키 생성
            const cacheKey = `weather_${nx}_${ny}`;
            const nowTs = Date.now();

            // 캐시된 데이터 확인
            if (weatherService._cache.has(cacheKey)) {
                const cached = weatherService._cache.get(cacheKey);
                if (nowTs - cached.timestamp < weatherService._cacheTimeout) {
                    console.log(`🌡️ 캐시된 온도 사용: ${cached.data.temperature}°C (격자: ${nx}, ${ny})`);
                    return cached.data;
                }
                weatherService._cache.delete(cacheKey);
            }

            // 진행 중인 요청 확인 (중복 요청 방지)
            if (weatherService._pendingRequests.has(cacheKey)) {
                console.log(`🌡️ 대기 중인 요청 사용 (격자: ${nx}, ${ny})`);
                return await weatherService._pendingRequests.get(cacheKey);
            }

            console.log(`🌡️ 새로운 온도 요청: 격자좌표 (${nx}, ${ny})`);

            // 새로운 요청 생성
            const requestPromise = weatherService._fetchWeatherData(nx, ny);
            weatherService._pendingRequests.set(cacheKey, requestPromise);

            try {
                const result = await requestPromise;

                // 성공한 경우 캐시에 저장
                if (result) {
                    weatherService._cache.set(cacheKey, {
                        data: result,
                        timestamp: nowTs
                    });
                }

                return result;
            } finally {
                weatherService._pendingRequests.delete(cacheKey);
            }

        } catch (error) {
            console.error('기상청 API 호출 실패:', error);
            return null;
        }
    },

    // 실제 API 호출 로직 (10분 단위로 최대 6시간(=36스텝) 과거까지 탐색)
    _fetchWeatherData: async (nx, ny) => {
        try {
            const steps = 36; // 6시간 * 60 / 10

            for (let step = 0; step <= steps; step++) {
                const d = new Date();
                d.setMinutes(d.getMinutes() - step * 10); // 10분씩 과거로
                const { base_date, base_time } = weatherService._formatKmaBase(d);

                const params = new URLSearchParams({
                    serviceKey: decodeURIComponent(weatherService.API_KEY),
                    pageNo: '1',
                    numOfRows: '1000',
                    dataType: 'JSON',
                    base_date,
                    base_time,
                    nx: nx.toString(),
                    ny: ny.toString()
                });

                console.log(`➡️ KMA 요청: ${base_date} ${base_time} (step=${step})`);

                const response = await fetch(`${weatherService.API_BASE_URL}/getUltraSrtNcst?${params}`);
                if (!response.ok) {
                    console.warn(`⚠️ 응답 오류(step=${step}): ${response.status}`);
                    continue; // 다음 스텝 시도
                }

                const data = await response.json();
                const resultCode = data?.response?.header?.resultCode;

                if (resultCode === '00') {
                    const items = data?.response?.body?.items?.item || [];
                    // T1H(기온) 우선 찾고, 없으면 다음 스텝으로 계속 시도
                    const tempItem = items.find((it) => it.category === 'T1H' && it.obsrValue !== undefined && it.obsrValue !== null);

                    if (tempItem) {
                        const t = parseFloat(tempItem.obsrValue);
                        if (!Number.isNaN(t)) {
                            console.log(`✅ 온도 데이터 찾음: ${t}°C @ ${base_date} ${base_time} (step=${step})`);
                            return {
                                temperature: t,
                                timestamp: new Date(),
                                base_date,
                                base_time,
                                nx,
                                ny,
                                source: 'KMA_API'
                            };
                        } else {
                            console.warn(`⚠️ T1H 값이 숫자가 아님(obsrValue='${tempItem.obsrValue}') → 다음 스텝`);
                        }
                    } else {
                        console.warn('ℹ️ 해당 시각에 T1H 항목 없음 → 다음 스텝');
                    }
                } else if (resultCode === '03') {
                    // NO_DATA
                    console.warn(`ℹ️ NO_DATA @ ${base_date} ${base_time} → 다음 스텝`);
                    continue;
                } else {
                    console.warn(`ℹ️ 비정상 응답(resultCode=${resultCode}) → 다음 스텝`);
                    continue;
                }
            }

            console.warn('❌ 6시간 범위 내 모든 10분 시각에서 T1H를 찾지 못했습니다.');
            return null;

        } catch (error) {
            console.error('기상청 API 호출 실패:', error);
            return null;
        }
    },

    // API 키 설정
    setApiKey: (apiKey) => {
        weatherService.API_KEY = apiKey;
    },

    // 좌표 설정
    setLocation: (nx, ny) => {
        weatherService.DEFAULT_NX = nx;
        weatherService.DEFAULT_NY = ny;
    }
};
