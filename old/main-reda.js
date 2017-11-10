(function() {

	// https://www.nrel.gov/docs/fy08osti/34302.pdf
	var getSunPosition = function() {
		var julianDay = getJulianDay(new Date())
			heliocentricCoord = getHeliocentricCoords(julianDay),
			aberrationCorrection = - 20.4898 / (3600 * heliocentricCoord.heliocentricRadius);

			geocentricLongitude = limit360(heliocentricCoord.heliocentricLongitude + 180),
			geocentricLatitude = - heliocentricCoord.heliocentricLatitude;

			nutation = getNutation(julianDay),
			ecliptic = getEcliptic(julianDay),
			eclipticObliquity = ecliptic / 3600 + nutation.obliquity,
			apparentSunLongitude = geocentricLongitude + nutation.longitude - aberrationCorrection;

			apparentSiderealGMT = getApparentSiderealGMT(julianDay, nutation),
			geocentricSunCoords = getGeocentricSunCoords(apparentSunLongitude, eclipticObliquity, geocentricLatitude),

			localHourAngle = apparentSiderealGMT + localPosition.longitude - geocentricSunCoords.rightAscension,
			topocentricCoords = getTopocentricCoords(heliocentricCoord.heliocentricRadius, localPosition.altitude, localPosition.latitude, localHourAngle, geocentricSunCoords.declination, geocentricSunCoords.rightAscension);


		return { 
			azimuth: topocentricCoords.azimuth,
			elevation: topocentricCoords.zenith
		}
	}

	var getJulianDay = function(date = new Date()) {
		var year = date.getUTCFullYear(),
			month = date.getUTCMonth() + 1,
			day = date.getUTCDate(),
			hours = date.getUTCHours(),
			minutes = date.getUTCMinutes(),
			seconds = date.getUTCSeconds(),
			dayFraction = day + hours / 24 + minutes / (24 * 60) + seconds / (24 * 60 * 60);

		if (month < 3) {
			year--;
			month += 12
		}

		var b = 2 - Math.floor(year / 100) + Math.floor(year / 400);

		return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + dayFraction + b - 1524.5;
	}

	var getHeliocentricCoords = function(julianDay) {
		var	julianCentury = (julianDay - 2451545) / 36525,
			julianEphemerisCentury = (julianDay - 2451545) / 36525,
			julianEphemerisMillennium = julianEphemerisCentury / 10;

		var l0 = [
				{ A: 175347046, B: 0, C: 0 },
				{ A: 3341656, B: 4.6692568, C: 6283.07585 },
				{ A: 34894, B: 4.6261, C: 12566.1517 },
				{ A: 3497, B: 2.7441, C: 5753.3849 },
				{ A: 3418, B: 2.8289, C: 3.5231 },
				{ A: 3136, B: 3.6277, C: 77713.7715 },
				{ A: 2676, B: 4.4181, C: 7860.4194 },
				{ A: 2343, B: 6.1352, C: 3930.2097 },
				{ A: 1324, B: 0.7425, C: 11506.7698 },
				{ A: 1273, B: 2.0371, C: 529.691 },
				{ A: 1199, B: 1.1096, C: 1577.3435 },
				{ A: 990, B: 5.233, C: 5884.927 },
				{ A: 902, B: 2.045, C: 26.298 },
				{ A: 857, B: 3.508, C: 398.149 },
				{ A: 780, B: 1.179, C: 5223.694 },
				{ A: 753, B: 2.533, C: 5507.553 },
				{ A: 505, B: 4.583, C: 18849.228 },
				{ A: 492, B: 4.205, C: 775.523 },
				{ A: 357, B: 2.92, C: 0.067 },
				{ A: 317, B: 5.849, C: 11790.629 },
				{ A: 284, B: 1.899, C: 796.298 },
				{ A: 271, B: 0.315, C: 10977.079 },
				{ A: 243, B: 0.345, C: 5486.778 },
				{ A: 206, B: 4.806, C: 2544.314 },
				{ A: 205, B: 1.869, C: 5573.143 },
				{ A: 202, B: 2.458, C: 6069.777 },
				{ A: 156, B: 0.833, C: 213.299 },
				{ A: 132, B: 3.411, C: 2942.463 },
				{ A: 126, B: 1.083, C: 20.775 },
				{ A: 115, B: 0.645, C: 0.98 },
				{ A: 103, B: 0.636, C: 4694.003 },
				{ A: 102, B: 0.976, C: 15720.839 },
				{ A: 102, B: 4.267, C: 7.114 },
				{ A: 99, B: 6.21, C: 2146.17 },
				{ A: 98, B: 0.68, C: 155.42 },
				{ A: 86, B: 5.98, C: 161000.69 },
				{ A: 85, B: 1.3 , C:6275.96 },
				{ A: 85, B: 3.67, C: 71430.7 },
				{ A: 80, B: 1.81, C: 17260.15 },
				{ A: 79, B: 3.04, C: 12036.46 },
				{ A: 75, B: 1.76, C: 5088.63 },
				{ A: 74, B: 3.5, C: 3154.69 },
				{ A: 74, B: 4.68, C: 801.82 },
				{ A: 70, B: 0.83, C: 9437.76 },
				{ A: 62, B: 3.98, C: 8827.39 },
				{ A: 61, B: 1.82, C: 7084.9 },
				{ A: 57, B: 2.78, C: 6286.6 },
				{ A: 56, B: 4.39, C: 14143.5 },
				{ A: 56, B: 3.47, C: 6279.55 },
				{ A: 52, B: 0.19, C: 12139.55 },
				{ A: 52, B: 1.33, C: 1748.02 },
				{ A: 51, B: 0.28, C: 5856.48 },
				{ A: 49, B: 0.49, C: 1194.45 },
				{ A: 41, B: 5.37, C: 8429.24 },
				{ A: 41, B: 2.4, C: 19651.05 },
				{ A: 39, B: 6.17, C: 10447.39 },
				{ A: 37, B: 6.04, C: 10213.29 },
				{ A: 37, B: 2.57, C: 1059.38 },
				{ A: 36, B: 1.71, C: 2352.87 },
				{ A: 36, B: 1.78, C: 6812.77 },
				{ A: 33, B: 0.59, C: 17789.85 },
				{ A: 30, B: 0.44, C: 83996.85 },
				{ A: 30, B: 2.74, C: 1349.87 },
				{ A: 25, B: 3.16, C: 4690.48 }
			],
			l1 = [
				{ A: 628331966747, B: 0, C: 0 },
				{ A: 206059, B: 2.678235, C: 6283.07585 },
				{ A: 4303, B: 2.6351, C: 12566.1517 },
				{ A: 425, B: 1.59, C: 3.523 },
				{ A: 119, B: 5.796, C: 26.298 },
				{ A: 109, B: 2.966, C: 1577.344 },
				{ A: 93, B: 2.59, C: 18849.23 },
				{ A: 72, B: 1.14, C: 529.69 },
				{ A: 68, B: 1.87, C: 398.15 },
				{ A: 67, B: 4.41, C: 5507.55 },
				{ A: 59, B: 2.89, C: 5223.69 },
				{ A: 56, B: 2.17, C: 155.42 },
				{ A: 45, B: 0.4, C: 796.3 },
				{ A: 36, B: 0.47, C: 775.52 },
				{ A: 29, B: 2.65, C: 7.11 },
				{ A: 21, B: 5.34, C: 0.98 },
				{ A: 19, B: 1.85, C: 5486.78 },
				{ A: 19, B: 4.97, C: 213.3 },
				{ A: 17, B: 2.99, C: 6275.96 },
				{ A: 16, B: 0.03, C: 2544.31 },
				{ A: 16, B: 1.43, C: 2146.17 },
				{ A: 15, B: 1.21, C: 10977.08 },
				{ A: 12, B: 2.83, C: 1748.02 },
				{ A: 12, B: 3.26, C: 5088.63 },
				{ A: 12, B: 5.27, C: 1194.45 },
				{ A: 12, B: 2.08, C: 4694 },
				{ A: 11, B: 0.77, C: 553.57 },
				{ A: 10, B: 1.3, C: 6286.6 },
				{ A: 10, B: 4.24, C: 1349.87 },
				{ A: 9, B: 2.7, C: 242.73 },
				{ A: 9, B: 5.64, C: 951.72 },
				{ A: 8, B: 5.3, C: 2352.87 },
				{ A: 6, B: 2.65, C: 9437.76 },
				{ A: 6, B: 4.67, C: 4690.48 }
			],
			l2 = [
				{ A: 52919, B: 0, C: 0 },
				{ A: 8720, B: 1.0721, C: 6283.0758 },
				{ A: 309, B: 0.867, C: 12566.152 },
				{ A: 27, B: 0.05, C: 3.52 },
				{ A: 16, B: 5.19, C: 26.3 },
				{ A: 16, B: 3.68, C: 155.42 },
				{ A: 10, B: 0.76, C: 18849.23 },
				{ A: 9, B: 2.06, C: 77713.77 },
				{ A: 7, B: 0.83, C: 775.52 },
				{ A: 5, B: 4.66, C: 1577.34 },
				{ A: 4, B: 1.03, C: 7.11 },
				{ A: 4, B: 3.44, C: 5573.14 },
				{ A: 3, B: 5.14, C: 796.3 },
				{ A: 3, B: 6.05, C: 5507.55 },
				{ A: 3, B: 1.19, C: 242.73 },
				{ A: 3, B: 6.12, C: 529.69 },
				{ A: 3, B: 0.31, C: 398.15 },
				{ A: 3, B: 2.28, C: 553.57 },
				{ A: 2, B: 4.38, C: 5223.69 },
				{ A: 2, B: 3.75, C: 0.98 }
			],
			l3 = [
				{ A: 289, B: 5.844, C: 6283.076 },
				{ A: 35, B: 0, C: 0 },
				{ A: 17, B: 5.49, C: 12566.15 },
				{ A: 3, B: 5.2, C: 155.42 },
				{ A: 1, B: 4.72, C: 3.52 },
				{ A: 1, B: 5.3, C: 18849.23 },
				{ A: 1, B: 5.97, C: 242.73 }
			],
			l4 = [
				{ A: 114, B: 3.142, C: 0 },
				{ A: 8, B: 4.13, C: 6283.08 },
				{ A: 1, B: 3.84, C: 12566.15 }
			],
			l5 = [
				{ A: 1, B: 3.14, C: 0 }
			];

		var b0 = [
				{ A: 280, B: 3.199, C: 84334.662 },
				{ A: 102, B: 5.422, C: 5507.553 },
				{ A: 80, B: 3.88, C: 5223.69 },
				{ A: 44, B: 3.7, C: 2352.87 },
				{ A: 32, B: 4, C: 1577.34 }
			],
			b1 = [
				{ A: 9, B: 3.9, C: 5507.55 },
				{ A: 6, B: 1.73, C: 5223.69 }
			];

		var r0 = [
				{ A: 100013989, B: 0, C: 0 },
				{ A: 1670700, B: 3.0984635, C: 6283.07585 },
				{ A: 13956, B: 3.05525, C: 12566.1517 },
				{ A: 3084, B: 5.1985, C: 77713.7715 },
				{ A: 1628, B: 1.1739, C: 5753.3849 },
				{ A: 1576, B: 2.8469, C: 7860.4194 },
				{ A: 925, B: 5.453, C: 11506.77 },
				{ A: 542, B: 4.564, C: 3930.21 },
				{ A: 472, B: 3.661, C: 5884.927 },
				{ A: 346, B: 0.964, C: 5507.553 },
				{ A: 329, B: 5.9, C: 5223.694 },
				{ A: 307, B: 0.299, C: 5573.143 },
				{ A: 243, B: 4.273, C: 11790.629 },
				{ A: 212, B: 5.847, C: 1577.344 },
				{ A: 186, B: 5.022, C: 10977.079 },
				{ A: 175, B: 3.012, C: 18849.228 },
				{ A: 110, B: 5.055, C: 5486.778 },
				{ A: 98, B: 0.89, C: 6069.78 },
				{ A: 86, B: 5.69, C: 15720.84 },
				{ A: 86, B: 1.27, C: 161000.69 },
				{ A: 65, B: 0.27, C: 17260.15 },
				{ A: 63, B: 0.92, C: 529.69 },
				{ A: 57, B: 2.01, C: 83996.85 },
				{ A: 56, B: 5.24, C: 71430.7 },
				{ A: 49, B: 3.25, C: 2544.31 },
				{ A: 47, B: 2.58, C: 775.52 },
				{ A: 45, B: 5.54, C: 9437.76 },
				{ A: 43, B: 6.01, C: 6275.96 },
				{ A: 39, B: 5.36, C: 4694 },
				{ A: 38, B: 2.39, C: 8827.39 },
				{ A: 37, B: 0.83, C: 19651.05 },
				{ A: 37, B: 4.9, C: 12139.55 },
				{ A: 36, B: 1.67, C: 12036.46 },
				{ A: 35, B: 1.84, C: 2942.46 },
				{ A: 33, B: 0.24, C: 7084.9 },
				{ A: 32, B: 0.18, C: 5088.63 },
				{ A: 32, B: 1.78, C: 398.15 },
				{ A: 28, B: 1.21, C: 6286.6 },
				{ A: 28, B: 1.9, C: 6279.55 },
				{ A: 26, B: 4.59, C: 10447.39 }
			],
			r1 = [
				{ A: 103019, B: 1.10749, C: 6283.07585 },
				{ A: 1721, B: 1.0644, C: 12566.1517 },
				{ A: 702, B: 3.142, C: 0 },
				{ A: 32, B: 1.02, C: 18849.23 },
				{ A: 31, B: 2.84, C: 5507.55 },
				{ A: 25, B: 1.32, C: 5223.69 },
				{ A: 18, B: 1.42, C: 1577.34 },
				{ A: 10, B: 5.91, C: 10977.08 },
				{ A: 9, B: 1.42, C: 6275.96 },
				{ A: 9, B: 0.27, C: 5486.78 }
			],
			r2 = [
				{ A: 4359, B: 5.7846, C: 6283.0758 },
				{ A: 124, B: 5.579, C: 12566.152 },
				{ A: 12, B: 3.14, C: 0 },
				{ A: 9, B: 3.63, C: 77713.77 },
				{ A: 6, B: 1.87, C: 5573.14 },
				{ A: 3, B: 5.47, C: 18849.23 }
			],
			r3 = [
				{ A: 145, B: 4.273, C: 6283.076 },
				{ A: 7, B: 3.92, C: 12566.15 }
			],
			r4 = [
				{ A: 4, B: 2.56, C: 6283.08 }
			];


		var longitude0 = l0.reduce((acc, val) => { return val.A * Math.cos(val.B + val.C * julianEphemerisMillennium);},0),
			longitude1 = l1.reduce((acc, val) => { return val.A * Math.cos(val.B + val.C * julianEphemerisMillennium);},0),
			longitude2 = l2.reduce((acc, val) => { return val.A * Math.cos(val.B + val.C * julianEphemerisMillennium);},0),
			longitude3 = l3.reduce((acc, val) => { return val.A * Math.cos(val.B + val.C * julianEphemerisMillennium);},0),
			longitude4 = l4.reduce((acc, val) => { return val.A * Math.cos(val.B + val.C * julianEphemerisMillennium);},0),
			longitude5 = l5.reduce((acc, val) => { return val.A * Math.cos(val.B + val.C * julianEphemerisMillennium);},0);

		var heliocentricLongitude = longitude0 + longitude1 * julianEphemerisMillennium;
		heliocentricLongitude += longitude2 * Math.pow(julianEphemerisMillennium, 2);
		heliocentricLongitude += longitude3 * Math.pow(julianEphemerisMillennium, 3);
		heliocentricLongitude += longitude4 * Math.pow(julianEphemerisMillennium, 4);
		heliocentricLongitude += longitude5 * Math.pow(julianEphemerisMillennium, 5);
		heliocentricLongitude /= Math.pow(10, 8);
		heliocentricLongitude = limit360(heliocentricLongitude * 180 / Math.PI);

		var heliocentricLatitude = b0.reduce((acc, val) => { return val.A * Math.cos(val.B + val.C * julianEphemerisMillennium);},0);
		heliocentricLatitude += b1.reduce((acc, val) => { return val.A * Math.cos(val.B + val.C * julianEphemerisMillennium);},0) * julianEphemerisMillennium;
		heliocentricLatitude /= Math.pow(10, 8);
		heliocentricLatitude = limit360(heliocentricLatitude * 180 / Math.PI);

		var radius0 = r0.reduce((acc, val) => { return val.A * Math.cos(val.B + val.C * julianEphemerisMillennium);},0),
			radius1 = r1.reduce((acc, val) => { return val.A * Math.cos(val.B + val.C * julianEphemerisMillennium);},0),
			radius2 = r2.reduce((acc, val) => { return val.A * Math.cos(val.B + val.C * julianEphemerisMillennium);},0),
			radius3 = r3.reduce((acc, val) => { return val.A * Math.cos(val.B + val.C * julianEphemerisMillennium);},0),
			radius4 = r4.reduce((acc, val) => { return val.A * Math.cos(val.B + val.C * julianEphemerisMillennium);},0);

		var heliocentricRadius = radius0 + radius1 * julianEphemerisMillennium;
		heliocentricRadius += radius2 * Math.pow(julianEphemerisMillennium, 2);
		heliocentricRadius += radius3 * Math.pow(julianEphemerisMillennium, 3);
		heliocentricRadius += radius4 * Math.pow(julianEphemerisMillennium, 4);
		heliocentricRadius /= Math.pow(10, 8);
		heliocentricRadius = limit360(heliocentricRadius * 180 / Math.PI);

		return { heliocentricLongitude, heliocentricLatitude, heliocentricRadius };

	}

	var getNutation = function(julianDay) {
		var jce = (julianDay - 2451545) / 36525,
			jce2 = Math.pow(jce, 2),
			jce3 = Math.pow(jce, 3);

		var meanMoonElongation = 297.85036 + 445267.111480 * jce - 0.0019142 * jce2 + jce3 / 189474,
			meanAnomalySun = 357.52772 + 35999.050340 * jce - 0.0001603 * jce2 - jce3 / 300000,
			meanAnomalyMoon = 134.96298 + 477198.867398 * jce + 0.0086972 * jce2 + jce3 / 56250,
			moonLatitude = 93.27191 + 483202.017539 * jce - 0.0036825 * jce2 + jce3 / 327270,
			moonLongitude = 125.04452 - 1934.136261 * jce + 0.0020708 * jce2 + jce3 / 450000;

		var data = [
		 	{ y0: 0, y1: 0, y2: 0, y3: 0, y4: 1, a: -171996, b: -174.2, c: 92025, d: 8.9 },
		 	{ y0: -2, y1: 0, y2: 0, y3: 2, y4: 2, a: -13187, b: -1.6, c: 5736, d: -3.1 },
		 	{ y0: 0, y1: 0, y2: 0, y3: 2, y4: 2, a: -2274, b: -0.2, c: 977, d: -0.5 },
		 	{ y0: 0, y1: 0, y2: 0, y3: 0, y4: 2, a: 2062, b: 0.2, c: -895, d: 0.5 },
		 	{ y0: 0, y1: 1, y2: 0, y3: 0, y4: 0, a: 1426, b: -3.4, c: 54, d: -0.1 },
		 	{ y0: 0, y1: 0, y2: 1, y3: 0, y4: 0, a: 712, b: 0.1, c: -7 },
		 	{ y0: -2, y1: 1, y2: 0, y3: 2, y4: 2, a: -517, b: 1.2, c: 224, d: -0.6 },
		 	{ y0: 0, y1: 0, y2: 0, y3: 2, y4: 1, a: -386, b: -0.4, c: 200 },
		 	{ y0: 0, y1: 0, y2: 1, y3: 2, y4: 2, a: -301, c: 129, d: -0.1 },
		 	{ y0: -2, y1: -1, y2: 0, y3: 2, y4: 2, a: 217, b: -0.5, c: -95, d: 0.3 },
		 	{ y0: -2, y1: 0, y2: 1, y3: 0, y4: 0, a: -158 },
		 	{ y0: -2, y1: 0, y2: 0, y3: 2, y4: 1, a: 129, b: 0.1, c: -70 },
		 	{ y0: 0, y1: 0, y2: -1, y3: 2, y4: 2, a: 123, c: -53 },
		 	{ y0: 2, y1: 0, y2: 0, y3: 0, y4: 0, a: 63 },
		 	{ y0: 0, y1: 0, y2: 1, y3: 0, y4: 1, a: 63, b: 0.1, c: -33 },
		 	{ y0: 2, y1: 0, y2: -1, y3: 2, y4: 2, a: -59, c: 26 },
		 	{ y0: 0, y1: 0, y2: -1, y3: 0, y4: 1, a: -58, b: -0.1, c: 32 },
		 	{ y0: 0, y1: 0, y2: 1, y3: 2, y4: 1, a: -51, c: 27 },
		 	{ y0: -2, y1: 0, y2: 2, y3: 0, y4: 0, a: 48 },
		 	{ y0: 0, y1: 0, y2: -2, y3: 2, y4: 1, a: 46, c: -24 },
		 	{ y0: 2, y1: 0, y2: 0, y3: 2, y4: 2, a: -38, c: 16 },
		 	{ y0: 0, y1: 0, y2: 2, y3: 2, y4: 2, a: -31, c: 13 },
		 	{ y0: 0, y1: 0, y2: 2, y3: 0, y4: 0, a: 29 },
		 	{ y0: -2, y1: 0, y2: 1, y3: 2, y4: 2, a: 29, c: -12 },
		 	{ y0: 0, y1: 0, y2: 0, y3: 2, y4: 0, a: 26 },
		 	{ y0: -2, y1: 0, y2: 0, y3: 2, y4: 0, a: -22 },
		 	{ y0: 0, y1: 0, y2: -1, y3: 2, y4: 1, a: 21, c: -10 },
		 	{ y0: 0, y1: 2, y2: 0, y3: 0, y4: 0, a: 17, b: -0.1 },
		 	{ y0: 2, y1: 0, y2: -1, y3: 0, y4: 1, a: 16, c: -8 },
		 	{ y0: -2, y1: 2, y2: 0, y3: 2, y4: 2, a: -16, b: 0.1, c: 7 },
		 	{ y0: 0, y1: 1, y2: 0, y3: 0, y4: 1, a: -15, c: 9 },
		 	{ y0: -2, y1: 0, y2: 1, y3: 0, y4: 1, a: -13, c: 7 },
		 	{ y0: 0, y1: -1, y2: 0, y3: 0, y4: 1, a: -12, c: 6 },
		 	{ y0: 0, y1: 0, y2: 2, y3: -2, y4: 0, a: 11 },
		 	{ y0: 2, y1: 0, y2: -1, y3: 2, y4: 1, a: -10, c: 5 },
		 	{ y0: 2, y1: 0, y2: 1, y3: 2, y4: 2, a: -8, c: 3 },
		 	{ y0: 0, y1: 1, y2: 0, y3: 2, y4: 2, a: 7, c: -3 },
		 	{ y0: -2, y1: 1, y2: 1, y3: 0, y4: 0, a: -7 },
		 	{ y0: 0, y1: -1, y2: 0, y3: 2, y4: 2, a: -7, c: 3 },
		 	{ y0: 2, y1: 0, y2: 0, y3: 2, y4: 1, a: -7, c: 3 },
		 	{ y0: 2, y1: 0, y2: 1, y3: 0, y4: 0, a: 6 },
		 	{ y0: -2, y1: 0, y2: 2, y3: 2, y4: 2, a: 6, c: -3 },
		 	{ y0: -2, y1: 0, y2: 1, y3: 2, y4: 1, a: 6, c: -3 },
		 	{ y0: 2, y1: 0, y2: -2, y3: 0, y4: 1, a: -6, c: 3 },
		 	{ y0: 2, y1: 0, y2: 0, y3: 0, y4: 1, a: -6, c: 3 },
		 	{ y0: 0, y1: -1, y2: 1, y3: 0, y4: 0, a: 5 },
		 	{ y0: -2, y1: -1, y2: 0, y3: 2, y4: 1, a: -5, c: 3 },
		 	{ y0: -2, y1: 0, y2: 0, y3: 0, y4: 1, a: -5 },
		 	{ y0: 0, y1: 0, y2: 2, y3: 2, y4: 1, a: -5, c: 3 },
		 	{ y0: -2, y1: 0, y2: 2, y3: 0, y4: 1, a: 4 },
		 	{ y0: -2, y1: 1, y2: 0, y3: 2, y4: 1, a: 4 },
		 	{ y0: 0, y1: 0, y2: 1, y3: -2, y4: 0, a: 4 },
		 	{ y0: -1, y1: 0, y2: 1, y3: 0, y4: 0, a: -4 },
		 	{ y0: -2, y1: 1, y2: 0, y3: 0, y4: 0, a: -4 },
		 	{ y0: 1, y1: 0, y2: 0, y3: 0, y4: 0, a: -4 },
		 	{ y0: 0, y1: 0, y2: 1, y3: 2, y4: 0, a: 3 },
		 	{ y0: 0, y1: 0, y2: -2, y3: 2, y4: 2, a: -3 },
		 	{ y0: -1, y1: -1, y2: 1, y3: 0, y4: 0, a: -3 },
		 	{ y0: 0, y1: 1, y2: 1, y3: 0, y4: 0, a: -3 },
		 	{ y0: 0, y1: -1, y2: 1, y3: 2, y4: 2, a: -3 },
		 	{ y0: 2, y1: -1, y2: -1, y3: 2, y4: 2, a: -3 },
		 	{ y0: 0, y1: 0, y2: 3, y3: 2, y4: 2, a: -3 },
		 	{ y0: 2, y1: -1, y2: 0, y3: 2, y4: 2, a: -3 }

		];

		data.forEach(function(item, index) {
			item['sum'] = meanMoonElongation * item.y0 + meanAnomalySun * item.y1 +
						  meanAnomalyMoon * item.y2 + moonLatitude * item.y3 + moonLongitude * item.y4;
		});

		var psi = data.reduce((acc, val) => {
				var a = val.a || 0,
					b = val.b || 0;

				return Math.sin(val.sum) * (a + b * jce);
			}, 0) / 36000000,
			epsilon = data.reduce((acc, val) => {
				var c = val.c || 0,
					d = val.d || 0;

				return Math.cos(val.sum) * (c + d * jce);
			}, 0) / 36000000;

		return { longitude: psi, obliquity: epsilon };
	}


	var getEcliptic = function(julianDay) {
		var julianEphemerisCentury = (julianDay - 2451545) / 36525,
			julianEphemerisMillennium = julianEphemerisCentury / 10,
			U = julianEphemerisMillennium / 10,	
			ecliptic = 84381.448 - 4680.93 * U - 1.55 * Math.pow(U, 2) + 1999.25 * Math.pow(U, 3) -
					   51.38 * Math.pow(U, 4) - 249.67 * Math.pow(U, 5) - 39.05 * Math.pow(U, 6) +
					   7.12 * Math.pow(U, 7) + 27.87 * Math.pow(U, 8) + 5.79 * Math.pow(U, 9) +
					   2.45 * Math.pow(U, 10);

		return ecliptic;
	}


	var getApparentSiderealGMT = function(julianDay, nutation) {
		var julianCentury = (julianDay - 2451545) / 36525,
			meanSiderealTime = limit360(280.46061837 + 360.98564736629 * (julianDay - 2451545) +
								0.0000387933 * Math.pow(julianCentury, 2) -
								Math.pow(julianCentury, 3) / 38710000);

		return meanSiderealTime + nutation.longitude * Math.cos(nutation.obliquity);

	}


	var getGeocentricSunCoords = function(apparentSunLongitude, eclipticObliquity, geocentricLatitude) {
		var rightAscension = Math.sin(apparentSunLongitude) * Math.cos(eclipticObliquity) - Math.tan(geocentricLatitude) * Math.sin(eclipticObliquity);
		rightAscension = Math.atan2(rightAscension, Math.cos(apparentSunLongitude));
		rightAscension = limit360(rightAscension * 180 / Math.PI);

		var declination = Math.sin(geocentricLatitude) * Math.cos(eclipticObliquity) + Math.cos(geocentricLatitude) * Math.sin(eclipticObliquity) * Math.sin(apparentSunLongitude);
		declination = Math.asin(declination) * 180 / Math.PI;

		return { rightAscension, declination };
	}


	var getTopocentricCoords = function(heliocentricRadius, altitude, latitude, localHourAngle, sunDeclination, sunRightAscension) {
		var equatorialParallax = 8.794 / (3600 * heliocentricRadius),
			u = Math.atan(0.99664719 * Math.tan(latitude)),
			x = Math.cos(u) + altitude * Math.cos(latitude) / 6378140,
			y = 0.99664719 * Math.sin(u) + Math.sin(latitude) * altitude / 6378140;

		var	parallaxRightAscension = - x * Math.sin(equatorialParallax) * Math.sin(localHourAngle);
		parallaxRightAscension = Math.atan2(parallaxRightAscension, Math.cos(sunDeclination) - x * Math.sin(equatorialParallax) * Math.cos(localHourAngle)) * 180 / Math.PI;

		var topocentricRightAscension = sunRightAscension + parallaxRightAscension,
			topocentricDeclination = (Math.sin(sunDeclination) - y * Math.sin(parallaxRightAscension)) * Math.cos(parallaxRightAscension);
		topocentricDeclination = Math.atan2(topocentricDeclination, Math.cos(sunDeclination) - x * Math.sin(parallaxRightAscension) * Math.cos(localHourAngle));

		var topocentricElevation = Math.sin(latitude * Math.sin(sunDeclination) + Math.cos(latitude) * Math.cos(sunDeclination) * Math.cos(localHourAngle));
		topocentricElevation = 90 - Math.asin(topocentricElevation);

		var topocentricAzimuth = Math.cos(localHourAngle * Math.sin(latitude) - Math.tan(sunDeclination) * Math.cos(latitude));
		topocentricAzimuth = limit360(Math.atan2(Math.sin(localHourAngle), topocentricAzimuth) * 180 / Math.PI);

		var azimuthAngle = limit360(topocentricAzimuth + 180);

		return {
			ascension: topocentricRightAscension,
			declination: topocentricDeclination,
			zenith: topocentricElevation,
			azimuth: topocentricAzimuth,
			azimuthAngle: azimuthAngle
		};

	}

	var limit360 = function(phi) {
		if (phi > 360) {
			phi = 360 * phi % 360;
		} else if (phi < 0) {
			phi = 360 - 360 * phi % 360;
		}

		return phi;
	}
})();